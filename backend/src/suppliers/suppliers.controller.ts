import { Controller, Get, Param, ParseUUIDPipe, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { parsePage } from '../common/pagination';
import { SuppliersService } from './suppliers.service';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get('summary')
  summary() {
    return this.suppliers.summary();
  }

  @Get('base')
  findBase(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.suppliers.findBase({ search, ...parsePage(page, pageSize) });
  }

  @Get('inactive')
  findInactive(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.suppliers.findInactive(parsePage(page, pageSize));
  }

  @Get('requests')
  findRequests(
    @Query('state') state?: string,
    @Query('mine') mine?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Req() req?: Request & { user?: { id: string } },
  ) {
    return this.suppliers.findRequests({
      state,
      mine,
      userId: req?.user?.id,
      ...parsePage(page, pageSize),
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliers.findOne(id);
  }
}
