import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId?: string, unreadOnly = false, page = 1, limit = 30) {
    const skip = (page - 1) * limit;
    const where = {
      ...(userId ? { OR: [{ userId }, { userId: null }] } : {}),
      ...(unreadOnly && { isRead: false }),
    };

    const [data, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { ...where, isRead: false } }),
    ]);

    return { data, total, unread, page, limit };
  }

  async markRead(id: string) {
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async create(dto: {
    type: NotificationType;
    title: string;
    message: string;
    userId?: string;
    data?: Record<string, unknown>;
  }) {
    return this.prisma.notification.create({ data: dto as any });
  }

  async createSystemAlert(type: NotificationType, title: string, message: string, data?: Record<string, unknown>) {
    return this.prisma.notification.create({
      data: { type, title, message, data: data as any },
    });
  }
}
