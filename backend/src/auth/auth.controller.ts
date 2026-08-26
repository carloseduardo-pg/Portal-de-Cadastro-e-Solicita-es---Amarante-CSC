import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

const isProd = process.env.NODE_ENV === 'production';

type AuthedRequest = Request & { user: { id: string; email: string; name: string } };

/** Grava access/refresh como cookies httpOnly (nunca no body JSON). */
function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
) {
  const common = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
  };
  res.cookie('access_token', accessToken, {
    ...common,
    maxAge: 15 * 60 * 1000,
  });
  res.cookie('refresh_token', refreshToken, {
    ...common,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookies(res: Response) {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/' });
}

/** Endpoints de sessão; login/refresh/logout são @Public(). */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @ApiOperation({ summary: 'Login — grava cookies httpOnly access/refresh' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  /** Renova cookies a partir do refresh_token; rate limit 20/min. */
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.refresh_token as string | undefined;
    if (!token) {
      throw new UnauthorizedException('Refresh ausente');
    }
    const result = await this.auth.refresh(token);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  /** Limpa cookies; não invalida token no servidor (protótipo). */
  @Public()
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    clearAuthCookies(res);
    return { ok: true };
  }

  /** Perfil do usuário autenticado (exige JWT global). */
  @Get('me')
  me(@Req() req: AuthedRequest) {
    return this.auth.me(req.user.id);
  }
}
