import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductBlockState, ProductSource, RequestState, RequestType, UserRole } from '@prisma/client';
import { pageResult, skipTake, type PageParams } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateRequestDto, UpdateRequestDto } from './dto/create-request.dto';
import { isBlockRequestType, isExistingProductRequestType } from './request-type.helpers';

const ACTIONABLE_STATES: RequestState[] = [
  RequestState.SOLICITANTE,
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

/** Etapas visíveis na caixa de entrada conforme o perfil (Produtos — sem Compliance). */
function inboxStatesForRole(role: UserRole): RequestState[] {
  switch (role) {
    case UserRole.ADMIN:
      return [RequestState.SOLICITANTE, RequestState.APROVADOR];
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

  /** Destino: rascunho → SOLICITANTE; envio → APROVADOR. */
  private resolveTargetStage(
    dto: { targetStage?: string; submit?: boolean },
  ): 'SOLICITANTE' | 'APROVADOR' {
    if (dto.targetStage === 'APROVADOR' || dto.targetStage === 'SOLICITANTE') {
      return dto.targetStage;
    }
    return dto.submit === true ? 'APROVADOR' : 'SOLICITANTE';
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
    const [solicitante, aprovador, encerrado] = await Promise.all([
      this.prisma.request.count({ where: { state: { in: SOLICITANTE_BUCKET_STATES } } }),
      this.prisma.request.count({ where: { state: RequestState.APROVADOR } }),
      this.prisma.request.count({ where: { state: { in: ENCERRADO_BUCKET_STATES } } }),
    ]);
    return { solicitante, aprovador, encerrado };
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
  private async assertFamilyExists(familyId: string) {
    const family = await this.prisma.family.findFirst({
      where: { id: familyId, active: true },
    });
    if (!family) {
      throw new BadRequestException('Família inválida ou inativa.');
    }
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

  private normalizeItemInput(items: CreateRequestDto['items']) {
    return items.map((item, idx) => {
      const links = this.extractItemLinks(item);
      return {
        descriptionShort: item.descriptionShort.trim().toUpperCase(),
        descriptionLong: item.descriptionLong?.trim().toUpperCase() ?? null,
        productId: item.productId ?? null,
        measureUnitId: item.measureUnitId ?? null,
        costCenterId: item.costCenterId ?? null,
        source: item.source ?? ProductSource.NATIONAL,
        itemValue: item.itemValue != null ? item.itemValue : null,
        purchaseQtyTotal: item.purchaseQtyTotal != null ? item.purchaseQtyTotal : null,
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

  private async assertNoExactDuplicateInBase(descriptionShort: string) {
    const normalized = descriptionShort.trim().toUpperCase();
    const exact = await this.prisma.product.findFirst({
      where: { active: true, descriptionShort: normalized },
    });
    if (exact) {
      throw new BadRequestException(
        'Produto com descrição idêntica já existe na base unificada. Não é possível solicitar inclusão duplicada.',
      );
    }
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT p.id
      FROM products p
      WHERE p.active = true
        AND similarity(p.description_short, ${normalized}) >= 0.999
      LIMIT 1
    `;
    if (rows.length) {
      throw new BadRequestException(
        'Match de 100% com produto existente na base unificada. Não é possível continuar com a inclusão.',
      );
    }
  }

  private async assertNoSimilarProductInBase(descriptionShort: string) {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT p.id
      FROM products p
      WHERE p.active = true
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
        await this.assertNoExactDuplicateInBase(item.descriptionShort);
        if (!observation?.trim()) {
          await this.assertNoSimilarProductInBase(item.descriptionShort);
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
        if (!item.measureUnitId) {
          throw new BadRequestException('Unidade de medida é obrigatória em todos os itens.');
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
      const rows = await this.prisma.$queryRaw<{ ncm: string; usage_count: bigint }[]>`
        SELECT p.ncm_code AS ncm, COUNT(*)::bigint AS usage_count
        FROM products p
        WHERE p.active = true
          AND p.ncm_code IS NOT NULL
          AND similarity(p.description_short, ${item.descriptionShort}) > 0.2
        GROUP BY p.ncm_code
        ORDER BY usage_count DESC, similarity(MAX(p.description_short), ${item.descriptionShort}) DESC
        LIMIT 5
      `;
      if (!rows.length) continue;
      await this.prisma.ncmSuggestion.createMany({
        data: rows.map((row, rank) => ({
          requestItemId: item.id,
          ncm: row.ncm,
          score: Math.max(0.3, 0.92 - rank * 0.12),
          usageCount: Number(row.usage_count),
          rank: rank + 1,
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
    await this.assertFamilyExists(dto.familyId);
    const requestType = dto.type ?? RequestType.INCLUSAO;
    this.assertObservation(dto.observation, requestType);
    const items = this.normalizeItemInput(dto.items);
    const target = this.resolveTargetStage(dto);
    const strict = target === 'APROVADOR';
    await this.validateItems(items, hotelIds, strict, dto.type ?? RequestType.INCLUSAO, dto.observation);

    const now = new Date();
    const state =
      target === 'APROVADOR' ? RequestState.APROVADOR : RequestState.SOLICITANTE;
    const stageMessage =
      dto.observation?.trim() ||
      (target === 'APROVADOR'
        ? 'Rascunho enviado direto ao aprovador'
        : 'Rascunho salvo na caixa do solicitante');

    const request = await this.prisma.request.create({
      data: {
        requesterId: userId,
        hotelId: hotelIds[0],
        familyId: dto.familyId,
        type: requestType,
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
                    stage: RequestState.APROVADOR,
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

    if (target === 'APROVADOR') await this.seedNcmSuggestions(request.id);
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
    const canEdit =
      role === UserRole.ADMIN ||
      (existing.requesterId === userId && requesterEditable.has(existing.state)) ||
      (role === UserRole.APROVADOR && existing.state === RequestState.APROVADOR);
    if (!canEdit) {
      throw new ForbiddenException('Sem permissão para editar esta solicitação.');
    }
    if (!EDITABLE_STATES.includes(existing.state)) {
      throw new BadRequestException(
        'Só é possível editar solicitações nas etapas editáveis do fluxo.',
      );
    }

    const isApproverEdit =
      existing.state === RequestState.APROVADOR &&
      (role === UserRole.APROVADOR || role === UserRole.ADMIN);
    const target = isApproverEdit ? 'APROVADOR' : this.resolveTargetStage(dto);
    const strict = target === 'APROVADOR';
    const items = dto.items ? this.normalizeItemInput(dto.items) : undefined;
    const hotelIds = dto.hotelIds?.length || dto.hotelId
      ? this.resolveHotelIds({ hotelIds: dto.hotelIds, hotelId: dto.hotelId ?? existing.hotelId })
      : (await this.prisma.requestHotel.findMany({ where: { requestId: id } })).map((h) => h.hotelId);
    if (dto.hotelIds?.length || dto.hotelId) {
      await this.validateHotels(hotelIds);
    }
    if (dto.familyId) await this.assertFamilyExists(dto.familyId);
    if (items) {
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
    const nextState = isApproverEdit
      ? RequestState.APROVADOR
      : target === 'APROVADOR'
        ? RequestState.APROVADOR
        : RequestState.SOLICITANTE;
    const editNote = dto.editNote?.trim();
    const stageMessage =
      editNote ||
      (dto.observation !== undefined ? dto.observation : existing.observation)?.trim() ||
      (target === 'APROVADOR'
        ? 'Rascunho enviado direto ao aprovador'
        : 'Rascunho salvo na caixa do solicitante');

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
          ...(dto.observation !== undefined
            ? { observation: dto.observation.trim() || null }
            : {}),
          ...(dto.requestDescription !== undefined
            ? { requestDescription: dto.requestDescription.trim().toUpperCase() || null }
            : {}),
          state: nextState,
          submittedAt: existing.submittedAt ?? now,
          expiresAt: null,
        },
      });

      if (target === 'APROVADOR' && !isApproverEdit) {
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
            stage: RequestState.APROVADOR,
            userId,
            startedAt: now,
            message: null,
          },
        });
      } else if (
        items ||
        dto.observation !== undefined ||
        dto.requestDescription !== undefined ||
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
      } else if (existing.state !== RequestState.SOLICITANTE && !isApproverEdit) {
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

    if (target === 'APROVADOR') {
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
   * Aprovador devolve solicitação ao solicitante — reinicia timer SLA na caixa.
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
    if (request.state !== RequestState.APROVADOR) {
      throw new BadRequestException(
        'Só é possível devolver solicitações na etapa Aprovador.',
      );
    }
    const role = await this.resolveUserRole(userId);
    if (role !== UserRole.ADMIN && role !== UserRole.APROVADOR) {
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
   * Solicitante revisa a caixa e envia ao aprovador — exige comentário de conclusão da etapa.
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

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.requestStage.updateMany({
        where: { requestId, finishedAt: null },
        data: { finishedAt: now, userId, message: trimmed },
      });
      await tx.request.update({
        where: { id: requestId },
        data: { state: RequestState.APROVADOR },
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

  private requestItemInclude() {
    return {
      measureUnit: { select: { id: true, code: true, name: true } },
      costCenter: { select: { id: true, code: true, name: true } },
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
        family: { include: { subgroup: { include: { group: true } } } },
        hotels: { include: { hotel: true } },
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            ...this.requestItemInclude(),
            links: { orderBy: { sortOrder: 'asc' } },
            ncmSuggestions: { orderBy: { rank: 'asc' } },
          },
        },
        stages: { orderBy: { startedAt: 'asc' }, include: { user: { select: { name: true } } } },
      },
    });
    if (!request) throw new NotFoundException('Solicitação não encontrada');
    return request;
  }

  async confirmNcm(itemId: string, ncm: string, userId: string) {
    const item = await this.prisma.requestItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item não encontrado');

    return this.prisma.requestItem.update({
      where: { id: itemId },
      data: { ncmCode: ncm, ncmConfirmed: true },
    });
  }

  /**
   * Aprovador finaliza (COMPLIANCE previsto — por enquanto encerra direto).
   * Promove itens aprovados para a base de produtos (`products` + `product_hotels`).
   */
  async approve(
    requestId: string,
    userId: string,
    itemNcms: { itemId: string; ncm: string }[],
    message?: string,
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
      if (ncm) ncmByItem.set(item.id, ncm);
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await this.promoteApprovedRequestToBase(tx, request, userId, now, ncmByItem);

      await tx.requestStage.updateMany({
        where: { requestId, finishedAt: null },
        data: { finishedAt: now, userId, message: trimmed },
      });
      await tx.requestStage.create({
        data: {
          requestId,
          stage: RequestState.ENCERRADO,
          userId,
          startedAt: now,
          finishedAt: now,
          message: trimmed,
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
      items: {
        id: string;
        productId: string | null;
        descriptionShort: string;
        descriptionLong: string | null;
        measureUnitId: string | null;
        costCenterId: string | null;
        source: ProductSource;
        itemValue: Prisma.Decimal | null;
        purchaseQtyTotal: Prisma.Decimal | null;
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

      if (!item.measureUnitId) {
        throw new BadRequestException(
          `Item "${item.descriptionShort}": unidade de medida obrigatória para cadastro na base.`,
        );
      }
      if (!item.descriptionLong?.trim()) {
        throw new BadRequestException(
          `Item "${item.descriptionShort}": descrição longa obrigatória para cadastro na base.`,
        );
      }

      const ncm = ncmByItem.get(item.id) ?? '';
      const productFields = {
        descriptionShort: item.descriptionShort.trim().toUpperCase(),
        descriptionLong: item.descriptionLong!.trim().toUpperCase(),
        familyId: request.familyId,
        measureUnitId: item.measureUnitId,
        source: item.source,
        legacyCode: item.legacyCode?.trim() || null,
        law116: item.law116?.trim() || null,
        productLink: item.productLink?.trim() || null,
        notes: item.itemObservation?.trim() || null,
        itemValue: item.itemValue,
        purchaseQtyTotal: item.purchaseQtyTotal,
        ncmCode: ncm || null,
        ncmConfirmedById: ncm ? userId : null,
        ncmConfirmedAt: ncm ? now : null,
        active: true,
        blockState: ProductBlockState.NONE,
      };

      let productId: string;

      if (item.productId) {
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
        productId = item.productId;
      } else {
        if (isExistingProductRequestType(request.type)) {
          throw new BadRequestException(
            `Solicitação "${item.descriptionShort}": vincule o produto existente na base.`,
          );
        }
        const unifiedCode = await this.resolveUnifiedCodeForNewProduct(tx, item, request.familyId);
        const created = await tx.product.create({
          data: { ...productFields, unifiedCode },
        });
        productId = created.id;
      }

      await tx.productLink.deleteMany({ where: { productId } });
      const itemLinks = await tx.requestItemLink.findMany({
        where: { requestItemId: item.id },
        orderBy: { sortOrder: 'asc' },
      });
      if (itemLinks.length) {
        await tx.productLink.createMany({
          data: itemLinks.map((link, sortOrder) => ({
            productId,
            url: link.url,
            sortOrder,
          })),
        });
      }

      await tx.productHotel.deleteMany({ where: { productId } });
      const hotelRows = await this.buildProductHotelRows(tx, hotelIds, item.costCenterId);
      if (hotelRows.length) {
        await tx.productHotel.createMany({
          data: hotelRows.map((row) => ({
            productId,
            hotelId: row.hotelId,
            costCenterId: row.costCenterId,
          })),
        });
      }

      await tx.requestItem.update({
        where: { id: item.id },
        data: { productId, ncmCode: ncm || null, ncmConfirmed: Boolean(ncm) },
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
    const prefix = (family?.code ?? '000000').replace(/\D/g, '').slice(0, 6);
    const baseCount = await tx.product.count({ where: { familyId } });

    for (let attempt = 0; attempt < 50; attempt++) {
      const candidate = `${prefix}${String(baseCount + 1 + attempt).padStart(3, '0')}`;
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
