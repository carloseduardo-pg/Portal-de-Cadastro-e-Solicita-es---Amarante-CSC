import { BadRequestException, Injectable } from '@nestjs/common';
import { NotificationType, RequestState, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type InboxNotificationInput = {
  requestId: string;
  code: string;
  state: RequestState;
  /** Solicitante original — usado em devolução/aprovação. */
  requesterId?: string | null;
  summary?: string;
};

export type NotificationListStatus = 'unread' | 'read' | 'trash';

const notificationInclude = {
  request: {
    select: {
      id: true,
      code: true,
      state: true,
      requester: { select: { id: true, name: true, email: true } },
    },
  },
} as const;

/**
 * Notificações acionáveis ligadas à caixa de entrada.
 * Persistidas em `notifications`; sininho + central modal na UI.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private listWhere(userId: string, status: NotificationListStatus) {
    if (status === 'trash') {
      return { userId, trashedAt: { not: null } };
    }
    if (status === 'read') {
      return { userId, readAt: { not: null }, trashedAt: null };
    }
    return { userId, readAt: null, trashedAt: null };
  }

  /**
   * Lista notificações do usuário.
   * @param status `unread` | `read` | `trash`
   */
  findByUser(userId: string, status: NotificationListStatus = 'unread') {
    return this.prisma.notification.findMany({
      where: this.listWhere(userId, status),
      include: notificationInclude,
      orderBy: { createdAt: 'desc' },
      take: status === 'trash' ? 200 : 100,
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null, trashedAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId, trashedAt: null },
      data: { readAt: new Date() },
    });
  }

  async markUnread(id: string, userId: string) {
    const row = await this.prisma.notification.findFirst({
      where: { id, userId, trashedAt: null, readAt: { not: null } },
      select: { id: true },
    });
    if (!row) {
      throw new BadRequestException(
        'Só é possível marcar como não lida uma notificação já lida e fora da lixeira.',
      );
    }
    await this.prisma.notification.update({
      where: { id },
      data: { readAt: null },
    });
    return { ok: true };
  }

  /** Move uma notificação lida para a lixeira. */
  async trashOne(id: string, userId: string) {
    const row = await this.prisma.notification.findFirst({
      where: { id, userId, readAt: { not: null }, trashedAt: null },
      select: { id: true },
    });
    if (!row) {
      throw new BadRequestException(
        'Só notificações lidas podem ser arquivadas na lixeira.',
      );
    }
    await this.prisma.notification.update({
      where: { id },
      data: { trashedAt: new Date() },
    });
    return { ok: true };
  }

  /** Arquiva todas as lidas na lixeira. */
  async trashAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: { not: null }, trashedAt: null },
      data: { trashedAt: new Date() },
    });
    return { ok: true };
  }

  /** Esvazia a lixeira (exclusão permanente). */
  async emptyTrash(userId: string) {
    await this.prisma.notification.deleteMany({
      where: { userId, trashedAt: { not: null } },
    });
    return { ok: true };
  }

  /** Remove permanentemente um item que já está na lixeira. */
  async deleteTrashedOne(id: string, userId: string) {
    const row = await this.prisma.notification.findFirst({
      where: { id, userId, trashedAt: { not: null } },
      select: { id: true },
    });
    if (!row) {
      throw new BadRequestException(
        'Só é possível excluir permanentemente um item que está na lixeira.',
      );
    }
    await this.prisma.notification.delete({ where: { id } });
    return { ok: true };
  }

  /** Recupera um item da lixeira (volta para Lidas). */
  async restoreOne(id: string, userId: string) {
    const row = await this.prisma.notification.findFirst({
      where: { id, userId, trashedAt: { not: null } },
      select: { id: true },
    });
    if (!row) {
      throw new BadRequestException(
        'Só é possível recuperar um item que está na lixeira.',
      );
    }
    await this.prisma.notification.update({
      where: { id },
      data: { trashedAt: null },
    });
    return { ok: true };
  }

  /** Recupera todos os itens da lixeira (voltam para Lidas). */
  async restoreAll(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, trashedAt: { not: null } },
      data: { trashedAt: null },
    });
    return { ok: true };
  }

  countUnread(userId: string) {
    return this.prisma.notification.count({
      where: { userId, readAt: null, trashedAt: null },
    });
  }

  /**
   * Cria aviso na caixa do usuário (dedupe: 1 não-lida por user+request).
   */
  async notifyUser(params: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    linkUrl: string;
    requestId?: string;
  }) {
    if (!params.userId) return;
    if (params.requestId) {
      const existing = await this.prisma.notification.findFirst({
        where: {
          userId: params.userId,
          requestId: params.requestId,
          readAt: null,
          trashedAt: null,
        },
        select: { id: true },
      });
      if (existing) {
        await this.prisma.notification.update({
          where: { id: existing.id },
          data: {
            type: params.type,
            title: params.title,
            body: params.body,
            linkUrl: params.linkUrl,
            createdAt: new Date(),
          },
        });
        return;
      }
    }
    await this.prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        linkUrl: params.linkUrl,
        requestId: params.requestId,
      },
    });
  }

  /** Notifica todos os usuários ativos com o papel (fila compartilhada). */
  async notifyRole(
    role: UserRole,
    payload: Omit<Parameters<NotificationsService['notifyUser']>[0], 'userId'>,
  ) {
    const users = await this.prisma.user.findMany({
      where: { role, active: true },
      select: { id: true },
    });
    for (const u of users) {
      await this.notifyUser({ ...payload, userId: u.id });
    }
  }

  /**
   * Quando a solicitação entra numa etapa da caixa, avisa quem precisa agir.
   * ADMIN não é notificado em massa (evita ruído — usa a própria caixa).
   */
  async notifyInboxArrival(input: InboxNotificationInput) {
    const linkUrl = `/produtos/solicitacao/${input.requestId}`;
    const codeLabel = input.code ? `Solicitação ${input.code}` : 'Solicitação';
    const detail = input.summary?.trim() || 'Há um item na sua caixa de entrada.';

    switch (input.state) {
      case RequestState.IMOBILIZADO:
        await this.notifyRole(UserRole.APROVADOR_IMOBILIZADO, {
          type: NotificationType.GERAL,
          title: `${codeLabel} — Aprovador - Imobilizado`,
          body: detail,
          linkUrl,
          requestId: input.requestId,
        });
        break;
      case RequestState.APROVADOR:
        await this.notifyRole(UserRole.APROVADOR, {
          type: NotificationType.GERAL,
          title: `${codeLabel} — Aprovador - Administrativo`,
          body: detail,
          linkUrl,
          requestId: input.requestId,
        });
        break;
      case RequestState.RETORNO_SOLICITANTE:
        if (input.requesterId) {
          await this.notifyUser({
            userId: input.requesterId,
            type: NotificationType.DEVOLVIDA,
            title: `${codeLabel} — Devolvida`,
            body: detail,
            linkUrl,
            requestId: input.requestId,
          });
        }
        break;
      case RequestState.SOLICITANTE:
        if (input.requesterId) {
          await this.notifyUser({
            userId: input.requesterId,
            type: NotificationType.GERAL,
            title: `${codeLabel} — Na sua caixa`,
            body: detail,
            linkUrl,
            requestId: input.requestId,
          });
        }
        break;
      default:
        break;
    }
  }

  /** Aviso ao solicitante quando a solicitação é aprovada/encerrada positivamente. */
  async notifyRequesterApproved(input: {
    requestId: string;
    code: string;
    requesterId: string;
    summary?: string;
  }) {
    await this.notifyUser({
      userId: input.requesterId,
      type: NotificationType.APROVADA,
      title: `Solicitação ${input.code} — Aprovada`,
      body: input.summary?.trim() || 'Sua solicitação foi finalizada com aprovação.',
      linkUrl: `/produtos/solicitacao/${input.requestId}`,
      requestId: input.requestId,
    });
  }

  /** Marca como lidas as notificações da solicitação para o usuário (abriu o detalhe). */
  async markRequestReadForUser(requestId: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { requestId, userId, readAt: null, trashedAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true as const };
  }
}
