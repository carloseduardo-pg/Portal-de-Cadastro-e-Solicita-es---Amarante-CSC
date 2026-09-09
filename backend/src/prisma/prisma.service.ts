import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/** Resume seguro da DATABASE_URL (sem senha) para log de boot / erro. */
function databaseTargetSummary(rawUrl: string | undefined): string {
  if (!rawUrl?.trim()) return '(DATABASE_URL ausente)';
  try {
    const u = new URL(rawUrl);
    const db = u.pathname.replace(/^\//, '') || '(sem database)';
    return `${u.username || '(sem user)'}@${u.hostname}:${u.port || '5432'}/${db}`;
  } catch {
    return '(DATABASE_URL inválida)';
  }
}

/**
 * Cliente Prisma singleton injetável.
 * Conecta no boot e desconecta no shutdown do Nest.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    const target = databaseTargetSummary(process.env.DATABASE_URL);
    this.logger.log(`Conectando ao PostgreSQL: ${target}`);
    try {
      await this.$connect();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Falha ao conectar em ${target}. ` +
          'Confira DATABASE_URL em backend/.env (e alinhe com .env na raiz). ' +
          'A API usa o usuário da URL — não o POSTGRES_ADMIN_*.',
      );
      if (msg.includes('postgres') && msg.includes('Authentication failed')) {
        this.logger.error(
          'O usuário na URL é `postgres` (superuser). Em VPS o correto costuma ser o usuário/app da aplicação, com a senha certa.',
        );
      }
      throw err;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
