import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import type { Capability } from './capabilities';
import { hasAnyCapability } from './capabilities';
import { REQUIRE_CAP_KEY } from './require-cap.decorator';

@Injectable()
export class CapabilitiesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Capability[]>(REQUIRE_CAP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) {
      return true;
    }
    const request = context.switchToHttp().getRequest<{
      user?: { role?: UserRole };
    }>();
    const role = request.user?.role;
    if (!hasAnyCapability(role, required)) {
      throw new ForbiddenException('Sem permissão para esta ação');
    }
    return true;
  }
}
