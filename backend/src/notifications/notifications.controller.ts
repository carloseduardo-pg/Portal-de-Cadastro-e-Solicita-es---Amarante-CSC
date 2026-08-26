import { Controller, Get, Param, ParseUUIDPipe, Patch, Req } from '@nestjs/common';
import type { Request } from 'express';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  findMine(@Req() req: Request & { user?: { sub: string } }) {
    return this.notifications.findByUser(req.user?.sub ?? '');
  }

  @Get('count')
  count(@Req() req: Request & { user?: { sub: string } }) {
    return this.notifications.countUnread(req.user?.sub ?? '');
  }

  @Patch('read-all')
  markAll(@Req() req: Request & { user?: { sub: string } }) {
    return this.notifications.markAllRead(req.user?.sub ?? '');
  }

  @Patch(':id/read')
  markOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user?: { sub: string } },
  ) {
    return this.notifications.markRead(id, req.user?.sub ?? '');
  }
}
