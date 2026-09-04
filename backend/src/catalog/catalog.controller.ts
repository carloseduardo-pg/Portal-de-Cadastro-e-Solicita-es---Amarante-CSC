import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RequireCap } from '../auth/require-cap.decorator';
import { parseCatalogPage, parsePage } from '../common/pagination';
import {
  CreateCostCenterDto,
  CreateFamilyDto,
  CreateGroupDto,
  CreateHotelDto,
  CreateMeasureUnitDto,
  CreateSubgroupDto,
  UpdateCostCenterDto,
  UpdateFamilyDto,
  UpdateGroupDto,
  UpdateHotelDto,
  UpdateMeasureUnitDto,
  UpdateSubgroupDto,
} from './dto/catalog-mutations.dto';
import { CatalogService } from './catalog.service';

@Controller('catalog')
@RequireCap('products.module')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('hotels')
  hotels(@Query('status') status?: 'active' | 'inactive' | 'all') {
    return this.catalog.hotels(status);
  }

  @Get('families')
  families(
    @Query('search') search?: string,
    @Query('item_kind') itemKind?: 'CONSUMPTION' | 'FIXED_ASSET',
    @Query('status') status?: 'active' | 'inactive' | 'all',
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.catalog.families({
      search,
      itemKind,
      status,
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
    @Query('status') status?: 'active' | 'inactive' | 'all',
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.catalog.groups({
      search,
      subgroupId,
      itemKind,
      status,
      ...parseCatalogPage(page, pageSize),
    });
  }

  @Get('subgroups')
  subgroups(
    @Query('search') search?: string,
    @Query('family_id') familyId?: string,
    @Query('item_kind') itemKind?: 'CONSUMPTION' | 'FIXED_ASSET',
    @Query('status') status?: 'active' | 'inactive' | 'all',
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.catalog.subgroups({
      search,
      familyId,
      itemKind,
      status,
      ...parseCatalogPage(page, pageSize),
    });
  }

  @Get('measure-units')
  measureUnits(
    @Query('status') status?: 'active' | 'inactive' | 'all',
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.catalog.measureUnits({ ...parseCatalogPage(page, pageSize), status });
  }

  @Get('cost-centers')
  costCenters(
    @Query('hotel_id') hotelId?: string,
    @Query('hotel_ids') hotelIds?: string,
    @Query('status') status?: 'active' | 'inactive' | 'all',
  ) {
    return this.catalog.costCenters(hotelId, hotelIds, status);
  }

  @Get('warehouses')
  warehouses(
    @Query('status') status?: 'active' | 'inactive' | 'all',
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.catalog.warehouses({ ...parsePage(page, pageSize), status });
  }

  @Post('families')
  @RequireCap('catalog.params')
  createFamily(@Body() body: CreateFamilyDto) {
    return this.catalog.createFamily(body);
  }

  @Post('subgroups')
  @RequireCap('catalog.params')
  createSubgroup(@Body() body: CreateSubgroupDto) {
    return this.catalog.createSubgroup(body);
  }

  @Post('groups')
  @RequireCap('catalog.params')
  createGroup(@Body() body: CreateGroupDto) {
    return this.catalog.createGroup(body);
  }

  @Post('cost-centers')
  @RequireCap('catalog.params')
  createCostCenter(@Body() body: CreateCostCenterDto) {
    return this.catalog.createCostCenter(body);
  }

  @Patch('families/:id')
  @RequireCap('catalog.params')
  updateFamily(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateFamilyDto) {
    return this.catalog.updateFamily(id, body);
  }

  @Delete('families/:id')
  @RequireCap('catalog.params')
  deactivateFamily(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.deactivateFamily(id);
  }

  @Patch('subgroups/:id')
  @RequireCap('catalog.params')
  updateSubgroup(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateSubgroupDto) {
    return this.catalog.updateSubgroup(id, body);
  }

  @Delete('subgroups/:id')
  @RequireCap('catalog.params')
  deactivateSubgroup(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.deactivateSubgroup(id);
  }

  @Patch('groups/:id')
  @RequireCap('catalog.params')
  updateGroup(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateGroupDto) {
    return this.catalog.updateGroup(id, body);
  }

  @Delete('groups/:id')
  @RequireCap('catalog.params')
  deactivateGroup(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.deactivateGroup(id);
  }

  @Patch('cost-centers/:code')
  @RequireCap('catalog.params')
  updateCostCenter(@Param('code') code: string, @Body() body: UpdateCostCenterDto) {
    return this.catalog.updateCostCenter(code, body);
  }

  @Delete('cost-centers/:code')
  @RequireCap('catalog.params')
  deactivateCostCenter(@Param('code') code: string) {
    return this.catalog.deactivateCostCenter(code);
  }

  @Post('hotels')
  @RequireCap('catalog.params')
  createHotel(@Body() body: CreateHotelDto) {
    return this.catalog.createHotel(body);
  }

  @Patch('hotels/:id')
  @RequireCap('catalog.params')
  updateHotel(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateHotelDto) {
    return this.catalog.updateHotel(id, body);
  }

  @Delete('hotels/:id')
  @RequireCap('catalog.params')
  deactivateHotel(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.deactivateHotel(id);
  }

  @Post('measure-units')
  @RequireCap('catalog.params')
  createMeasureUnit(@Body() body: CreateMeasureUnitDto) {
    return this.catalog.createMeasureUnit(body);
  }

  @Patch('measure-units/:id')
  @RequireCap('catalog.params')
  updateMeasureUnit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateMeasureUnitDto,
  ) {
    return this.catalog.updateMeasureUnit(id, body);
  }

  @Delete('measure-units/:id')
  @RequireCap('catalog.params')
  deactivateMeasureUnit(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.deactivateMeasureUnit(id);
  }
}
