import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { UserRole } from '@prisma/client';
import { RequireCap } from '../auth/require-cap.decorator';
import { parsePage } from '../common/pagination';
import { ProductsService } from './products.service';

@Controller('products')
@RequireCap('products.module')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  /**
   * Busca na base unificada por descrição (similaridade) ou por qualquer código.
   * `active_only=true` restringe a itens ativos (fluxo de bloqueio).
   */
  @Get('search')
  search(
    @Query('q') q = '',
    @Query('hotel_id') hotelId?: string,
    @Query('item_kind') itemKind?: 'CONSUMPTION' | 'FIXED_ASSET',
    @Query('active_only') activeOnly?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.products.search({
      q,
      hotelId,
      itemKind,
      activeOnly: activeOnly === 'true',
      ...parsePage(page, pageSize),
    });
  }

  /**
   * Contagem de produtos com descrição exatamente igual a `q`.
   * Query: `GET /products/exact-count?q=&item_kind=FIXED_ASSET`
   */
  @Get('exact-count')
  exactCount(
    @Query('q') q = '',
    @Query('item_kind') itemKind?: 'CONSUMPTION' | 'FIXED_ASSET',
  ) {
    return this.products.exactCount({ q, itemKind });
  }

  @Get('base')
  findBase(
    @Query('search') search?: string,
    @Query('hotel') hotelCode?: string,
    @Query('active') active?: string,
    @Query('family_id') familyId?: string,
    @Query('item_kind') itemKind?: 'CONSUMPTION' | 'FIXED_ASSET',
    @Query('sort') sort?: string,
    @Query('dir') dir?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.products.findBase({
      search,
      hotelCode,
      active,
      familyId,
      itemKind,
      sort,
      dir,
      ...parsePage(page, pageSize),
    });
  }

  @Get('inactive')
  findInactive(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.products.findInactive({
      search,
      ...parsePage(page, pageSize),
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.findOne(id);
  }

  /** Exclui cadastro do portal. Bloqueado para itens da base original SAP. */
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user?: { id: string; role?: UserRole } },
  ) {
    return this.products.removePortalProduct(id, req.user?.role);
  }
}
