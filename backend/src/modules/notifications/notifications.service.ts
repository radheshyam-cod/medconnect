import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationDto } from './dto/notifications.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async getInternalUserId(clerkId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('User not found');
    return user.id;
  }

  async findAll(clerkId: string, page = 1, limit = 20) {
    const userId = await this.getInternalUserId(clerkId);
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      data: notifications.map((n) => this.toDto(n)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUnreadCount(clerkId: string) {
    const userId = await this.getInternalUserId(clerkId);
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markAsRead(clerkId: string, id: string) {
    const userId = await this.getInternalUserId(clerkId);
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    await this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true };
  }

  async markAllAsRead(clerkId: string) {
    const userId = await this.getInternalUserId(clerkId);
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true };
  }

  private toDto(n: any): NotificationDto {
    return {
      id: n.id,
      title: n.title,
      body: n.body,
      type: n.type,
      resourceType: n.resourceType ?? undefined,
      resourceId: n.resourceId ?? undefined,
      isRead: n.isRead,
      readAt: n.readAt ?? undefined,
      createdAt: n.createdAt,
    };
  }
}
