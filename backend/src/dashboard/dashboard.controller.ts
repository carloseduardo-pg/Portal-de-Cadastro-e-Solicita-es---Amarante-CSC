import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

/** Endpoint de summary da Home. */
@ApiTags('dashboard')
@ApiCookieAuth('access_token')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('summary')
  summary() {
    return this.service.summaryProducts();
  }

  @Get('products')
  productsSummary() {
    return this.service.summaryProducts();
  }
}
