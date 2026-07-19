import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(
    @CurrentUser('id') clerkId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.findAll(clerkId, Number(page) || 1, Number(limit) || 20);
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser('id') clerkId: string) {
    return this.notificationsService.getUnreadCount(clerkId);
  }

  @Patch(':id/read')
  async markAsRead(
    @CurrentUser('id') clerkId: string,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(clerkId, id);
  }

  @Patch('read-all')
  async markAllAsRead(@CurrentUser('id') clerkId: string) {
    return this.notificationsService.markAllAsRead(clerkId);
  }
}
