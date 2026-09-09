import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  NotificationListStatus,
  NotificationsService,
} from './notifications.service';

type AuthUser = { id: string };

function parseStatus(raw?: string): NotificationListStatus {
  if (raw === 'read' || raw === 'trash') return raw;
  return 'unread';
}

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  /** Lista por aba: `?status=unread|read|trash`. */
  @Get()
  findMine(
    @Req() req: Request & { user?: AuthUser },
    @Query('status') status?: string,
  ) {
    return this.notifications.findByUser(req.user?.id ?? '', parseStatus(status));
  }

  @Get('count')
  count(@Req() req: Request & { user?: AuthUser }) {
    return this.notifications.countUnread(req.user?.id ?? '');
  }

  @Patch('read-all')
  markAll(@Req() req: Request & { user?: AuthUser }) {
    return this.notifications.markAllRead(req.user?.id ?? '');
  }

  @Patch('trash-all-read')
  trashAllRead(@Req() req: Request & { user?: AuthUser }) {
    return this.notifications.trashAllRead(req.user?.id ?? '');
  }

  @Patch('trash/restore-all')
  restoreAll(@Req() req: Request & { user?: AuthUser }) {
    return this.notifications.restoreAll(req.user?.id ?? '');
  }

  @Delete('trash')
  emptyTrash(@Req() req: Request & { user?: AuthUser }) {
    return this.notifications.emptyTrash(req.user?.id ?? '');
  }

  @Delete(':id')
  deleteTrashedOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.notifications.deleteTrashedOne(id, req.user?.id ?? '');
  }

  @Patch('request/:requestId/read')
  markRequest(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.notifications.markRequestReadForUser(
      requestId,
      req.user?.id ?? '',
    );
  }

  @Patch(':id/read')
  markOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.notifications.markRead(id, req.user?.id ?? '');
  }

  @Patch(':id/unread')
  markUnread(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.notifications.markUnread(id, req.user?.id ?? '');
  }

  @Patch(':id/trash')
  trashOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.notifications.trashOne(id, req.user?.id ?? '');
  }

  @Patch(':id/restore')
  restoreOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.notifications.restoreOne(id, req.user?.id ?? '');
  }
}
