import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { parseCatalogPage, parsePage } from '../common/pagination';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('hotels')
  hotels() {
    return this.catalog.hotels();
  }

  @Get('families')
  families(
    @Query('search') search?: string,
    @Query('item_kind') itemKind?: 'CONSUMPTION' | 'FIXED_ASSET',
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.catalog.families({
      search,
      itemKind,
      ...parseCatalogPage(page, pageSize),
    });
  }

  @Get('families/:id/attributes')
  familyAttributes(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.familyAttributes(id);
  }

  @Get('groups')
  groups(
    @Query('search') search?: string,
    @Query('subgroup_id') subgroupId?: string,
    @Query('item_kind') itemKind?: 'CONSUMPTION' | 'FIXED_ASSET',
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.catalog.groups({
      search,
      subgroupId,
      itemKind,
      ...parseCatalogPage(page, pageSize),
    });
  }

  @Get('subgroups')
  subgroups(
    @Query('search') search?: string,
    @Query('family_id') familyId?: string,
    @Query('item_kind') itemKind?: 'CONSUMPTION' | 'FIXED_ASSET',
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.catalog.subgroups({
      search,
      familyId,
      itemKind,
      ...parseCatalogPage(page, pageSize),
    });
  }

  @Get('measure-units')
  measureUnits(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.catalog.measureUnits(parsePage(page, pageSize));
  }

  @Get('cost-centers')
  costCenters(@Query('hotel_id') hotelId?: string, @Query('hotel_ids') hotelIds?: string) {
    return this.catalog.costCenters(hotelId, hotelIds);
  }

  @Get('warehouses')
  warehouses(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.catalog.warehouses(parsePage(page, pageSize));
  }
}
