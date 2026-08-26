import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

/** Minimal Amarante access JWT payload. */
export type JwtPayload = {
  sub: string;
  email: string;
};

/** Reads `access_token` from the httpOnly cookie (Bearer is not the default flow). */
function cookieExtractor(req: Request): string | null {
  if (req?.cookies?.access_token) {
    return req.cookies.access_token as string;
  }
  return null;
}

/**
 * Passport `jwt` strategy: cookie + active user check in the database.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  /**
   * Rejects inactive/missing users and exposes `{ id, email, name }` on `req.user`.
   */
  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, active: true },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) {
      throw new UnauthorizedException('Usuário inválido ou inativo');
    }
    return user;
  }
}
