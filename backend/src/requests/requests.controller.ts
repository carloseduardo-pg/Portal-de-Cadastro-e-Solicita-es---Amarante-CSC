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
import { parsePage } from '../common/pagination';
import { CreateRequestDto, UpdateRequestDto } from './dto/create-request.dto';
import { RequestsService } from './requests.service';

@Controller('requests')
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
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRequestDto,
    @Req() req: Request & { user?: { id: string } },
  ) {
    return this.requests.update(id, dto, req.user?.id ?? '');
  }

  @Post(':id/approve')
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { items?: { itemId: string; ncm: string }[]; message?: string },
    @Req() req: Request & { user?: { id: string } },
  ) {
    return this.requests.approve(id, req.user?.id ?? '', body.items ?? [], body.message);
  }

  @Post(':id/send-to-approver')
  sendToApprover(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { message?: string },
    @Req() req: Request & { user?: { id: string } },
  ) {
    return this.requests.sendToApprover(id, req.user?.id ?? '', body.message ?? '');
  }

  @Post(':id/submit')
  submit(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user?: { id: string } },
  ) {
    return this.requests.submit(id, req.user?.id ?? '');
  }
}
