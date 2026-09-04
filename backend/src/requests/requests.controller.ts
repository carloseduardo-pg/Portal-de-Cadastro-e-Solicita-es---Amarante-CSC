import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { UserRole } from '@prisma/client';
import { RequireCap } from '../auth/require-cap.decorator';
import { parsePage } from '../common/pagination';
import { CreateRequestDto, UpdateRequestDto } from './dto/create-request.dto';
import { ReclassifyRequestDto } from './dto/reclassify-request.dto';
import { RequestsService } from './requests.service';

@Controller('requests')
@RequireCap('products.module')
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Get('summary')
  summary(@Req() req: Request & { user?: { id: string } }) {
    return this.requests.summary(req.user?.id);
  }

  @Get('queue')
  queue(
    @Req() req: Request & { user?: { id: string } },
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('items') itemsMode?: string,
    @Query('stage') stage?: string,
    @Query('family_ids') familyIds?: string,
    @Query('hotel_ids') hotelIds?: string,
    @Query('requester_ids') requesterIds?: string,
    @Query('operator_ids') operatorIds?: string,
    @Query('operator_stage') operatorStage?: string,
    @Query('sla') sla?: string,
    @Query('submitted_from') submittedFrom?: string,
    @Query('submitted_to') submittedTo?: string,
    @Query('closed_from') closedFrom?: string,
    @Query('closed_to') closedTo?: string,
    @Query('mine') mine?: string,
    @Query('bucket') bucket?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const filters = this.requests.parseRegistryFilters({
      search,
      type,
      items: itemsMode,
      stage,
      family_ids: familyIds,
      hotel_ids: hotelIds,
      requester_ids: requesterIds,
      operator_ids: operatorIds,
      operator_stage: operatorStage,
      sla,
      submitted_from: submittedFrom,
      submitted_to: submittedTo,
      closed_from: closedFrom,
      closed_to: closedTo,
      mine,
      bucket,
    });
    return this.requests.findRegistry({
      userId: req.user?.id ?? '',
      ...filters,
      ...parsePage(page, pageSize),
    });
  }

  /** Caixa de entrada — visão por etapa (sem encerradas). */
  @Get('inbox')
  inbox(
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('family_ids') familyIds?: string,
    @Query('hotel_ids') hotelIds?: string,
    @Query('requester_ids') requesterIds?: string,
    @Req() req?: Request & { user?: { id: string; role?: UserRole } },
  ) {
    const filters = this.requests.parseKanbanFilters({
      family_ids: familyIds,
      hotel_ids: hotelIds,
      requester_ids: requesterIds,
      type,
    });
    return this.requests.findInboxBoard({
      search,
      userId: req?.user?.id ?? '',
      role: req?.user?.role,
      ...filters,
    });
  }

  @Get('kanban')
  kanban(
    @Query('mine') mine?: string,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('family_ids') familyIds?: string,
    @Query('hotel_ids') hotelIds?: string,
    @Query('requester_ids') requesterIds?: string,
    @Req() req?: Request & { user?: { id: string } },
  ) {
    const filters = this.requests.parseKanbanFilters({
      family_ids: familyIds,
      hotel_ids: hotelIds,
      requester_ids: requesterIds,
      type,
    });
    return this.requests.findKanban({
      mine,
      search,
      userId: req?.user?.id,
      ...filters,
    });
  }

  @Post()
  @RequireCap('products.request.create')
  create(
    @Body() dto: CreateRequestDto,
    @Req() req: Request & { user?: { id: string } },
  ) {
    return this.requests.create(dto, req.user?.id ?? '');
  }

  @Get()
  findAll(
    @Query('state') state?: string,
    @Query('mine') mine?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Req() req?: Request & { user?: { id: string } },
  ) {
    return this.requests.findAll({
      state,
      mine,
      search,
      userId: req?.user?.id,
      ...parsePage(page, pageSize),
    });
  }

  @Patch('items/:itemId/ncm')
  @RequireCap('products.request.approve.admin', 'products.request.approve.imobilizado')
  confirmNcm(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body('ncm') ncm: string,
    @Req() req: Request & { user?: { id: string } },
  ) {
    return this.requests.confirmNcm(itemId, ncm, req.user?.id ?? '');
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.requests.findOne(id);
  }

  @Patch(':id')
  @RequireCap(
    'products.request.create',
    'products.request.approve.admin',
    'products.request.approve.imobilizado',
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRequestDto,
    @Req() req: Request & { user?: { id: string } },
  ) {
    return this.requests.update(id, dto, req.user?.id ?? '');
  }

  @Post(':id/approve')
  @RequireCap('products.request.approve.admin')
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: {
      items?: { itemId: string; ncm: string }[];
      message?: string;
      approvedItemIds?: string[];
      /** Itens rejeitados a clonar em nova solicitação (rascunho) do solicitante. */
      returnRejectedItemIds?: string[];
    },
    @Req() req: Request & { user?: { id: string } },
  ) {
    return this.requests.approve(
      id,
      req.user?.id ?? '',
      body.items ?? [],
      body.message,
      body.approvedItemIds,
      body.returnRejectedItemIds,
    );
  }

  @Post(':id/return-to-requester')
  @RequireCap('products.request.return')
  returnToRequester(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { message?: string },
    @Req() req: Request & { user?: { id: string } },
  ) {
    return this.requests.returnToRequester(
      id,
      req.user?.id ?? '',
      body.message ?? '',
    );
  }

  /**
   * Encerrar sem promover à base (REPROVADO).
   * Solicitante: motivo opcional. Aprovadores: motivo + observação obrigatórios.
   */
  @Post(':id/close')
  @RequireCap('products.request.close')
  close(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reasonCode?: string; observation?: string },
    @Req() req: Request & { user?: { id: string } },
  ) {
    return this.requests.closeRequest(id, req.user?.id ?? '', body ?? {});
  }

  @Post(':id/send-to-approver')
  @RequireCap('products.request.create')
  sendToApprover(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { message?: string },
    @Req() req: Request & { user?: { id: string } },
  ) {
    return this.requests.sendToApprover(
      id,
      req.user?.id ?? '',
      body.message ?? '',
    );
  }

  /** Imobilizado → Aprovador de cadastro (UC) ou registra na base AF e encerra. */
  @Post(':id/send-from-imobilizado')
  @RequireCap('products.request.approve.imobilizado')
  sendFromImobilizado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: {
      message?: string;
      items?: { itemId: string; ncm: string }[];
      targetFamilyId?: string;
    },
    @Req() req: Request & { user?: { id: string } },
  ) {
    return this.requests.sendFromImobilizadoToApprover(
      id,
      req.user?.id ?? '',
      body.message ?? '',
      body.items ?? [],
      body.targetFamilyId,
    );
  }

  /** Imobilizado classifica o lote como Ativo Fixo (permanece na etapa). */
  @Post(':id/mark-fixed-asset')
  @RequireCap('products.request.approve.imobilizado')
  markFixedAsset(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { message?: string },
    @Req() req: Request & { user?: { id: string } },
  ) {
    return this.requests.markAsFixedAsset(
      id,
      req.user?.id ?? '',
      body.message ?? '',
    );
  }

  /** Aprovador → reclassifica lote como Ativo Fixo (etapa Imobilizado). */
  @Post(':id/reclassify-fixed-asset')
  @RequireCap('products.request.approve.admin')
  reclassifyFixedAsset(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReclassifyRequestDto,
    @Req() req: Request & { user?: { id: string } },
  ) {
    return this.requests.reclassifyAsFixedAsset(id, req.user?.id ?? '', dto);
  }

  /** Imobilizado → reclassifica lote como Uso e Consumo (etapa Aprovador). */
  @Post(':id/reclassify-consumption')
  @RequireCap('products.request.approve.imobilizado')
  reclassifyConsumption(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReclassifyRequestDto,
    @Req() req: Request & { user?: { id: string } },
  ) {
    return this.requests.reclassifyAsConsumption(id, req.user?.id ?? '', dto);
  }

  @Post(':id/submit')
  @RequireCap('products.request.create')
  submit(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user?: { id: string } },
  ) {
    return this.requests.submit(id, req.user?.id ?? '');
  }
}
