import { SetMetadata } from '@nestjs/common';

/** Metadata key lida pelo JwtAuthGuard para pular autenticação. */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca rota/controller como pública (sem JWT).
 * Usar só em health, login, refresh e logout.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
