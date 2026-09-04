import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { RequireCap } from '../auth/require-cap.decorator';
import { DashboardService } from './dashboard.service';

/** Endpoint de summary da Home. */
@ApiTags('dashboard')
@ApiCookieAuth('access_token')
@Controller('dashboard')
@RequireCap('products.module')
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
