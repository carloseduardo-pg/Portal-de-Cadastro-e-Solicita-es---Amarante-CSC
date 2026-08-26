import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

/**
 * Shape tipado do `.env` da API.
 * Secrets JWT fracos (`change-in-prod`) são bloqueados em production.
 */
export class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT!: number;

  @IsString()
  @IsNotEmpty()
  CORS_ORIGIN!: string;

  @IsIn(['development', 'production', 'test'])
  NODE_ENV!: 'development' | 'production' | 'test';

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRES?: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES?: string;

  /**
   * Se true, AuthService cria admin@amarante.local no boot.
   * Default false — obrigatório true só em dev local consciente.
   */
  @IsBoolean()
  @IsOptional()
  SEED_DEMO_USER_ON_BOOT?: boolean;
}

function parseBool(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string' && typeof value !== 'number') return fallback;
  const s = String(value).toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(s)) return true;
  if (['0', 'false', 'no', 'off'].includes(s)) return false;
  return fallback;
}

/**
 * Valida e normaliza env no boot do Nest (ConfigModule.validate).
 * Falha cedo com mensagem agregada se alguma var obrigatória faltar.
 */
export function validateEnv(config: Record<string, unknown>) {
  const nodeEnv = (config.NODE_ENV as string) || 'development';
  const normalized = {
    ...config,
    PORT: config.PORT ? Number(config.PORT) : 3000,
    NODE_ENV: nodeEnv,
    CORS_ORIGIN: config.CORS_ORIGIN || 'http://localhost:5180,http://127.0.0.1:5180',
    JWT_ACCESS_EXPIRES: config.JWT_ACCESS_EXPIRES || '15m',
    JWT_REFRESH_EXPIRES: config.JWT_REFRESH_EXPIRES || '7d',
    // default false (seguro em prod/template); dev local seta true no .env
    SEED_DEMO_USER_ON_BOOT: parseBool(config.SEED_DEMO_USER_ON_BOOT, false),
  };

  const validated = plainToInstance(EnvironmentVariables, normalized, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const messages = errors
      .map((e) => Object.values(e.constraints || {}).join(', '))
      .join('; ');
    throw new Error(`Config inválida (.env): ${messages}`);
  }

  const access = validated.JWT_ACCESS_SECRET;
  const refresh = validated.JWT_REFRESH_SECRET;
  if (access.includes('change-in-prod') || refresh.includes('change-in-prod')) {
    if (validated.NODE_ENV === 'production') {
      throw new Error('Substitua os secrets JWT antes de produção');
    }
    console.warn(
      '[segurança] JWT secrets ainda são de desenvolvimento — troque em produção',
    );
  }

  return validated;
}
