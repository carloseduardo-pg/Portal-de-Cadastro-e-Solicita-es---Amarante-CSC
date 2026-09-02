import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ItemKind,
  Prisma,
  ProductBlockState,
  ProductSource,
  RequestState,
  RequestType,
  UserRole,
} from '@prisma/client';
import { buildPdmSignature } from '../common/pdm-signature';
import { formatNcmDisplay, normalizeNcmCode } from '../common/ncm';
import { pageResult, skipTake, type PageParams } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateRequestDto, UpdateRequestDto } from './dto/create-request.dto';
import type { ReclassifyRequestDto } from './dto/reclassify-request.dto';
import {
  closeReasonLabel,
  isCloseReasonCode,
} from './close-reasons';
import { isBlockRequestType, isExistingProductRequestType } from './request-type.helpers';

const ACTIONABLE_STATES: RequestState[] = [
  RequestState.SOLICITANTE,
  RequestState.IMOBILIZADO,
  RequestState.APROVADOR,
  RequestState.RETORNO_SOLICITANTE,
];

/** Etapas de timeline equivalentes a “Rascunho” (formulário só inicia; gravação = rascunho). */
const DRAFT_STAGE_VALUES: RequestState[] = [
  RequestState.RASCUNHO,
  RequestState.FORMULARIO,
];

const EDITABLE_STATES: RequestState[] = [
  RequestState.RASCUNHO,
  RequestState.SOLICITANTE,
  RequestState.RETORNO_SOLICITANTE,
  RequestState.APROVADOR,
];

/** Outcome de etapa ao reclassificar consumo ↔ ativo fixo. */
const OUTCOME_RECLASSIFY_FIXED_ASSET = 'RECLASSIFY_FIXED_ASSET';
const OUTCOME_RECLASSIFY_CONSUMPTION = 'RECLASSIFY_CONSUMPTION';
/** Encerramento voluntário sem promover à base (solicitante ou aprovador). */
const OUTCOME_CLOSED = 'CLOSED';
/** Finalização no Administrativo: todos os itens à base. */
const OUTCOME_APPROVAL_TOTAL = 'APPROVAL_TOTAL';
/** Finalização no Administrativo: subset à base; demais rejeitados. */
const OUTCOME_APPROVAL_PARTIAL = 'APPROVAL_PARTIAL';

const SOLICITANTE_CLOSE_STATES: RequestState[] = [
  RequestState.RASCUNHO,
  RequestState.FORMULARIO,
  RequestState.SOLICITANTE,
  RequestState.RETORNO_SOLICITANTE,
];

const APROVADOR_CLOSE_STATES: RequestState[] = [
  RequestState.APROVADOR,
  RequestState.IMOBILIZADO,
];

/** Etapas visíveis na caixa de entrada conforme o perfil (Produtos — sem Compliance). */
function inboxStatesForRole(role: UserRole): RequestState[] {
  switch (role) {
    case UserRole.ADMIN:
      return [
        RequestState.SOLICITANTE,
        RequestState.IMOBILIZADO,
        RequestState.APROVADOR,
        RequestState.RETORNO_SOLICITANTE,
      ];
    case UserRole.APROVADOR_IMOBILIZADO:
      return [RequestState.IMOBILIZADO];
    case UserRole.APROVADOR:
      return [RequestState.APROVADOR];
    case UserRole.SOLICITANTE:
    default:
      return [RequestState.SOLICITANTE, RequestState.RETORNO_SOLICITANTE];
  }
}

/** Destinos finais — nunca entram na caixa de entrada. */
const CLOSED_APPROVED_STATES: RequestState[] = [
  RequestState.ENCERRADO,
  RequestState.APROVADO,
];
const CLOSED_REJECTED_STATES: RequestState[] = [
  RequestState.REPROVADO,
  RequestState.EXPIRADA,
];

/** Etapa Solicitante — inclui subvariações (rascunho, retorno). */
const SOLICITANTE_BUCKET_STATES: RequestState[] = [
  RequestState.RASCUNHO,
  RequestState.FORMULARIO,
  RequestState.SOLICITANTE,
  RequestState.RETORNO_SOLICITANTE,
];

/** Etapa Encerrado — aprovada, reprovada ou expirada (sem erro de integração). */
const ENCERRADO_BUCKET_STATES: RequestState[] = [
  ...CLOSED_APPROVED_STATES,
  ...CLOSED_REJECTED_STATES,
];

const CLOSED_ALL_STATES: RequestState[] = ENCERRADO_BUCKET_STATES;

/** Filtro do bloco principal na tela Solicitações. */
function resolveRegistryBucketFilter(bucket?: string): RequestState[] | undefined {
  if (!bucket?.trim()) return undefined;
  switch (bucket) {
    case 'solicitante':
      return SOLICITANTE_BUCKET_STATES;
    case 'imobilizado':
      return [RequestState.IMOBILIZADO];
    case 'aprovador':
      return [RequestState.APROVADOR];
    case 'encerrado':
      return ENCERRADO_BUCKET_STATES;
    default:
      return undefined;
  }
}

/** Filtro de etapa da lista analítica (Solicitações), incluindo agrupamento Encerrada. */
function resolveRegistryStageFilter(stage?: string): RequestState[] | undefined {
  if (!stage?.trim()) return undefined;
  switch (stage) {
    case 'ENCERRADA':
      return CLOSED_ALL_STATES;
    case 'ENCERRADA_APROVADA':
      return CLOSED_APPROVED_STATES;
    case 'ENCERRADA_REPROVADA':
      return CLOSED_REJECTED_STATES;
    case 'RASCUNHO':
      return [RequestState.RASCUNHO];
    default:
      return Object.values(RequestState).includes(stage as RequestState)
        ? [stage as RequestState]
        : undefined;
  }
}

function resolveOperatorStageFilter(stage?: string): RequestState | { in: RequestState[] } | undefined {
  if (!stage?.trim()) return undefined;
  if (stage === 'RASCUNHO') return { in: DRAFT_STAGE_VALUES };
  return Object.values(RequestState).includes(stage as RequestState)
    ? (stage as RequestState)
    : undefined;
}

type TimeWindows = {
  sixHoursAgo: Date;
  twentyFourHoursAgo: Date;
  twoDaysAgo: Date;
};

function timeWindows(): TimeWindows {
  const now = new Date();
  return {
    sixHoursAgo: new Date(now.getTime() - 6 * 60 * 60 * 1000),
    twentyFourHoursAgo: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    twoDaysAgo: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
  };
}

function openStageSince(since: Date): Prisma.RequestWhereInput {
  return { stages: { some: { finishedAt: null, startedAt: { gte: since } } } };
}

function openStageBefore(before: Date): Prisma.RequestWhereInput {
  return { stages: { some: { finishedAt: null, startedAt: { lte: before } } } };
}

export type RegistryStageSummary = {
  solicitante: number;
  imobilizado: number;
  aprovador: number;
  encerrado: number;
};

export type RequestTimeSummary = {
  all: number;
  novas: number;
  doDia: number;
  atrasadas: number;
  finalizadas: number;
};

