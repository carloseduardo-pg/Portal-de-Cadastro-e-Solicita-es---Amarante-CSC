import {
  Injectable,
  UnauthorizedException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

const SEED_EMAIL = 'admin@amarante.local';
const SEED_PASSWORD = 'amarante123';

/** Login, refresh e perfil — tokens só via cookies no controller. */
@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Cria usuário seed local só se `SEED_DEMO_USER_ON_BOOT=true`.
   * Default false evita credencial demo em clones/templates esquecidos.
   */
  async onModuleInit() {
    if (!this.config.get<boolean>('SEED_DEMO_USER_ON_BOOT')) {
      return;
    }
    const existing = await this.prisma.user.findUnique({
      where: { email: SEED_EMAIL },
    });
    if (!existing) {
      const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
      await this.prisma.user.create({
        data: {
          email: SEED_EMAIL,
          name: 'Administrador Amarante',
          passwordHash,
          role: 'ADMIN',
        },
      });
    }
  }

  /**
   * Valida e-mail/senha; rejeita usuário inativo com a mesma mensagem
   * de credencial inválida (não vaza existência).
   */
  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    return user;
  }

  private accessExpires(): StringValue {
    return (process.env.JWT_ACCESS_EXPIRES || '15m') as StringValue;
  }

  private refreshExpires(): StringValue {
    return (process.env.JWT_REFRESH_EXPIRES || '7d') as StringValue;
  }

  /** Emite access + refresh JWT; o controller grava nos cookies httpOnly. */
  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);
    const payload = { sub: user.id, email: user.email };
    const accessSecret = process.env.JWT_ACCESS_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!accessSecret || !refreshSecret) {
      throw new Error('JWT secrets não configurados');
    }
    const accessToken = await this.jwt.signAsync(payload, {
      secret: accessSecret,
      expiresIn: this.accessExpires(),
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: refreshSecret,
      expiresIn: this.refreshExpires(),
    });
    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  /**
   * Renova o par de tokens a partir do refresh cookie.
   * Revalida se o user ainda está ativo no banco.
   */
  async refresh(refreshToken: string) {
    try {
      const refreshSecret = process.env.JWT_REFRESH_SECRET;
      const accessSecret = process.env.JWT_ACCESS_SECRET;
      if (!refreshSecret || !accessSecret) {
        throw new UnauthorizedException('Sessão inválida');
      }
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        email: string;
      }>(refreshToken, { secret: refreshSecret });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user || !user.active) {
        throw new UnauthorizedException();
      }
      const nextPayload = { sub: user.id, email: user.email };
      const accessToken = await this.jwt.signAsync(nextPayload, {
        secret: accessSecret,
        expiresIn: this.accessExpires(),
      });
      const newRefresh = await this.jwt.signAsync(nextPayload, {
        secret: refreshSecret,
        expiresIn: this.refreshExpires(),
      });
      return {
        accessToken,
        refreshToken: newRefresh,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      };
    } catch {
      throw new UnauthorizedException('Sessão inválida');
    }
  }

  /** Perfil seguro para o FE (sem passwordHash). */
  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.active) {
      throw new UnauthorizedException();
    }
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }
}
