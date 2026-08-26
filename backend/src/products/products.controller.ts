import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { parsePage } from '../common/pagination';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get('search')
  search(
    @Query('q') q = '',
    @Query('hotel_id') hotelId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.products.search({
      q,
      hotelId,
      ...parsePage(page, pageSize),
    });
  }

  @Get('base')
  findBase(
    @Query('search') search?: string,
    @Query('hotel') hotelCode?: string,
    @Query('active') active?: string,
    @Query('family_id') familyId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.products.findBase({
      search,
      hotelCode,
      active,
      familyId,
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
}