/** Filtros da busca avançada em Solicitações. */
export type RegistryFilterParams = {
  userId: string;
  search?: string;
  type?: string;
  itemsMode?: string;
  stage?: string;
  familyIds?: string[];
  hotelIds?: string[];
  requesterIds?: string[];
  operatorIds?: string[];
  operatorStage?: string;
  sla?: string;
  submittedFrom?: string;
  submittedTo?: string;
  closedFrom?: string;
  closedTo?: string;
  mine?: string;
  bucket?: string;
};

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(userId?: string) {
    const role = userId ? await this.resolveUserRole(userId) : UserRole.ADMIN;
    const inboxStates = inboxStatesForRole(role);
    const actionable = await this.prisma.request.count({
      where: { state: { in: ACTIONABLE_STATES } },
    });
    const overdue = await this.prisma.requestStage.count({
      where: { isLate: true, finishedAt: null },
    });
    const inbox = await this.prisma.request.count({
      where: { state: { in: inboxStates } },
    });
    const batch = await this.prisma.request.count({
      where: {
        state: { in: inboxStates },
        items: { some: { sortOrder: { gte: 1 } } },
      },
    });
    return {
      inbox,
      overdue,
      actionable,
      slaOverdueRatio: inbox > 0 ? overdue / inbox : 0,
      batch,
    };
  }

  private async resolveUserRole(userId: string): Promise<UserRole> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role ?? UserRole.SOLICITANTE;
  }

  /** Destino: rascunho → SOLICITANTE; envio → primeira etapa de aprovação. */
  private resolveTargetStage(
    dto: { targetStage?: string; submit?: boolean },
  ): 'SOLICITANTE' | 'APROVADOR' {
    if (dto.targetStage === 'APROVADOR' || dto.targetStage === 'SOLICITANTE') {
      return dto.targetStage;
    }
    return dto.submit === true ? 'APROVADOR' : 'SOLICITANTE';
  }

  /**
   * Primeira etapa de aprovação após o solicitante.
   * REGRA INVIOLÁVEL (fluxo Produtos): o solicitante NUNCA envia direto ao
   * Aprovador - Administrativo. Toda solicitação passa primeiro pelo
   * Aprovador - Imobilizado (triagem AF × UC), inclusive após rascunho/retorno.
   */
  private firstApprovalState(_fixedAsset?: boolean): RequestState {
    return RequestState.IMOBILIZADO;
  }

  /**
   * Valida seleção de itens: não vazia e subset do lote.
   * Retorna { selectedIds, remainingIds }.
   */
  private resolveSelectedItemIds(allItemIds: string[], selectedIds: string[]) {
    if (!selectedIds?.length) {
      throw new BadRequestException('Selecione ao menos um item para reclassificar.');
    }
    const all = new Set(allItemIds);
    const selected = [...new Set(selectedIds)];
    for (const id of selected) {
      if (!all.has(id)) {
        throw new BadRequestException('Um ou mais itens selecionados não pertencem a esta solicitação.');
      }
    }
    const selectedSet = new Set(selected);
    const remainingIds = allItemIds.filter((id) => !selectedSet.has(id));
    return { selectedIds: selected, remainingIds, isFullLot: remainingIds.length === 0 };
  }

  /**
   * Snapshot de classificação por item (antes/depois da reclassificação).
   */
  private itemClassificationSnapshot(
    item: {
      id: string;
      descriptionShort: string;
      itemKind: ItemKind;
      groupId: string | null;
      familyId?: string | null;
      group?: { code: string; subgroup?: { familyId: string } | null } | null;
    },
    familyId: string,
  ) {
    return {
      id: item.id,
      descriptionShort: item.descriptionShort,
      itemKind: item.itemKind,
      groupId: item.groupId,
      groupCode: item.group?.code ?? undefined,
      familyId: item.group?.subgroup?.familyId ?? familyId,
    };
  }

  /**
   * Árvore AF válida após invalidação: família FIXED_ASSET e todo item com grupo dela.
   */
  private async assertFixedAssetClassificationReady(
    familyId: string,
    items: { id: string; descriptionShort: string; groupId: string | null }[],
  ) {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      select: { id: true, itemKind: true, active: true },
    });
    if (!family?.active || family.itemKind !== ItemKind.FIXED_ASSET) {
      throw new BadRequestException(
        'Classificação invalidada: o Imobilizado deve reclassificar a solicitação na árvore de Ativo Fixo antes de encaminhar.',
      );
    }
    const missing = items.filter((i) => !i.groupId);
    if (missing.length) {
      throw new BadRequestException(
        'Classificação invalidada: todos os itens precisam de grupo na árvore de Ativo Fixo antes de encaminhar.',
      );
    }
    await this.assertItemsBelongToFamily(
      familyId,
      items.map((i) => ({
        groupId: i.groupId,
        descriptionShort: i.descriptionShort,
      })),
    );
  }

  /**
   * Lista analítica de todas as solicitações (módulo Solicitações).
   * Busca avançada via filtros combinados (operadores, datas, família, hotel, etc.).
   */
  async findRegistry(
    params: RegistryFilterParams & PageParams,
  ) {
    const filters = this.buildRegistryFilters(params);
    const where: Prisma.RequestWhereInput = filters.length ? { AND: filters } : {};

    const include = {
      requester: { select: { id: true, name: true } },
      hotel: { select: { id: true, code: true, name: true } },
      hotels: { include: { hotel: { select: { id: true, code: true, name: true } } } },
      family: { select: { code: true, name: true } },
      items: { orderBy: { sortOrder: 'asc' as const } },
      stages: {
        orderBy: { startedAt: 'desc' as const },
        take: 5,
        include: { user: { select: { id: true, name: true } } },
      },
    };

    const { skip, take } = skipTake(params);
    const [total, data, summary] = await Promise.all([
      this.prisma.request.count({ where }),
      this.prisma.request.findMany({
        where,
        include,
        orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      this.registryStageSummary(),
    ]);

    const mapped = data.map((r) => {
      const approvalStage = r.stages.find(
        (s) =>
          s.stage === RequestState.ENCERRADO ||
          s.stage === RequestState.APROVADO ||
          (s.stage === RequestState.APROVADOR && s.finishedAt),
      );
      return {
        ...r,
        approvedBy: approvalStage?.user ?? null,
      };
    });

    return { ...pageResult(mapped, total, params), summary };
  }

  /** Contagens por etapa principal (blocos da tela Solicitações). */
  async registryStageSummary(): Promise<RegistryStageSummary> {
    const [solicitante, imobilizado, aprovador, encerrado] = await Promise.all([
      this.prisma.request.count({ where: { state: { in: SOLICITANTE_BUCKET_STATES } } }),
      this.prisma.request.count({ where: { state: RequestState.IMOBILIZADO } }),
      this.prisma.request.count({ where: { state: RequestState.APROVADOR } }),
      this.prisma.request.count({ where: { state: { in: ENCERRADO_BUCKET_STATES } } }),
    ]);
    return { solicitante, imobilizado, aprovador, encerrado };
  }

  /** @deprecated alias — use findRegistry */
  async findQueue(params: RegistryFilterParams & PageParams) {
    return this.findRegistry(params);
  }

  /**
   * Caixa de entrada — todas as solicitações ativas do perfil (sem encerradas).
   */
  async findInboxBoard(params: {
    userId: string;
    role?: UserRole;
    search?: string;
    type?: string;
    familyIds?: string[];
    hotelIds?: string[];
    requesterIds?: string[];
  }) {
    const role =
      params.role && Object.values(UserRole).includes(params.role as UserRole)
        ? (params.role as UserRole)
        : await this.resolveUserRole(params.userId);
    const inboxStates = inboxStatesForRole(role);
    const where: Prisma.RequestWhereInput = {
      AND: [this.buildListWhere(params), { state: { in: inboxStates } }],
    };
    const data = await this.prisma.request.findMany({
      where,
      include: this.requestListInclude(),
      orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });
    return {
      data,
      total: data.length,
      role,
      inboxStages: inboxStates,
    };
  }

  async findAll(params: {
    state?: string;
    mine?: string;
    userId?: string;
    search?: string;
  } & PageParams) {
    const where = this.buildListWhere(params);
    const { skip, take } = skipTake(params);
    const [total, data] = await this.prisma.$transaction([
      this.prisma.request.count({ where }),
      this.prisma.request.findMany({
        where,
        include: this.requestListInclude(),
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);
    return pageResult(data, total, params);
  }

  /** Lista completa para o quadro kanban (sem paginação). */
  async findKanban(params: {
    mine?: string;
    userId?: string;
    search?: string;
    type?: string;
    familyIds?: string[];
    hotelIds?: string[];
    requesterIds?: string[];
  }) {
    const where = this.buildListWhere(params);
    const data = await this.prisma.request.findMany({
      where,
      include: this.requestListInclude(),
      orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });
    return { data, total: data.length };
  }

  private parseIdList(value?: string): string[] | undefined {
    if (!value?.trim()) return undefined;
    const ids = value.split(',').map((s) => s.trim()).filter(Boolean);
    return ids.length ? ids : undefined;
  }

  parseKanbanFilters(query: {
    family_ids?: string;
    hotel_ids?: string;
    requester_ids?: string;
    type?: string;
  }) {
    return {
      familyIds: this.parseIdList(query.family_ids),
      hotelIds: this.parseIdList(query.hotel_ids),
      requesterIds: this.parseIdList(query.requester_ids),
      type: query.type?.trim() || undefined,
    };
  }

  /** Query params → filtros da lista analítica (Solicitações). */
  parseRegistryFilters(query: {
    search?: string;
    type?: string;
    items?: string;
    stage?: string;
    family_ids?: string;
    hotel_ids?: string;
    requester_ids?: string;
    operator_ids?: string;
    operator_stage?: string;
    sla?: string;
    submitted_from?: string;
    submitted_to?: string;
    closed_from?: string;
    closed_to?: string;
    mine?: string;
    bucket?: string;
  }): Omit<RegistryFilterParams, 'userId'> {
    return {
      search: query.search?.trim() || undefined,
      type: query.type?.trim() || undefined,
      itemsMode: query.items?.trim() || undefined,
      stage: query.stage?.trim() || undefined,
      familyIds: this.parseIdList(query.family_ids),
      hotelIds: this.parseIdList(query.hotel_ids),
      requesterIds: this.parseIdList(query.requester_ids),
      operatorIds: this.parseIdList(query.operator_ids),
      operatorStage: query.operator_stage?.trim() || undefined,
      sla: query.sla?.trim() || undefined,
      submittedFrom: query.submitted_from?.trim() || undefined,
      submittedTo: query.submitted_to?.trim() || undefined,
      closedFrom: query.closed_from?.trim() || undefined,
      closedTo: query.closed_to?.trim() || undefined,
      mine: query.mine?.trim() || undefined,
      bucket: query.bucket?.trim() || undefined,
    };
  }

  private parseDateStart(value?: string): Date | undefined {
    if (!value?.trim()) return undefined;
    const d = new Date(`${value.trim()}T00:00:00`);
    return Number.isFinite(d.getTime()) ? d : undefined;
  }

  private parseDateEnd(value?: string): Date | undefined {
    if (!value?.trim()) return undefined;
    const d = new Date(`${value.trim()}T23:59:59.999`);
    return Number.isFinite(d.getTime()) ? d : undefined;
  }

  /** Monta cláusulas AND para a busca avançada de solicitações. */
  private buildRegistryFilters(params: RegistryFilterParams): Prisma.RequestWhereInput[] {
    const filters: Prisma.RequestWhereInput[] = [];
    const { twoDaysAgo } = timeWindows();

    const stageFilter = resolveRegistryStageFilter(params.stage);
    if (stageFilter?.length) {
      filters.push({ state: { in: stageFilter } });
    }

    const bucketFilter = resolveRegistryBucketFilter(params.bucket);
    if (bucketFilter?.length) {
      filters.push({ state: { in: bucketFilter } });
    }

    if (params.type === 'INCLUSAO' || params.type === 'ALTERACAO') {
      filters.push({ type: params.type as RequestType });
    }

    if (params.itemsMode === 'single') {
      filters.push({ items: { some: {} } });
      filters.push({ NOT: { items: { some: { sortOrder: { gte: 1 } } } } });
    } else if (params.itemsMode === 'multi') {
      filters.push({ items: { some: { sortOrder: { gte: 1 } } } });
    }

    if (params.familyIds?.length) {
      filters.push({ familyId: { in: params.familyIds } });
    }

    if (params.hotelIds?.length) {
      filters.push({
        OR: [
          { hotelId: { in: params.hotelIds } },
          { hotels: { some: { hotelId: { in: params.hotelIds } } } },
        ],
      });
    }

    if (params.requesterIds?.length) {
      filters.push({ requesterId: { in: params.requesterIds } });
    }

    if (params.mine === 'true' && params.userId) {
      filters.push({ requesterId: params.userId });
    }

    if (params.operatorIds?.length) {
      const operatorStage = resolveOperatorStageFilter(params.operatorStage);
      const stageClause = operatorStage ? { stage: operatorStage } : {};
      filters.push({
        stages: {
          some: {
            userId: { in: params.operatorIds },
            ...stageClause,
          },
        },
      });
    }

    if (params.sla === 'late') {
      filters.push({
        state: { notIn: CLOSED_ALL_STATES },
        stages: { some: { finishedAt: null, startedAt: { lte: twoDaysAgo } } },
      });
    } else if (params.sla === 'on_time') {
      filters.push({
        OR: [
          { state: { in: CLOSED_ALL_STATES } },
          {
            stages: {
              some: { finishedAt: null, startedAt: { gt: twoDaysAgo } },
            },
          },
        ],
      });
    }

    const submittedFrom = this.parseDateStart(params.submittedFrom);
    const submittedTo = this.parseDateEnd(params.submittedTo);
    if (submittedFrom || submittedTo) {
      filters.push({
        OR: [
          {
            submittedAt: {
              ...(submittedFrom ? { gte: submittedFrom } : {}),
              ...(submittedTo ? { lte: submittedTo } : {}),
            },
          },
          {
            submittedAt: null,
            createdAt: {
              ...(submittedFrom ? { gte: submittedFrom } : {}),
              ...(submittedTo ? { lte: submittedTo } : {}),
            },
          },
        ],
      });
    }

    const closedFrom = this.parseDateStart(params.closedFrom);
    const closedTo = this.parseDateEnd(params.closedTo);
    if (closedFrom || closedTo) {
      filters.push({
        closedAt: {
          ...(closedFrom ? { gte: closedFrom } : {}),
          ...(closedTo ? { lte: closedTo } : {}),
        },
      });
    }

    if (params.search?.trim()) {
      const q = params.search.trim();
      filters.push({
        OR: [
          { items: { some: { descriptionShort: { contains: q, mode: 'insensitive' } } } },
          { items: { some: { descriptionLong: { contains: q, mode: 'insensitive' } } } },
          { items: { some: { unifiedCode: { contains: q, mode: 'insensitive' } } } },
          { items: { some: { legacyCode: { contains: q, mode: 'insensitive' } } } },
          { items: { some: { ncmCode: { contains: q, mode: 'insensitive' } } } },
          { requestDescription: { contains: q, mode: 'insensitive' } },
          { observation: { contains: q, mode: 'insensitive' } },
          { family: { name: { contains: q, mode: 'insensitive' } } },
          { family: { code: { contains: q, mode: 'insensitive' } } },
          { hotel: { code: { contains: q, mode: 'insensitive' } } },
          { hotel: { name: { contains: q, mode: 'insensitive' } } },
          { requester: { name: { contains: q, mode: 'insensitive' } } },
          { requester: { email: { contains: q, mode: 'insensitive' } } },
          { stages: { some: { message: { contains: q, mode: 'insensitive' } } } },
          { stages: { some: { user: { name: { contains: q, mode: 'insensitive' } } } } },
        ],
      });
    }

    return filters;
  }

  private buildListWhere(params: {
    state?: string;
    mine?: string;
    userId?: string;
    search?: string;
    type?: string;
    familyIds?: string[];
    hotelIds?: string[];
    requesterIds?: string[];
  }): Prisma.RequestWhereInput {
    const where: Prisma.RequestWhereInput = {};
    if (params.state) where.state = params.state as RequestState;
    if (params.type) where.type = params.type as RequestType;
    if (params.mine === 'true' && params.userId) where.requesterId = params.userId;
    if (params.familyIds?.length) where.familyId = { in: params.familyIds };
    if (params.hotelIds?.length) {
      where.OR = [
        { hotelId: { in: params.hotelIds } },
        { hotels: { some: { hotelId: { in: params.hotelIds } } } },
      ];
    }
    if (params.requesterIds?.length) where.requesterId = { in: params.requesterIds };
    if (params.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        {
          items: {
            some: {
              descriptionShort: { contains: q, mode: 'insensitive' },
            },
          },
        },
        { family: { name: { contains: q, mode: 'insensitive' } } },
        { family: { code: { contains: q, mode: 'insensitive' } } },
        { hotel: { code: { contains: q, mode: 'insensitive' } } },
        { hotel: { name: { contains: q, mode: 'insensitive' } } },
        { requester: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }
    return where;
  }

  /** Prazo de expiração de rascunho (dias) — ITM-13/14. */
  private draftExpiryDays() {
    const n = Number(process.env.DRAFT_EXPIRY_DAYS ?? 15);
    return Number.isFinite(n) && n > 0 ? n : 15;
  }

  private resolveHotelIds(dto: { hotelIds?: string[]; hotelId?: string }): string[] {
    const ids = dto.hotelIds?.length
      ? [...new Set(dto.hotelIds)]
      : dto.hotelId
        ? [dto.hotelId]
        : [];
    if (!ids.length) {
      throw new BadRequestException('Selecione ao menos uma unidade (hotel).');
    }
    return ids;
  }

  private async validateHotels(hotelIds: string[]) {
    const count = await this.prisma.hotel.count({
      where: { id: { in: hotelIds }, active: true },
    });
    if (count !== hotelIds.length) {
      throw new BadRequestException('Uma ou mais unidades selecionadas são inválidas.');
    }
  }

  /** ITM-11 — uma família por solicitação (lote). */
  private async assertFamilyExists(
    familyId: string,
    expectedKind?: 'CONSUMPTION' | 'FIXED_ASSET',
  ) {
    const family = await this.prisma.family.findFirst({
      where: {
        id: familyId,
        active: true,
        ...(expectedKind ? { itemKind: expectedKind } : {}),
      },
    });
    if (!family) {
      throw new BadRequestException(
        expectedKind
          ? `Família inválida/inativa ou incompatível com o tipo ${expectedKind}.`
          : 'Família inválida ou inativa.',
      );
    }
    return family;
  }

  private async syncRequestHotels(requestId: string, hotelIds: string[]) {
    await this.prisma.requestHotel.deleteMany({ where: { requestId } });
    await this.prisma.requestHotel.createMany({
      data: hotelIds.map((hotelId) => ({ requestId, hotelId })),
    });
  }

  private extractItemLinks(item: {
    productLink?: string | null;
    productLinks?: string[] | null;
  }): string[] {
    const fromArray = (item.productLinks ?? [])
      .map((l) => l.trim())
      .filter(Boolean);
    const single = item.productLink?.trim();
    if (single && !fromArray.includes(single)) fromArray.unshift(single);
    return fromArray;
  }

  private normalizeItemInput(items: CreateRequestDto['items'], itemKind: 'CONSUMPTION' | 'FIXED_ASSET') {
    return items.map((item, idx) => {
      const links = this.extractItemLinks(item);
      const unitQuantity =
        itemKind === 'FIXED_ASSET'
          ? Math.max(1, Math.floor(Number(item.unitQuantity ?? 1)))
          : null;
      return {
        descriptionShort: item.descriptionShort.trim().toUpperCase(),
        descriptionLong: item.descriptionLong?.trim().toUpperCase() ?? null,
        productId: item.productId ?? null,
        groupId: item.groupId ?? null,
        itemKind,
        measureUnitId: itemKind === 'FIXED_ASSET' ? null : item.measureUnitId ?? null,
        costCenterId: item.costCenterId ?? null,
        source: item.source ?? ProductSource.NATIONAL,
        itemValue: item.itemValue != null ? item.itemValue : null,
        purchaseQtyTotal: itemKind === 'FIXED_ASSET' ? null : item.purchaseQtyTotal != null ? item.purchaseQtyTotal : null,
        unitQuantity,
        physicalLocation:
          itemKind === 'FIXED_ASSET'
            ? item.physicalLocation?.trim().toUpperCase() || null
            : null,
        assetTag: itemKind === 'FIXED_ASSET' ? item.assetTag?.trim().toUpperCase() || null : null,
        acquisitionValue:
          itemKind === 'FIXED_ASSET' && item.acquisitionValue != null
            ? item.acquisitionValue
            : null,
        acquisitionDate:
          itemKind === 'FIXED_ASSET' && item.acquisitionDate
            ? new Date(item.acquisitionDate)
            : null,
        usefulLifeMonths:
          itemKind === 'FIXED_ASSET' && item.usefulLifeMonths != null
            ? item.usefulLifeMonths
            : null,
        depreciationRate:
          itemKind === 'FIXED_ASSET' && item.depreciationRate != null
            ? item.depreciationRate
            : null,
        supplierDocument:
          itemKind === 'FIXED_ASSET' ? item.supplierDocument?.trim() || null : null,
        invoiceNumber:
          itemKind === 'FIXED_ASSET' ? item.invoiceNumber?.trim() || null : null,
        unifiedCode: item.unifiedCode?.trim() || null,
        legacyCode: item.legacyCode?.trim().toUpperCase() || null,
        law116: item.law116?.trim() || null,
        productLink: links[0] ?? null,
        itemLinks: links,
        itemObservation: item.itemObservation?.trim() || null,
        sortOrder: item.sortOrder ?? idx,
      };
    });
  }

  /** ITM-11 — grupo do item deve pertencer à família do lote. */
  private async assertItemsBelongToFamily(
    familyId: string,
    items: { groupId: string | null; descriptionShort: string }[],
  ) {
    const groupIds = [...new Set(items.map((i) => i.groupId).filter(Boolean))] as string[];
    if (!groupIds.length) return;
    const groups = await this.prisma.group.findMany({
      where: { id: { in: groupIds } },
      include: { subgroup: { select: { familyId: true } } },
    });
    const byId = new Map(groups.map((g) => [g.id, g]));
    for (const item of items) {
      if (!item.groupId) continue;
      const g = byId.get(item.groupId);
      if (!g || g.subgroup.familyId !== familyId) {
        throw new BadRequestException(
          `Item "${item.descriptionShort}": grupo não pertence à família do lote (ITM-11).`,
        );
      }
    }
  }

  /**
   * Trava de match 100% — só CONSUMPTION.
   * Considera ativos, inativos e bloqueados (BLOQUEIO_TOTAL some da busca antiga).
   */
  private async assertNoExactDuplicateInBase(descriptionShort: string) {
    const normalized = descriptionShort.trim().toUpperCase();
    const signature = buildPdmSignature(normalized);
    const rows = await this.prisma.$queryRaw<
      { id: string; active: boolean; block_state: string }[]
    >`
      SELECT p.id, p.active, p.block_state::text AS block_state
      FROM products p
      WHERE p.item_kind = 'CONSUMPTION'::"ItemKind"
        AND (
          p.description_short = ${normalized}
          OR p.pdm_signature = ${signature}
          OR similarity(p.description_short, ${normalized}) >= 0.999
        )
      ORDER BY p.active DESC
      LIMIT 1
    `;
    if (!rows.length) return;

    const hit = rows[0];
    if (!hit.active || hit.block_state !== 'NONE') {
      throw new BadRequestException('Existe um item idêntico bloqueado na base.');
    }
    throw new BadRequestException(
      'Produto com descrição idêntica já existe na base unificada. Não é possível solicitar inclusão duplicada.',
    );
  }

  /** Similaridade só entre CONSUMPTION (inclui inativos/bloqueados). */
  private async assertNoSimilarProductInBase(descriptionShort: string) {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT p.id
      FROM products p
      WHERE p.item_kind = 'CONSUMPTION'::"ItemKind"
        AND similarity(p.description_short, ${descriptionShort}) > 0.08
      LIMIT 1
    `;
    if (rows.length) {
      throw new BadRequestException(
        'Já existe item parecido na base unificada (SAP). Este portal não permite solicitar cadastro duplicado.',
      );
    }
  }

  private async validateItems(
    items: ReturnType<RequestsService['normalizeItemInput']>,
    hotelIds: string[],
    submit: boolean,
    type: RequestType = RequestType.INCLUSAO,
    observation?: string | null,
  ) {
    for (const item of items) {
      if (!item.descriptionShort) {
        throw new BadRequestException('Descrição curta é obrigatória em todos os itens.');
      }
      if (type === RequestType.INCLUSAO && !item.productId) {
        // Ativo fixo = instância: descrição idêntica é esperada (mais unidades do mesmo bem).
        if (item.itemKind !== 'FIXED_ASSET') {
          await this.assertNoExactDuplicateInBase(item.descriptionShort);
          if (!observation?.trim()) {
            await this.assertNoSimilarProductInBase(item.descriptionShort);
          }
        }
      }
      if (isExistingProductRequestType(type) && !item.productId) {
        throw new BadRequestException(
          'Selecione o produto existente na base para alteração ou bloqueio.',
        );
      }
      if (submit) {
        if (!item.descriptionLong) {
          throw new BadRequestException('Descrição longa é obrigatória para enviar à aprovação.');
        }
        if (!item.groupId && type === RequestType.INCLUSAO) {
          throw new BadRequestException(
            'Grupo de itens é obrigatório em todos os itens para enviar à aprovação.',
          );
        }
        if (item.itemKind === 'CONSUMPTION' && !item.measureUnitId) {
          throw new BadRequestException(
            'Unidade de medida é obrigatória para itens de consumo.',
          );
        }
        if (item.itemKind === 'FIXED_ASSET' && item.measureUnitId) {
          throw new BadRequestException(
            'Ativo fixo não possui unidade de medida.',
          );
        }
        if (item.itemKind === 'FIXED_ASSET') {
          const qty = item.unitQuantity ?? 0;
          if (!Number.isInteger(qty) || qty < 1) {
            throw new BadRequestException(
              'Quantidade de unidades é obrigatória para ativo fixo (mínimo 1).',
            );
          }
        }
        if (!item.costCenterId) {
          throw new BadRequestException('Centro de custo é obrigatório em todos os itens.');
        }
      }
      if (item.costCenterId) {
        const cc = await this.prisma.costCenter.findFirst({
          where: { id: item.costCenterId, hotelId: { in: hotelIds }, active: true },
        });
        if (!cc) {
          throw new BadRequestException('Centro de custo inválido para as unidades selecionadas.');
        }
      }
      if (item.measureUnitId) {
        const mu = await this.prisma.measureUnit.findFirst({
          where: { id: item.measureUnitId, active: true },
        });
        if (!mu) {
          throw new BadRequestException('Unidade de medida inválida.');
        }
      }
    }
  }

  private async seedNcmSuggestions(requestId: string) {
    const items = await this.prisma.requestItem.findMany({ where: { requestId } });
    for (const item of items) {
      // Score = similaridade real (pg_trgm); guarda o produto mais parecido por NCM.
      const rows = await this.prisma.$queryRaw<
        {
          ncm: string;
          usage_count: bigint;
          score: number;
          product_id: string;
        }[]
      >`
        SELECT
          trim(p.ncm_code)::text AS ncm,
          COUNT(*)::bigint AS usage_count,
          MAX(similarity(p.description_short, ${item.descriptionShort}))::float8 AS score,
          (array_agg(p.id::text ORDER BY similarity(p.description_short, ${item.descriptionShort}) DESC))[1] AS product_id
        FROM products p
        WHERE p.ncm_code IS NOT NULL
          AND length(trim(p.ncm_code)) = 8
          AND p.item_kind = ${item.itemKind}::"ItemKind"
          AND similarity(p.description_short, ${item.descriptionShort}) > 0.15
        GROUP BY trim(p.ncm_code)
        ORDER BY score DESC, usage_count DESC
        LIMIT 5
      `;
      if (!rows.length) continue;
      await this.prisma.ncmSuggestion.createMany({
        data: rows.map((row, rank) => ({
          requestItemId: item.id,
          ncm: row.ncm,
          score: Math.min(1, Math.max(0, Number(row.score))),
          usageCount: Number(row.usage_count),
          rank: rank + 1,
          sourceProductId: row.product_id || null,
        })),
      });
    }
  }

  private assertObservation(observation: string | undefined | null, type: RequestType) {
    if (
      (type === RequestType.INCLUSAO || isExistingProductRequestType(type)) &&
      !observation?.trim()
    ) {
      throw new BadRequestException(
        'Observação é obrigatória: descreva o motivo da solicitação.',
      );
    }
  }

  async create(dto: CreateRequestDto, userId: string) {
    const hotelIds = this.resolveHotelIds(dto);
    await this.validateHotels(hotelIds);
    /** Solicitante não define AF/UC — sempre inicia como consumo; Imobilizado tria. */
    const fixedAsset = false;
    const itemKind = 'CONSUMPTION' as const;
    await this.assertFamilyExists(dto.familyId, itemKind);
    const requestType = dto.type ?? RequestType.INCLUSAO;
    this.assertObservation(dto.observation, requestType);
    const items = this.normalizeItemInput(dto.items, itemKind);
    const target = this.resolveTargetStage(dto);
    const strict = target === 'APROVADOR';
    await this.assertItemsBelongToFamily(dto.familyId, items);
    await this.validateItems(items, hotelIds, strict, dto.type ?? RequestType.INCLUSAO, dto.observation);

    const now = new Date();
    const approvalState = this.firstApprovalState(fixedAsset);
    const state =
      target === 'APROVADOR' ? approvalState : RequestState.SOLICITANTE;
    const stageMessage =
      dto.observation?.trim() ||
      (target === 'APROVADOR'
        ? 'Rascunho enviado ao aprovador - imobilizado (triagem inicial)'
        : 'Rascunho salvo na caixa do solicitante');

    const request = await this.prisma.request.create({
      data: {
        requesterId: userId,
        hotelId: hotelIds[0],
        familyId: dto.familyId,
        type: requestType,
        fixedAsset,
        observation: dto.observation?.trim() || null,
        requestDescription: dto.requestDescription?.trim().toUpperCase() || null,
        state,
        submittedAt: now,
        expiresAt: null,
        items: {
          create: items.map(({ itemLinks, ...item }) => ({
            ...item,
            links: itemLinks.length
              ? { create: itemLinks.map((url, sortOrder) => ({ url, sortOrder })) }
              : undefined,
          })),
        },
        hotels: { create: hotelIds.map((hotelId) => ({ hotelId })) },
        stages: {
          create:
            target === 'APROVADOR'
              ? [
                  {
                    stage: RequestState.FORMULARIO,
                    userId,
                    startedAt: now,
                    finishedAt: now,
                    message: stageMessage,
                  },
                  {
                    stage: approvalState,
                    userId,
                    startedAt: now,
                    message: null,
                  },
                ]
              : [
                  {
                    stage: RequestState.FORMULARIO,
                    userId,
                    startedAt: now,
                    finishedAt: now,
                    message: stageMessage,
                  },
                  {
                    stage: RequestState.SOLICITANTE,
                    userId,
                    startedAt: now,
                    message: null,
                  },
                ],
        },
      },
      include: this.requestListInclude(),
    });

    if (target === 'APROVADOR' && approvalState === RequestState.IMOBILIZADO) {
      await this.seedNcmSuggestions(request.id);
    }
    return this.findOne(request.id);
  }

  async update(id: string, dto: UpdateRequestDto, userId: string) {
    const existing = await this.prisma.request.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Solicitação não encontrada');
    const role = await this.resolveUserRole(userId);
    const requesterEditable = new Set<RequestState>([
      RequestState.RASCUNHO,
      RequestState.SOLICITANTE,
      RequestState.RETORNO_SOLICITANTE,
    ]);
    const isImobilizadoEdit =
      existing.state === RequestState.IMOBILIZADO &&
      (role === UserRole.APROVADOR_IMOBILIZADO || role === UserRole.ADMIN);
    const canEdit =
      role === UserRole.ADMIN ||
      (existing.requesterId === userId && requesterEditable.has(existing.state)) ||
      (role === UserRole.APROVADOR && existing.state === RequestState.APROVADOR) ||
      isImobilizadoEdit;
    if (!canEdit) {
      throw new ForbiddenException('Sem permissão para editar esta solicitação.');
    }
    if (!isImobilizadoEdit && !EDITABLE_STATES.includes(existing.state)) {
      throw new BadRequestException(
        'Só é possível editar solicitações nas etapas editáveis do fluxo.',
      );
    }

    const isApproverEdit =
      existing.state === RequestState.APROVADOR &&
      (role === UserRole.APROVADOR || role === UserRole.ADMIN);
    const target = isApproverEdit || isImobilizadoEdit ? 'APROVADOR' : this.resolveTargetStage(dto);
    const canChangeFixedAsset =
      isImobilizadoEdit || role === UserRole.ADMIN;
    const fixedAsset =
      dto.fixedAsset !== undefined && canChangeFixedAsset
        ? Boolean(dto.fixedAsset)
        : existing.fixedAsset;
    const itemKind = fixedAsset ? 'FIXED_ASSET' : 'CONSUMPTION';
    const strict = target === 'APROVADOR' && !isImobilizadoEdit;
    const items = dto.items ? this.normalizeItemInput(dto.items, itemKind) : undefined;
    const hotelIds = dto.hotelIds?.length || dto.hotelId
      ? this.resolveHotelIds({ hotelIds: dto.hotelIds, hotelId: dto.hotelId ?? existing.hotelId })
      : (await this.prisma.requestHotel.findMany({ where: { requestId: id } })).map((h) => h.hotelId);
    if (dto.hotelIds?.length || dto.hotelId) {
      await this.validateHotels(hotelIds);
    }
    if (dto.familyId) await this.assertFamilyExists(dto.familyId, itemKind);
    if (items) {
      const familyId = dto.familyId ?? existing.familyId;
      await this.assertItemsBelongToFamily(familyId, items);
      const nextObservation =
        dto.observation !== undefined ? dto.observation : existing.observation;
      await this.validateItems(
        items,
        hotelIds.length ? hotelIds : [existing.hotelId],
        strict,
        dto.type ?? existing.type,
        nextObservation,
      );
    }
    const nextType = dto.type ?? existing.type;
    const nextObservation =
      dto.observation !== undefined ? dto.observation : existing.observation;
    if (dto.observation !== undefined || strict) {
      this.assertObservation(nextObservation, nextType);
    }

    const now = new Date();
    const approvalState = this.firstApprovalState(fixedAsset);
    const nextState = isApproverEdit
      ? RequestState.APROVADOR
      : isImobilizadoEdit
        ? RequestState.IMOBILIZADO
      : target === 'APROVADOR'
        ? approvalState
        : RequestState.SOLICITANTE;
    const editNote = dto.editNote?.trim();
    const stageMessage =
      editNote ||
      (dto.observation !== undefined ? dto.observation : existing.observation)?.trim() ||
      (isImobilizadoEdit
        ? 'Imobilizado atualizou a classificação (árvore de ativo fixo)'
        : target === 'APROVADOR'
          ? 'Rascunho enviado ao aprovador - imobilizado (triagem inicial)'
          : 'Rascunho salvo na caixa do solicitante');

    let clearClassificationInvalidated = false;
    if (isImobilizadoEdit) {
      const nextFamilyId = dto.familyId ?? existing.familyId;
      const nextItems = items
        ? items.map((i) => ({
            id: '',
            descriptionShort: i.descriptionShort,
            groupId: i.groupId,
          }))
        : (
            await this.prisma.requestItem.findMany({
              where: { requestId: id },
              select: { id: true, groupId: true, descriptionShort: true },
            })
          );
      try {
        await this.assertFixedAssetClassificationReady(nextFamilyId, nextItems);
        clearClassificationInvalidated = true;
      } catch {
        clearClassificationInvalidated = false;
      }
    } else if (isApproverEdit && existing.classificationInvalidated) {
      const nextFamilyId = dto.familyId ?? existing.familyId;
      const nextItems = items
        ? items.map((i) => ({
            descriptionShort: i.descriptionShort,
            groupId: i.groupId,
          }))
        : (
            await this.prisma.requestItem.findMany({
              where: { requestId: id },
              select: { groupId: true, descriptionShort: true },
            })
          );
      try {
        const family = await this.assertFamilyExists(nextFamilyId, 'CONSUMPTION');
        void family;
        if (nextItems.every((i) => i.groupId)) {
          await this.assertItemsBelongToFamily(nextFamilyId, nextItems);
          clearClassificationInvalidated = true;
        }
      } catch {
        clearClassificationInvalidated = false;
      }
    }

    await this.prisma.$transaction(async (tx) => {
      if (items) {
        await tx.requestItemLink.deleteMany({
          where: { requestItem: { requestId: id } },
        });
        await tx.requestItem.deleteMany({ where: { requestId: id } });
        for (const { itemLinks, ...item } of items) {
          await tx.requestItem.create({
            data: {
              ...item,
              requestId: id,
              links: itemLinks.length
                ? { create: itemLinks.map((url, sortOrder) => ({ url, sortOrder })) }
                : undefined,
            },
          });
        }
      }

      if (dto.hotelIds?.length || dto.hotelId) {
        await tx.requestHotel.deleteMany({ where: { requestId: id } });
        await tx.requestHotel.createMany({
          data: hotelIds.map((hotelId) => ({ requestId: id, hotelId })),
        });
      }

      await tx.request.update({
        where: { id },
        data: {
          hotelId: hotelIds[0] ?? existing.hotelId,
          familyId: dto.familyId,
          type: dto.type,
          ...(canChangeFixedAsset && dto.fixedAsset !== undefined
            ? { fixedAsset }
            : {}),
          ...(dto.observation !== undefined
            ? { observation: dto.observation.trim() || null }
            : {}),
          ...(dto.requestDescription !== undefined
            ? { requestDescription: dto.requestDescription.trim().toUpperCase() || null }
            : {}),
          ...(clearClassificationInvalidated
            ? { classificationInvalidated: false }
            : {}),
          state: nextState,
          submittedAt: existing.submittedAt ?? now,
          expiresAt: null,
        },
      });

      if (target === 'APROVADOR' && !isApproverEdit && !isImobilizadoEdit) {
        await tx.requestStage.updateMany({
          where: { requestId: id, finishedAt: null },
          data: {
            finishedAt: now,
            message: stageMessage,
            userId,
          },
        });
        await tx.requestStage.create({
          data: {
            requestId: id,
            stage: approvalState,
            userId,
            startedAt: now,
            message: null,
          },
        });
      } else if (
        items ||
        dto.observation !== undefined ||
        dto.requestDescription !== undefined ||
        (canChangeFixedAsset && dto.fixedAsset !== undefined) ||
        dto.familyId ||
        editNote
      ) {
        await tx.requestStage.updateMany({
          where: { requestId: id, finishedAt: null },
          data: {
            finishedAt: now,
            message: stageMessage,
            userId,
          },
        });
        await tx.requestStage.create({
          data: {
            requestId: id,
            stage: nextState,
            userId,
            startedAt: now,
            message: null,
          },
        });
      } else if (existing.state !== RequestState.SOLICITANTE && !isApproverEdit && !isImobilizadoEdit) {
        await tx.requestStage.updateMany({
          where: { requestId: id, finishedAt: null },
          data: {
            finishedAt: now,
            message: stageMessage,
            userId,
          },
        });
        await tx.requestStage.create({
          data: {
            requestId: id,
            stage: RequestState.SOLICITANTE,
            userId,
            startedAt: now,
            message: null,
          },
        });
      }
    });

    if (target === 'APROVADOR' && !isApproverEdit && !isImobilizadoEdit && approvalState === RequestState.IMOBILIZADO) {
      await this.prisma.ncmSuggestion.deleteMany({
        where: { requestItem: { requestId: id } },
      });
      await this.seedNcmSuggestions(id);
    }

    return this.findOne(id);
  }

  async submit(id: string, userId: string) {
    const existing = await this.prisma.request.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) throw new NotFoundException('Solicitação não encontrada');
    const role = await this.resolveUserRole(userId);
    if (role !== UserRole.ADMIN && existing.requesterId !== userId) {
      throw new ForbiddenException('Somente o solicitante pode enviar esta solicitação.');
    }
    if (!EDITABLE_STATES.includes(existing.state)) {
      throw new BadRequestException('Esta solicitação já saiu da etapa editável.');
    }
    for (const item of existing.items) {
      if (!item.descriptionLong) {
        throw new BadRequestException('Descrição longa é obrigatória em todos os itens.');
      }
      if (!item.measureUnitId) {
        throw new BadRequestException('Unidade de medida é obrigatória em todos os itens.');
      }
      if (!item.costCenterId) {
        throw new BadRequestException('Centro de custo é obrigatório em todos os itens.');
      }
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.requestStage.updateMany({
        where: { requestId: id, finishedAt: null },
        data: {
          finishedAt: now,
          message: existing.observation?.trim() || 'Rascunho concluído',
          userId,
        },
      });
      await tx.request.update({
        where: { id },
        data: {
          state: RequestState.SOLICITANTE,
          submittedAt: now,
          expiresAt: null,
        },
      });
      await tx.requestStage.create({
        data: {
          requestId: id,
          stage: RequestState.FORMULARIO,
          userId,
          startedAt: now,
          finishedAt: now,
          message: existing.observation?.trim() || 'Rascunho concluído',
        },
      });
      await tx.requestStage.create({
        data: {
          requestId: id,
          stage: RequestState.SOLICITANTE,
          userId,
          startedAt: now,
          message: null,
        },
      });
    });

    return this.findOne(id);
  }

  /**
   * Aprovador (cadastro ou imobilizado) devolve ao solicitante — reinicia timer SLA.
   */
  async returnToRequester(requestId: string, userId: string, message: string) {
    const trimmed = message?.trim();
    if (!trimmed) {
      throw new BadRequestException(
        'Informe um comentário ao devolver a solicitação ao solicitante.',
      );
    }

    const request = await this.prisma.request.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Solicitação não encontrada');
    if (
      request.state !== RequestState.APROVADOR &&
      request.state !== RequestState.IMOBILIZADO
    ) {
      throw new BadRequestException(
        'Só é possível devolver solicitações nas etapas Imobilizado ou Aprovador.',
      );
    }
    const role = await this.resolveUserRole(userId);
    const allowed =
      role === UserRole.ADMIN ||
      (role === UserRole.APROVADOR && request.state === RequestState.APROVADOR) ||
      (role === UserRole.APROVADOR_IMOBILIZADO &&
        request.state === RequestState.IMOBILIZADO);
    if (!allowed) {
      throw new ForbiddenException('Sem permissão para devolver esta solicitação.');
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.requestStage.updateMany({
        where: { requestId, finishedAt: null },
        data: { finishedAt: now, userId, message: trimmed },
      });
      await tx.request.update({
        where: { id: requestId },
        data: { state: RequestState.RETORNO_SOLICITANTE },
      });
      await tx.requestStage.create({
        data: {
          requestId,
          stage: RequestState.RETORNO_SOLICITANTE,
          userId,
          startedAt: now,
          message: null,
        },
      });
    });

    return this.findOne(requestId);
  }

  /**
   * Encerrar solicitação sem promover à base (estado REPROVADO).
   * Solicitante (rascunho / solicitante / retorno): motivo opcional.
   * Aprovador - Administrativo ou Imobilizado: motivo (código) + observação obrigatórios.
   */
  async closeRequest(
    requestId: string,
    userId: string,
    body: { reasonCode?: string; observation?: string },
  ) {
    const request = await this.prisma.request.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Solicitação não encontrada');

    const isSolicitanteStage = SOLICITANTE_CLOSE_STATES.includes(request.state);
    const isAprovadorStage = APROVADOR_CLOSE_STATES.includes(request.state);
    if (!isSolicitanteStage && !isAprovadorStage) {
      throw new BadRequestException(
        'Só é possível encerrar solicitações nas etapas do solicitante ou dos aprovadores.',
      );
    }

    const role = await this.resolveUserRole(userId);
    if (isSolicitanteStage) {
      const allowed =
        role === UserRole.ADMIN ||
        role === UserRole.SOLICITANTE ||
        request.requesterId === userId;
      if (!allowed) {
        throw new ForbiddenException('Sem permissão para encerrar esta solicitação.');
      }
    } else {
      const allowed =
        role === UserRole.ADMIN ||
        (role === UserRole.APROVADOR && request.state === RequestState.APROVADOR) ||
        (role === UserRole.APROVADOR_IMOBILIZADO &&
          request.state === RequestState.IMOBILIZADO);
      if (!allowed) {
        throw new ForbiddenException('Sem permissão para encerrar esta solicitação.');
      }
    }

    const reasonCode = body.reasonCode?.trim() || '';
    const observation = body.observation?.trim() || '';

    if (isAprovadorStage) {
      if (!isCloseReasonCode(reasonCode)) {
        throw new BadRequestException('Selecione um motivo válido para o encerramento.');
      }
      if (!observation) {
        throw new BadRequestException(
          'A observação do encerramento é obrigatória para o aprovador.',
        );
      }
    } else if (reasonCode && !isCloseReasonCode(reasonCode)) {
      throw new BadRequestException('Motivo de encerramento inválido.');
    }

    const reasonLabel = closeReasonLabel(reasonCode);
    const actorLabel = isSolicitanteStage
      ? 'Solicitante'
      : request.state === RequestState.IMOBILIZADO
        ? 'Aprovador - Imobilizado'
        : 'Aprovador - Administrativo';

    const messageParts = [
      `Encerrada por ${actorLabel}`,
      reasonLabel ? `Motivo: ${reasonLabel}` : null,
      observation || null,
    ].filter(Boolean);
    const stageMessage = messageParts.join(' — ');

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.requestStage.updateMany({
        where: { requestId, finishedAt: null },
        data: {
          finishedAt: now,
          userId,
          message: stageMessage,
          outcome: OUTCOME_CLOSED,
          outcomeDetail: {
            reasonCode: reasonCode || null,
            reasonLabel,
            observation: observation || null,
            closedBy: isSolicitanteStage ? 'solicitante' : 'aprovador',
          },
        },
      });
      await tx.requestStage.create({
        data: {
          requestId,
          stage: RequestState.REPROVADO,
          userId,
          startedAt: now,
          finishedAt: now,
          message: stageMessage,
          outcome: OUTCOME_CLOSED,
          outcomeDetail: {
            reasonCode: reasonCode || null,
            reasonLabel,
            observation: observation || null,
            closedBy: isSolicitanteStage ? 'solicitante' : 'aprovador',
          },
        },
      });
      await tx.request.update({
        where: { id: requestId },
        data: {
          state: RequestState.REPROVADO,
          closedAt: now,
        },
      });
    });

    return this.findOne(requestId);
  }

  /**
   * Solicitante envia à primeira aprovação — sempre Aprovador - Imobilizado.
   * Nunca salta para Aprovador - Administrativo sem triagem do Imobilizado.
   */
  async sendToApprover(requestId: string, userId: string, message: string) {
    const trimmed = message?.trim();
    if (!trimmed) {
      throw new BadRequestException(
        'Informe um comentário ao concluir a etapa antes de enviar ao aprovador.',
      );
    }

    const request = await this.prisma.request.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Solicitação não encontrada');
    if (request.state !== RequestState.SOLICITANTE && request.state !== RequestState.RETORNO_SOLICITANTE) {
      throw new BadRequestException(
        'Só é possível enviar ao aprovador solicitações na etapa Solicitante ou Retorno solicitante.',
      );
    }
    const role = await this.resolveUserRole(userId);
    if (role !== UserRole.ADMIN && role !== UserRole.SOLICITANTE && request.requesterId !== userId) {
      throw new ForbiddenException('Sem permissão para enviar esta solicitação ao aprovador.');
    }

    const nextState = this.firstApprovalState(request.fixedAsset);
    if (nextState !== RequestState.IMOBILIZADO) {
      throw new BadRequestException(
        'Toda solicitação deve passar pelo aprovador - imobilizado antes do administrativo.',
      );
    }
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.requestStage.updateMany({
        where: { requestId, finishedAt: null },
        data: { finishedAt: now, userId, message: trimmed },
      });
      await tx.request.update({
        where: { id: requestId },
        data: { state: nextState },
      });
      await tx.requestStage.create({
        data: {
          requestId,
          stage: nextState,
          userId,
          startedAt: now,
          message: null,
        },
      });
    });

    await this.prisma.ncmSuggestion.deleteMany({
      where: { requestItem: { requestId } },
    });
    await this.seedNcmSuggestions(requestId);

    return this.findOne(requestId);
  }

  /**
   * Aprovador reclassifica itens como Ativo Fixo → etapa Imobilizado.
   * Lote inteiro: a própria solicitação vai ao Imobilizado.
   * Lote misto: itens AF vão para solicitação filha (parent_request_id); consumo permanece no Aprovador.
   */
  async reclassifyAsFixedAsset(
    requestId: string,
    userId: string,
    dto: ReclassifyRequestDto,
  ) {
    const justification = dto.justification?.trim();
    if (!justification) {
      throw new BadRequestException('Informe a justificativa da reclassificação.');
    }

    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      include: {
        hotels: true,
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            links: { orderBy: { sortOrder: 'asc' } },
            group: {
              select: {
                code: true,
                subgroup: { select: { familyId: true } },
              },
            },
          },
        },
      },
    });
    if (!request) throw new NotFoundException('Solicitação não encontrada');
    if (request.state !== RequestState.APROVADOR) {
      throw new BadRequestException(
        'Só é possível reclassificar como ativo fixo na etapa Aprovador.',
      );
    }
    const role = await this.resolveUserRole(userId);
    if (role !== UserRole.ADMIN && role !== UserRole.APROVADOR) {
      throw new ForbiddenException(
        'Sem permissão para reclassificar como ativo fixo.',
      );
    }

    const { selectedIds, remainingIds, isFullLot } = this.resolveSelectedItemIds(
      request.items.map((i) => i.id),
      dto.itemIds,
    );
    const returnToApprover = dto.returnToApprover ?? true;
    const selectedItems = request.items.filter((i) => selectedIds.includes(i.id));
    const itemsBefore = selectedItems.map((i) =>
      this.itemClassificationSnapshot(i, request.familyId),
    );

    if (isFullLot) {
      const now = new Date();
      await this.prisma.$transaction(async (tx) => {
        for (const item of request.items) {
          await tx.requestItem.update({
            where: { id: item.id },
            data: {
              itemKind: ItemKind.FIXED_ASSET,
              groupId: null,
              measureUnitId: null,
              purchaseQtyTotal: null,
              unitQuantity: item.unitQuantity ?? 1,
            },
          });
        }

        const updatedItems = await tx.requestItem.findMany({
          where: { requestId },
          orderBy: { sortOrder: 'asc' },
          include: {
            group: {
              select: {
                code: true,
                subgroup: { select: { familyId: true } },
              },
            },
          },
        });
        const itemsAfter = updatedItems.map((i) =>
          this.itemClassificationSnapshot(i, request.familyId),
        );

        await tx.requestStage.updateMany({
          where: { requestId, finishedAt: null },
          data: {
            finishedAt: now,
            userId,
            message: justification,
            outcome: OUTCOME_RECLASSIFY_FIXED_ASSET,
            outcomeDetail: {
              justification,
              returnToApprover,
              split: false,
              itemIds: selectedIds,
              itemsBefore,
              itemsAfter,
            },
          },
        });
        await tx.request.update({
          where: { id: requestId },
          data: {
            fixedAsset: true,
            returnToApprover,
            classificationInvalidated: true,
            state: RequestState.IMOBILIZADO,
          },
        });
        await tx.requestStage.create({
          data: {
            requestId,
            stage: RequestState.IMOBILIZADO,
            userId,
            startedAt: now,
            message: null,
          },
        });
      });

      if (!returnToApprover) {
        await this.prisma.ncmSuggestion.deleteMany({
          where: { requestItem: { requestId } },
        });
        await this.seedNcmSuggestions(requestId);
      }

      return this.findOne(requestId);
    }

    // --- Lote misto: filha AF + mãe permanece no Aprovador com o consumo ---
    const now = new Date();
    const splitNote = `Divisão automática: itens de ativo fixo separados da solicitação ${requestId.slice(0, 8)}…`;
    const childObservation = [request.observation?.trim(), splitNote, `Justificativa: ${justification}`]
      .filter(Boolean)
      .join('\n\n');
    const childDescription = request.requestDescription?.trim()
      ? `${request.requestDescription.trim()} (ATIVO FIXO — DIVISÃO)`
      : 'ATIVO FIXO — DIVISÃO DE LOTE MISTO';

    const childId = await this.prisma.$transaction(async (tx) => {
      const child = await tx.request.create({
        data: {
          requesterId: request.requesterId,
          hotelId: request.hotelId,
          familyId: request.familyId,
          type: request.type,
          state: RequestState.IMOBILIZADO,
          fixedAsset: true,
          returnToApprover,
          classificationInvalidated: true,
          parentRequestId: request.id,
          observation: childObservation,
          requestDescription: childDescription,
          submittedAt: request.submittedAt ?? now,
          hotels: {
            create: request.hotels.map((h) => ({ hotelId: h.hotelId })),
          },
        },
      });

      let sort = 0;
      for (const item of selectedItems) {
        await tx.requestItem.update({
          where: { id: item.id },
          data: {
            requestId: child.id,
            sortOrder: sort++,
            itemKind: ItemKind.FIXED_ASSET,
            groupId: null,
            measureUnitId: null,
            purchaseQtyTotal: null,
            unitQuantity: item.unitQuantity ?? 1,
          },
        });
      }

      await tx.ncmSuggestion.deleteMany({
        where: { requestItemId: { in: selectedIds } },
      });

      // Reordena itens remanescentes na mãe
      const remaining = request.items.filter((i) => remainingIds.includes(i.id));
      let remSort = 0;
      for (const item of remaining) {
        await tx.requestItem.update({
          where: { id: item.id },
          data: { sortOrder: remSort++ },
        });
      }

      const movedItems = await tx.requestItem.findMany({
        where: { id: { in: selectedIds } },
        orderBy: { sortOrder: 'asc' },
        include: {
          group: {
            select: {
              code: true,
              subgroup: { select: { familyId: true } },
            },
          },
        },
      });
      const itemsAfter = movedItems.map((i) =>
        this.itemClassificationSnapshot(i, request.familyId),
      );

      const parentMessage =
        `${justification}\n\n` +
        `Lote dividido: ${selectedIds.length} item(ns) de ativo fixo → solicitação ${child.id}. ` +
        `${remainingIds.length} item(ns) de consumo permanecem nesta solicitação.`;

      await tx.requestStage.updateMany({
        where: { requestId, finishedAt: null },
        data: {
          finishedAt: now,
          userId,
          message: parentMessage,
          outcome: OUTCOME_RECLASSIFY_FIXED_ASSET,
          outcomeDetail: {
            justification,
            returnToApprover,
            split: true,
            parentRequestId: request.id,
            childRequestId: child.id,
            itemIds: selectedIds,
            remainingItemIds: remainingIds,
            itemsBefore,
            itemsAfter,
          },
        },
      });
      // Mãe segue no Aprovador (consumo)
      await tx.requestStage.create({
        data: {
          requestId,
          stage: RequestState.APROVADOR,
          userId,
          startedAt: now,
          message: null,
        },
      });

      const childOpenMessage =
        `${justification}\n\n` +
        `Gerada a partir da solicitação ${request.id} (divisão de lote misto).`;

      await tx.requestStage.create({
        data: {
          requestId: child.id,
          stage: RequestState.APROVADOR,
          userId,
          startedAt: now,
          finishedAt: now,
          message: childOpenMessage,
          outcome: OUTCOME_RECLASSIFY_FIXED_ASSET,
          outcomeDetail: {
            justification,
            returnToApprover,
            split: true,
            parentRequestId: request.id,
            childRequestId: child.id,
            itemIds: selectedIds,
            remainingItemIds: remainingIds,
            itemsBefore,
            itemsAfter,
          },
        },
      });
      await tx.requestStage.create({
        data: {
          requestId: child.id,
          stage: RequestState.IMOBILIZADO,
          userId,
          startedAt: now,
          message: null,
        },
      });

      return child.id;
    });

    if (!returnToApprover) {
      await this.prisma.ncmSuggestion.deleteMany({
        where: { requestItem: { requestId: childId } },
      });
      await this.seedNcmSuggestions(childId);
    }

    // Retorna a mãe (consumo); filha acessível via childRequests
    return this.findOne(requestId);
  }

  /**
   * Imobilizado reclassifica itens como Uso e Consumo → Aprovador.
   * Lote inteiro: a própria solicitação volta ao Aprovador.
   * Lote misto: itens de consumo vão para filha no Aprovador; AF permanece no Imobilizado.
   */
  async reclassifyAsConsumption(
    requestId: string,
    userId: string,
    dto: ReclassifyRequestDto,
  ) {
    const justification = dto.justification?.trim();
    if (!justification) {
      throw new BadRequestException('Informe a justificativa da reclassificação.');
    }

    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      include: {
        hotels: true,
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            links: { orderBy: { sortOrder: 'asc' } },
            group: {
              select: {
                code: true,
                subgroup: { select: { familyId: true } },
              },
            },
          },
        },
      },
    });
    if (!request) throw new NotFoundException('Solicitação não encontrada');
    if (request.state !== RequestState.IMOBILIZADO) {
      throw new BadRequestException(
        'Só é possível reclassificar como uso e consumo na etapa Imobilizado.',
      );
    }
    const role = await this.resolveUserRole(userId);
    if (role !== UserRole.ADMIN && role !== UserRole.APROVADOR_IMOBILIZADO) {
      throw new ForbiddenException(
        'Sem permissão para reclassificar como uso e consumo.',
      );
    }

    const { selectedIds, remainingIds, isFullLot } = this.resolveSelectedItemIds(
      request.items.map((i) => i.id),
      dto.itemIds,
    );
    const selectedItems = request.items.filter((i) => selectedIds.includes(i.id));
    const itemsBefore = selectedItems.map((i) =>
      this.itemClassificationSnapshot(i, request.familyId),
    );

    const clearAfFields = {
      itemKind: ItemKind.CONSUMPTION,
      groupId: null as string | null,
      measureUnitId: null as string | null,
      unitQuantity: null as number | null,
      physicalLocation: null as string | null,
      assetTag: null as string | null,
      acquisitionValue: null as null,
      acquisitionDate: null as null,
      usefulLifeMonths: null as number | null,
      depreciationRate: null as null,
      supplierDocument: null as string | null,
      invoiceNumber: null as string | null,
    };

    if (isFullLot) {
      const now = new Date();
      await this.prisma.$transaction(async (tx) => {
        for (const item of request.items) {
          await tx.requestItem.update({
            where: { id: item.id },
            data: clearAfFields,
          });
        }

        const updatedItems = await tx.requestItem.findMany({
          where: { requestId },
          orderBy: { sortOrder: 'asc' },
          include: {
            group: {
              select: {
                code: true,
                subgroup: { select: { familyId: true } },
              },
            },
          },
        });
        const itemsAfter = updatedItems.map((i) =>
          this.itemClassificationSnapshot(i, request.familyId),
        );

        await tx.requestStage.updateMany({
          where: { requestId, finishedAt: null },
          data: {
            finishedAt: now,
            userId,
            message: justification,
            outcome: OUTCOME_RECLASSIFY_CONSUMPTION,
            outcomeDetail: {
              justification,
              returnToApprover: true,
              split: false,
              itemIds: selectedIds,
              itemsBefore,
              itemsAfter,
            },
          },
        });
        await tx.request.update({
          where: { id: requestId },
          data: {
            fixedAsset: false,
            returnToApprover: true,
            classificationInvalidated: true,
            state: RequestState.APROVADOR,
          },
        });
        await tx.requestStage.create({
          data: {
            requestId,
            stage: RequestState.APROVADOR,
            userId,
            startedAt: now,
            message: null,
          },
        });
      });

      await this.prisma.ncmSuggestion.deleteMany({
        where: { requestItem: { requestId } },
      });
      await this.seedNcmSuggestions(requestId);
      return this.findOne(requestId);
    }

    // --- Lote misto inverso: filha consumo no Aprovador; mãe AF no Imobilizado ---
    const now = new Date();
    const splitNote = `Divisão automática: itens de uso e consumo separados da solicitação ${requestId.slice(0, 8)}…`;
    const childObservation = [request.observation?.trim(), splitNote, `Justificativa: ${justification}`]
      .filter(Boolean)
      .join('\n\n');
    const childDescription = request.requestDescription?.trim()
      ? `${request.requestDescription.trim()} (USO E CONSUMO — DIVISÃO)`
      : 'USO E CONSUMO — DIVISÃO DE LOTE MISTO';

    await this.prisma.$transaction(async (tx) => {
      const child = await tx.request.create({
        data: {
          requesterId: request.requesterId,
          hotelId: request.hotelId,
          familyId: request.familyId,
          type: request.type,
          state: RequestState.APROVADOR,
          fixedAsset: false,
          returnToApprover: true,
          classificationInvalidated: true,
          parentRequestId: request.id,
          observation: childObservation,
          requestDescription: childDescription,
          submittedAt: request.submittedAt ?? now,
          hotels: {
            create: request.hotels.map((h) => ({ hotelId: h.hotelId })),
          },
        },
      });

      let sort = 0;
      for (const item of selectedItems) {
        await tx.requestItem.update({
          where: { id: item.id },
          data: {
            requestId: child.id,
            sortOrder: sort++,
            ...clearAfFields,
          },
        });
      }

      await tx.ncmSuggestion.deleteMany({
        where: { requestItemId: { in: selectedIds } },
      });

      const remaining = request.items.filter((i) => remainingIds.includes(i.id));
      let remSort = 0;
      for (const item of remaining) {
        await tx.requestItem.update({
          where: { id: item.id },
          data: { sortOrder: remSort++ },
        });
      }

      const movedItems = await tx.requestItem.findMany({
        where: { id: { in: selectedIds } },
        orderBy: { sortOrder: 'asc' },
        include: {
          group: {
            select: {
              code: true,
              subgroup: { select: { familyId: true } },
            },
          },
        },
      });
      const itemsAfter = movedItems.map((i) =>
        this.itemClassificationSnapshot(i, request.familyId),
      );

      const parentMessage =
        `${justification}\n\n` +
        `Lote dividido: ${selectedIds.length} item(ns) de uso e consumo → solicitação ${child.id}. ` +
        `${remainingIds.length} item(ns) de ativo fixo permanecem nesta solicitação.`;

      await tx.requestStage.updateMany({
        where: { requestId, finishedAt: null },
        data: {
          finishedAt: now,
          userId,
          message: parentMessage,
          outcome: OUTCOME_RECLASSIFY_CONSUMPTION,
          outcomeDetail: {
            justification,
            returnToApprover: true,
            split: true,
            parentRequestId: request.id,
            childRequestId: child.id,
            itemIds: selectedIds,
            remainingItemIds: remainingIds,
            itemsBefore,
            itemsAfter,
          },
        },
      });
      await tx.requestStage.create({
        data: {
          requestId,
          stage: RequestState.IMOBILIZADO,
          userId,
          startedAt: now,
          message: null,
        },
      });

      const childMsg =
        `${justification}\n\n` +
        `Gerada a partir da solicitação ${request.id} (divisão de lote misto).`;
      await tx.requestStage.create({
        data: {
          requestId: child.id,
          stage: RequestState.IMOBILIZADO,
          userId,
          startedAt: now,
          finishedAt: now,
          message: childMsg,
          outcome: OUTCOME_RECLASSIFY_CONSUMPTION,
          outcomeDetail: {
            justification,
            returnToApprover: true,
            split: true,
            parentRequestId: request.id,
            childRequestId: child.id,
            itemIds: selectedIds,
            remainingItemIds: remainingIds,
            itemsBefore,
            itemsAfter,
          },
        },
      });
      await tx.requestStage.create({
        data: {
          requestId: child.id,
          stage: RequestState.APROVADOR,
          userId,
          startedAt: now,
          message: null,
        },
      });
    });

    return this.findOne(requestId);
  }

  /**
   * Conclusão da etapa Imobilizado (triagem):
   * - fixedAsset=true → registra na base AF e encerra (não passa pelo Administrativo)
   * - fixedAsset=false → encaminha ao Aprovador - Administrativo como uso e consumo
   */
  async sendFromImobilizadoToApprover(
    requestId: string,
    userId: string,
    message: string,
    itemNcms: { itemId: string; ncm: string }[] = [],
  ) {
    const trimmed = message?.trim();
    if (!trimmed) {
      throw new BadRequestException(
        'Informe um comentário ao concluir a etapa de imobilizado.',
      );
    }

    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        hotels: true,
        family: { select: { id: true, itemKind: true } },
        stages: { where: { finishedAt: null } },
      },
    });
    if (!request) throw new NotFoundException('Solicitação não encontrada');
    if (request.state !== RequestState.IMOBILIZADO) {
      throw new BadRequestException(
        'Só é possível concluir a etapa na fase Aprovador - Imobilizado.',
      );
    }
    const role = await this.resolveUserRole(userId);
    if (role !== UserRole.ADMIN && role !== UserRole.APROVADOR_IMOBILIZADO) {
      throw new ForbiddenException(
        'Sem permissão para concluir a etapa de imobilizado.',
      );
    }

    const now = new Date();
    const treatAsFixedAsset = request.fixedAsset === true;

    if (treatAsFixedAsset) {
      if (request.classificationInvalidated) {
        await this.assertFixedAssetClassificationReady(
          request.familyId,
          request.items.map((i) => ({
            id: i.id,
            descriptionShort: i.descriptionShort,
            groupId: i.groupId,
          })),
        );
      }

      const ncmByItem = new Map<string, string>();
      for (const item of request.items) {
        const pair = itemNcms.find((x) => x.itemId === item.id);
        let ncm = pair?.ncm?.trim() || item.ncmCode?.trim();
        if (!ncm && item.productId) {
          const product = await this.prisma.product.findUnique({
            where: { id: item.productId },
            select: { ncmCode: true },
          });
          ncm = product?.ncmCode?.trim() ?? '';
        }
        if (!ncm && !isBlockRequestType(request.type)) {
          throw new BadRequestException(
            'ITM-09: confirme o NCM de todos os itens antes de finalizar.',
          );
        }
        if (ncm) {
          ncmByItem.set(item.id, await this.ensureNcmCode(this.prisma, ncm, 'MANUAL'));
        }
      }

      const stageMessage = `${trimmed} — Aprovador - Imobilizado registrou na base de ativos fixos`;
      await this.prisma.$transaction(async (tx) => {
        await this.promoteApprovedRequestToBase(tx, request, userId, now, ncmByItem);
        await tx.requestStage.updateMany({
          where: { requestId, finishedAt: null },
          data: { finishedAt: now, userId, message: stageMessage },
        });
        await tx.requestStage.create({
          data: {
            requestId,
            stage: RequestState.ENCERRADO,
            userId,
            startedAt: now,
            finishedAt: now,
            message: stageMessage,
          },
        });
        await tx.request.update({
          where: { id: requestId },
          data: {
            state: RequestState.ENCERRADO,
            closedAt: now,
            fixedAsset: true,
            classificationInvalidated: false,
          },
        });
      });
      return this.findOne(requestId);
    }

    // Uso e consumo → Administrativo
    await this.prisma.$transaction(async (tx) => {
      await tx.requestStage.updateMany({
        where: { requestId, finishedAt: null },
        data: {
          finishedAt: now,
          userId,
          message: `${trimmed} — Não é ativo fixo; encaminhado ao aprovador - administrativo`,
        },
      });
      await tx.request.update({
        where: { id: requestId },
        data: {
          state: RequestState.APROVADOR,
          fixedAsset: false,
          classificationInvalidated: false,
        },
      });
      await tx.requestItem.updateMany({
        where: { requestId },
        data: { itemKind: ItemKind.CONSUMPTION },
      });
      await tx.requestStage.create({
        data: {
          requestId,
          stage: RequestState.APROVADOR,
          userId,
          startedAt: now,
          message: null,
        },
      });
    });

    await this.prisma.ncmSuggestion.deleteMany({
      where: { requestItem: { requestId } },
    });
    await this.seedNcmSuggestions(requestId);
    return this.findOne(requestId);
  }

  /**
   * Imobilizado marca o lote como Ativo Fixo e permanece na etapa para classificar/aprovar.
   * Não encaminha ao Administrativo.
   */
  async markAsFixedAsset(requestId: string, userId: string, message: string) {
    const trimmed = message?.trim();
    if (!trimmed) {
      throw new BadRequestException(
        'Informe um comentário ao classificar como ativo fixo.',
      );
    }
    const request = await this.prisma.request.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Solicitação não encontrada');
    if (request.state !== RequestState.IMOBILIZADO) {
      throw new BadRequestException(
        'Só é possível marcar ativo fixo na etapa Aprovador - Imobilizado.',
      );
    }
    const role = await this.resolveUserRole(userId);
    if (role !== UserRole.ADMIN && role !== UserRole.APROVADOR_IMOBILIZADO) {
      throw new ForbiddenException('Sem permissão para classificar esta solicitação.');
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.requestStage.updateMany({
        where: { requestId, finishedAt: null },
        data: {
          finishedAt: now,
          userId,
          message: `${trimmed} — Classificado como ativo fixo (permanece no Imobilizado)`,
        },
      });
      await tx.request.update({
        where: { id: requestId },
        data: {
          fixedAsset: true,
          returnToApprover: false,
          classificationInvalidated: true,
          state: RequestState.IMOBILIZADO,
        },
      });
      await tx.requestItem.updateMany({
        where: { requestId },
        data: {
          itemKind: ItemKind.FIXED_ASSET,
          measureUnitId: null,
          purchaseQtyTotal: null,
          law116: null,
        },
      });
      await tx.requestStage.create({
        data: {
          requestId,
          stage: RequestState.IMOBILIZADO,
          userId,
          startedAt: now,
          message: null,
        },
      });
    });

    await this.prisma.ncmSuggestion.deleteMany({
      where: { requestItem: { requestId } },
    });
    await this.seedNcmSuggestions(requestId);

    return this.findOne(requestId);
  }

  private requestItemInclude() {
    return {
      measureUnit: { select: { id: true, code: true, name: true } },
      costCenter: { select: { id: true, code: true, name: true } },
      group: {
        select: {
          id: true,
          code: true,
          name: true,
          subgroupId: true,
          subgroup: {
            select: {
              id: true,
              code: true,
              name: true,
              familyId: true,
            },
          },
        },
      },
    };
  }

  private requestListInclude() {
    return {
      requester: { select: { id: true, name: true } },
      hotel: { select: { id: true, code: true, name: true } },
      family: { select: { id: true, code: true, name: true } },
      hotels: { include: { hotel: { select: { id: true, code: true, name: true } } } },
      items: {
        orderBy: { sortOrder: 'asc' as const },
        take: 3,
        include: this.requestItemInclude(),
      },
      stages: {
        where: { finishedAt: null },
        orderBy: { startedAt: 'desc' as const },
        take: 1,
      },
    };
  }

  async findOne(id: string) {
    const request = await this.prisma.request.findUnique({
      where: { id },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        hotel: true,
        family: { select: { id: true, code: true, name: true, itemKind: true } },
        hotels: { include: { hotel: true } },
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            ...this.requestItemInclude(),
            links: { orderBy: { sortOrder: 'asc' } },
            ncmSuggestions: { orderBy: { rank: 'asc' } },
          },
        },
        parentRequest: { select: { id: true, state: true, fixedAsset: true } },
        childRequests: {
          select: { id: true, state: true, fixedAsset: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
        stages: { orderBy: { startedAt: 'asc' }, include: { user: { select: { name: true } } } },
      },
    });
    if (!request) throw new NotFoundException('Solicitação não encontrada');

    const sourceIds = [
      ...new Set(
        request.items.flatMap((it) =>
          (it.ncmSuggestions ?? [])
            .map((s) => s.sourceProductId)
            .filter((pid): pid is string => Boolean(pid)),
        ),
      ),
    ];
    const sourceProducts =
      sourceIds.length === 0
        ? []
        : await this.prisma.product.findMany({
            where: { id: { in: sourceIds } },
            select: { id: true, descriptionShort: true },
          });
    const descByProduct = new Map(sourceProducts.map((p) => [p.id, p.descriptionShort]));

    return {
      ...request,
      items: request.items.map((it) => ({
        ...it,
        ncmSuggestions: (it.ncmSuggestions ?? []).map((s) => ({
          ...s,
          sampleDescription: s.sourceProductId
            ? descByProduct.get(s.sourceProductId) ?? null
            : null,
        })),
      })),
    };
  }

  /**
   * Garante linha em ncm_codes (bootstrap/manual) antes da FK.
   * Retorna código canônico de 8 dígitos.
   */
  private async ensureNcmCode(
    tx: Prisma.TransactionClient | PrismaService,
    raw: string,
    source: 'MANUAL' | 'SAP_USAGE' | 'RECEITA' = 'MANUAL',
  ): Promise<string> {
    const code = normalizeNcmCode(raw);
    if (!code) {
      throw new BadRequestException(
        'NCM inválido. Informe 8 dígitos (ex.: 2202.10.00 ou 22021000).',
      );
    }
    await tx.ncmCode.upsert({
      where: { code },
      create: {
        code,
        description: formatNcmDisplay(code),
        active: true,
        source,
      },
      update: { active: true },
    });
    return code;
  }

  async confirmNcm(itemId: string, ncm: string, userId: string) {
    const item = await this.prisma.requestItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item não encontrado');

    const code = await this.ensureNcmCode(this.prisma, ncm, 'MANUAL');
    return this.prisma.requestItem.update({
      where: { id: itemId },
      data: { ncmCode: code, ncmConfirmed: true },
    });
  }

  /**
   * Aprovador - Administrativo finaliza.
   * INCLUSÃO com subset: promove só `approvedItemIds`; demais rejeitados (outcome parcial).
   * Sem `approvedItemIds` (ou todos): aprovação total.
   */
  async approve(
    requestId: string,
    userId: string,
    itemNcms: { itemId: string; ncm: string }[],
    message?: string,
    approvedItemIds?: string[],
  ) {
    const trimmed = message?.trim();
    if (!trimmed) {
      throw new BadRequestException(
        'Informe um comentário ao concluir a etapa antes de finalizar.',
      );
    }

    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        hotels: true,
        stages: { where: { finishedAt: null } },
      },
    });
    if (!request) throw new NotFoundException('Solicitação não encontrada');
    if (request.state !== RequestState.APROVADOR) {
      throw new BadRequestException(
        'Só é possível finalizar solicitações na etapa Aprovador.',
      );
    }

    const allIds = request.items.map((i) => i.id);
    let approvedIds: string[];
    if (!approvedItemIds?.length) {
      approvedIds = allIds;
    } else {
      const unique = [...new Set(approvedItemIds)];
      for (const id of unique) {
        if (!allIds.includes(id)) {
          throw new BadRequestException(`Item ${id} não pertence a esta solicitação.`);
        }
      }
      if (!unique.length) {
        throw new BadRequestException('Selecione ao menos um item para aprovar.');
      }
      approvedIds = unique;
    }

    const approvedSet = new Set(approvedIds);
    const rejectedIds = allIds.filter((id) => !approvedSet.has(id));
    const isPartial = rejectedIds.length > 0;
    const approvedItems = request.items.filter((i) => approvedSet.has(i.id));

    const ncmByItem = new Map<string, string>();
    for (const item of approvedItems) {
      const pair = itemNcms.find((x) => x.itemId === item.id);
      let ncm = pair?.ncm?.trim() || item.ncmCode?.trim();
      if (!ncm && item.productId) {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
          select: { ncmCode: true },
        });
        ncm = product?.ncmCode?.trim() ?? '';
      }
      if (!ncm && !isBlockRequestType(request.type)) {
        throw new BadRequestException(
          `ITM-09: confirme o NCM do item aprovado "${item.descriptionShort}" antes de finalizar.`,
        );
      }
      if (ncm) {
        ncmByItem.set(item.id, await this.ensureNcmCode(this.prisma, ncm, 'MANUAL'));
      }
    }

    const outcome = isPartial ? OUTCOME_APPROVAL_PARTIAL : OUTCOME_APPROVAL_TOTAL;
    const stageMessage = isPartial
      ? `${trimmed} — Aprovação parcial: ${approvedIds.length} de ${allIds.length} item(ns) na base; ${rejectedIds.length} rejeitado(s)`
      : `${trimmed} — Aprovação total: ${approvedIds.length} item(ns) na base`;

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await this.promoteApprovedRequestToBase(
        tx,
        { ...request, items: approvedItems },
        userId,
        now,
        ncmByItem,
      );

      await tx.requestStage.updateMany({
        where: { requestId, finishedAt: null },
        data: {
          finishedAt: now,
          userId,
          message: stageMessage,
          outcome,
          outcomeDetail: {
            approvedItemIds: approvedIds,
            rejectedItemIds: rejectedIds,
            approvedCount: approvedIds.length,
            rejectedCount: rejectedIds.length,
            itemsApproved: approvedItems.map((i) => ({
              id: i.id,
              descriptionShort: i.descriptionShort,
            })),
            itemsRejected: request.items
              .filter((i) => !approvedSet.has(i.id))
              .map((i) => ({
                id: i.id,
                descriptionShort: i.descriptionShort,
              })),
          },
        },
      });
      await tx.requestStage.create({
        data: {
          requestId,
          stage: RequestState.ENCERRADO,
          userId,
          startedAt: now,
          finishedAt: now,
          message: stageMessage,
          outcome,
          outcomeDetail: {
            approvedItemIds: approvedIds,
            rejectedItemIds: rejectedIds,
            approvedCount: approvedIds.length,
            rejectedCount: rejectedIds.length,
          },
        },
      });
      await tx.request.update({
        where: { id: requestId },
        data: {
          state: RequestState.ENCERRADO,
          closedAt: now,
        },
      });
    });

    return this.findOne(requestId);
  }

  /**
   * Materializa itens da solicitação aprovada na base unificada de produtos.
   * INCLUSÃO → cria `products`; ALTERAÇÃO → atualiza produto existente (`productId`).
   */
  private async promoteApprovedRequestToBase(
    tx: Prisma.TransactionClient,
    request: {
      id: string;
      familyId: string;
      hotelId: string;
      type: RequestType;
      fixedAsset: boolean;
      items: {
        id: string;
        productId: string | null;
        groupId: string | null;
        descriptionShort: string;
        descriptionLong: string | null;
        measureUnitId: string | null;
        costCenterId: string | null;
        itemKind: 'CONSUMPTION' | 'FIXED_ASSET';
        source: ProductSource;
        itemValue: Prisma.Decimal | null;
        purchaseQtyTotal: Prisma.Decimal | null;
        unitQuantity: number | null;
        physicalLocation: string | null;
        assetTag: string | null;
        acquisitionValue: Prisma.Decimal | null;
        acquisitionDate: Date | null;
        usefulLifeMonths: number | null;
        depreciationRate: Prisma.Decimal | null;
        supplierDocument: string | null;
        invoiceNumber: string | null;
        unifiedCode: string | null;
        legacyCode: string | null;
        law116: string | null;
        productLink: string | null;
        itemObservation: string | null;
      }[];
      hotels: { hotelId: string }[];
    },
    userId: string,
    now: Date,
    ncmByItem: Map<string, string>,
  ) {
    const hotelIds = request.hotels.length
      ? request.hotels.map((h) => h.hotelId)
      : [request.hotelId];

    for (const item of request.items) {
      if (isBlockRequestType(request.type)) {
        if (!item.productId) {
          throw new BadRequestException(
            `Bloqueio "${item.descriptionShort}": vincule o produto existente na base.`,
          );
        }
        const blockState =
          request.type === RequestType.BLOQUEIO_TOTAL
            ? ProductBlockState.TOTAL
            : ProductBlockState.PARTIAL;
        await tx.product.update({
          where: { id: item.productId },
          data: {
            blockState,
            active: blockState === ProductBlockState.TOTAL ? false : true,
            notes: item.itemObservation?.trim() || null,
          },
        });
        await tx.requestItem.update({
          where: { id: item.id },
          data: { productId: item.productId },
        });
        continue;
      }

      const isFixed = item.itemKind === 'FIXED_ASSET' || request.fixedAsset;
      if (!isFixed && !item.measureUnitId) {
        throw new BadRequestException(
          `Item "${item.descriptionShort}": unidade de medida obrigatória para consumo.`,
        );
      }
      if (!item.descriptionLong?.trim()) {
        throw new BadRequestException(
          `Item "${item.descriptionShort}": descrição longa obrigatória para cadastro na base.`,
        );
      }
      if (!item.groupId && !item.productId) {
        throw new BadRequestException(
          `Item "${item.descriptionShort}": grupo de itens obrigatório para cadastro na base.`,
        );
      }

      const ncm = ncmByItem.get(item.id) ?? '';
      const unitQuantity =
        isFixed && request.type === RequestType.INCLUSAO
          ? Math.max(1, item.unitQuantity ?? 1)
          : 1;

      const afFields = isFixed
        ? {
            physicalLocation: item.physicalLocation?.trim().toUpperCase() || null,
            costCenterId: item.costCenterId,
            hotelId: hotelIds[0] ?? request.hotelId,
            assetTag: item.assetTag?.trim().toUpperCase() || null,
            acquisitionValue: item.acquisitionValue,
            acquisitionDate: item.acquisitionDate,
            usefulLifeMonths: item.usefulLifeMonths,
            depreciationRate: item.depreciationRate,
            supplierDocument: item.supplierDocument?.trim() || null,
            invoiceNumber: item.invoiceNumber?.trim() || null,
          }
        : {};

      const productFields = {
        descriptionShort: item.descriptionShort.trim().toUpperCase(),
        descriptionLong: item.descriptionLong!.trim().toUpperCase(),
        ...(item.groupId ? { groupId: item.groupId } : {}),
        measureUnitId: isFixed ? null : item.measureUnitId,
        itemKind: isFixed ? ('FIXED_ASSET' as const) : ('CONSUMPTION' as const),
        source: item.source,
        legacyCode: item.legacyCode?.trim() || null,
        law116: item.law116?.trim() || null,
        productLink: item.productLink?.trim() || null,
        notes: item.itemObservation?.trim() || null,
        itemValue: item.itemValue,
        purchaseQtyTotal: isFixed ? null : item.purchaseQtyTotal,
        ncmCode: ncm || null,
        ncmConfirmedById: ncm ? userId : null,
        ncmConfirmedAt: ncm ? now : null,
        active: true,
        fixedAsset: isFixed,
        blockState: ProductBlockState.NONE,
        ...afFields,
      };

      // Ativo fixo INCLUSÃO: N instâncias (mesmo bem, N patrimônios). Consumo/alteração: 1.
      let lastProductId: string | null = null;
      const itemLinks = await tx.requestItemLink.findMany({
        where: { requestItemId: item.id },
        orderBy: { sortOrder: 'asc' },
      });
      const hotelRows = await this.buildProductHotelRows(tx, hotelIds, item.costCenterId);

      if (item.productId && !(isFixed && request.type === RequestType.INCLUSAO)) {
        const existing = await tx.product.findUnique({ where: { id: item.productId } });
        if (!existing) {
          throw new BadRequestException(
            `Item "${item.descriptionShort}": produto de origem não encontrado na base.`,
          );
        }
        await tx.product.update({
          where: { id: item.productId },
          data: productFields,
        });
        lastProductId = item.productId;

        await tx.productLink.deleteMany({ where: { productId: lastProductId } });
        if (itemLinks.length) {
          await tx.productLink.createMany({
            data: itemLinks.map((link, sortOrder) => ({
              productId: lastProductId!,
              url: link.url,
              sortOrder,
            })),
          });
        }
        await tx.productHotel.deleteMany({ where: { productId: lastProductId } });
        if (hotelRows.length) {
          await tx.productHotel.createMany({
            data: hotelRows.map((row) => ({
              productId: lastProductId!,
              hotelId: row.hotelId,
              costCenterId: row.costCenterId,
            })),
          });
        }
      } else {
        if (isExistingProductRequestType(request.type)) {
          throw new BadRequestException(
            `Solicitação "${item.descriptionShort}": vincule o produto existente na base.`,
          );
        }
        if (!item.groupId) {
          throw new BadRequestException(
            `Item "${item.descriptionShort}": grupo de itens obrigatório para inclusão na base.`,
          );
        }

        for (let i = 0; i < unitQuantity; i++) {
          const unifiedCode = await this.resolveUnifiedCodeForNewProduct(
            tx,
            { unifiedCode: i === 0 ? item.unifiedCode : null },
            request.familyId,
          );
          const created = await tx.product.create({
            data: { ...productFields, groupId: item.groupId, unifiedCode },
          });
          lastProductId = created.id;

          if (itemLinks.length) {
            await tx.productLink.createMany({
              data: itemLinks.map((link, sortOrder) => ({
                productId: created.id,
                url: link.url,
                sortOrder,
              })),
            });
          }
          if (hotelRows.length) {
            await tx.productHotel.createMany({
              data: hotelRows.map((row) => ({
                productId: created.id,
                hotelId: row.hotelId,
                costCenterId: row.costCenterId,
              })),
            });
          }
        }
      }

      await tx.requestItem.update({
        where: { id: item.id },
        data: {
          productId: lastProductId,
          ncmCode: ncm || null,
          ncmConfirmed: Boolean(ncm),
        },
      });
    }
  }

  /** Gera ou valida código unificado para novo produto na base. */
  private async resolveUnifiedCodeForNewProduct(
    tx: Prisma.TransactionClient,
    item: { unifiedCode: string | null },
    familyId: string,
  ): Promise<string> {
    if (item.unifiedCode?.trim()) {
      const code = item.unifiedCode.trim().toUpperCase();
      const exists = await tx.product.findFirst({ where: { unifiedCode: code } });
      if (exists) {
        throw new BadRequestException(
          `Código unificado "${code}" já existe na base de produtos.`,
        );
      }
      return code;
    }

    const family = await tx.family.findUnique({
      where: { id: familyId },
      select: { code: true },
    });
    const prefix = family?.code ?? 'FAM00';
    const baseCount = await tx.product.count({
      where: { group: { subgroup: { familyId } } },
    });

    for (let attempt = 0; attempt < 50; attempt++) {
      const candidate = `${prefix}${String(baseCount + 1 + attempt).padStart(4, '0')}`;
      const clash = await tx.product.findFirst({ where: { unifiedCode: candidate } });
      if (!clash) return candidate;
    }

    throw new BadRequestException('Não foi possível gerar código unificado para o produto.');
  }

  /** Mapeia hotéis da solicitação → `product_hotels` com CC quando aplicável. */
  private async buildProductHotelRows(
    tx: Prisma.TransactionClient,
    hotelIds: string[],
    costCenterId: string | null,
  ): Promise<{ hotelId: string; costCenterId: string | null }[]> {
    let ccHotelId: string | null = null;
    if (costCenterId) {
      const cc = await tx.costCenter.findUnique({
        where: { id: costCenterId },
        select: { hotelId: true },
      });
      ccHotelId = cc?.hotelId ?? null;
    }

    return hotelIds.map((hotelId) => ({
      hotelId,
      costCenterId: ccHotelId === hotelId ? costCenterId : null,
    }));
  }
}
