import { SetMetadata } from '@nestjs/common';
import type { Capability } from './capabilities';

export const REQUIRE_CAP_KEY = 'requireCap';

/**
 * Exige ao menos uma das capacidades (OR).
 * Sem decorator, qualquer usuário autenticado passa (JwtAuthGuard já vale).
 */
export const RequireCap = (...caps: Capability[]) =>
  SetMetadata(REQUIRE_CAP_KEY, caps);
