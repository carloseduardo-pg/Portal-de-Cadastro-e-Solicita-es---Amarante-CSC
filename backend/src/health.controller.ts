import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from './common/public.decorator';

/** Healthcheck mínimo da API Amarante (sem auth / sem throttle). */
@ApiTags('health')
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Healthcheck (sem auth / sem throttle)' })
  check() {
    return { status: 'ok', service: 'amarante-api' };
  }
}
