import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

interface CreateAuditLogDto {
  actorId?: string;
  targetUserId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(dto: CreateAuditLogDto) {
    return this.prisma.auditLog.create({
      data: {
        actorId: dto.actorId,
        targetUserId: dto.targetUserId,
        action: dto.action as AuditAction,
        resource: dto.resource,
        resourceId: dto.resourceId,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        beforeData: dto.beforeData as object,
        afterData: dto.afterData as object,
        metadata: dto.metadata as object,
      },
    });
  }

  async findAll(filters: {
    actorId?: string;
    action?: AuditAction;
    resource?: string;
    fromDate?: Date;
    toDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 200);
    const skip = (page - 1) * limit;

    const where = {
      ...(filters.actorId && { actorId: filters.actorId }),
      ...(filters.action && { action: filters.action }),
      ...(filters.resource && { resource: filters.resource }),
      ...(filters.fromDate || filters.toDate
        ? {
            createdAt: {
              ...(filters.fromDate && { gte: filters.fromDate }),
              ...(filters.toDate && { lte: filters.toDate }),
            },
          }
        : {}),
    };

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data: logs, total, page, limit };
  }
}
