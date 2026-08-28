import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { parsePage } from '../common/pagination';
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
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.catalog.families({ search, ...parsePage(page, pageSize) });
  }

  @Get('families/:id/attributes')
  familyAttributes(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.familyAttributes(id);
  }

  @Get('groups')
  groups(
    @Query('subgroup_id') subgroupId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.catalog.groups({ subgroupId, ...parsePage(page, pageSize) });
  }

  @Get('subgroups')
  subgroups(
    @Query('family_id') familyId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.catalog.subgroups({ familyId, ...parsePage(page, pageSize) });
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
