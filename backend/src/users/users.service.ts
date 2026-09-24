import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LoggerService } from '../logger/logger.service';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto, AssignRoleDto } from './dto/create-user.dto';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { Request } from 'express';
import { RoleName } from '@prisma/client';

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  isActive: true,
  isEmailVerified: true,
  lastLoginAt: true,
  lastLoginIp: true,
  createdAt: true,
  updatedAt: true,
  userRoles: {
    include: { role: { select: { name: true, displayName: true } } },
  },
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  async findAll(page = 1, limit = 20) {
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { deletedAt: null },
        select: USER_SELECT,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where: { deletedAt: null } }),
    ]);

    return { data: users, total, page, limit: take };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: USER_SELECT,
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(dto: CreateUserDto, actor: AuthenticatedUser, req: Request) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await this.hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    // Assign roles if provided
    if (dto.roles?.length) {
      await this.assignRolesToUser(user.id, dto.roles, actor.id);
    }

    await this.auditService.log({
      actorId: actor.id,
      targetUserId: user.id,
      action: 'CREATE',
      resource: 'users',
      resourceId: user.id,
      ipAddress: this.getIp(req),
      userAgent: req.headers['user-agent'],
      afterData: { email: user.email, roles: dto.roles },
    });

    return this.findOne(user.id);
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthenticatedUser, req: Request) {
    const user = await this.findOne(id);

    const updated = await this.prisma.user.update({
      where: { id },
      data: dto,
      select: USER_SELECT,
    });

    await this.auditService.log({
      actorId: actor.id,
      targetUserId: id,
      action: 'UPDATE',
      resource: 'users',
      resourceId: id,
      ipAddress: this.getIp(req),
      beforeData: { firstName: user.firstName, lastName: user.lastName, isActive: user.isActive },
      afterData: { ...dto },
    });

    return updated;
  }

  async softDelete(id: string, actor: AuthenticatedUser, req: Request) {
    const user = await this.findOne(id);

    // Prevent self-deletion
    if (id === actor.id) throw new ForbiddenException('Cannot delete own account');

    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    // Revoke all sessions
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    await this.auditService.log({
      actorId: actor.id,
      targetUserId: id,
      action: 'DELETE',
      resource: 'users',
      resourceId: id,
      ipAddress: this.getIp(req),
      beforeData: { email: user.email },
    });

    return { message: 'User deactivated successfully' };
  }

  async changePassword(id: string, dto: ChangePasswordDto, actor: AuthenticatedUser, req: Request) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundException('User not found');

    // Only the user themselves or super_admin can change password
    if (id !== actor.id && !actor.roles.includes('super_admin')) {
      throw new ForbiddenException('Not authorized to change this password');
    }

    const valid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const passwordHash = await this.hashPassword(dto.newPassword);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash, passwordChangedAt: new Date() },
    });

    // Revoke all refresh tokens to force re-login
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    await this.auditService.log({
      actorId: actor.id,
      targetUserId: id,
      action: 'PASSWORD_CHANGE',
      resource: 'users',
      resourceId: id,
      ipAddress: this.getIp(req),
    });

    return { message: 'Password changed successfully. Please login again.' };
  }

  async assignRole(userId: string, dto: AssignRoleDto, actor: AuthenticatedUser, req: Request) {
    await this.findOne(userId);

    const role = await this.prisma.role.findUnique({ where: { name: dto.role } });
    if (!role) throw new NotFoundException('Role not found');

    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: role.id } },
      update: {},
      create: { userId, roleId: role.id, grantedBy: actor.id },
    });

    await this.auditService.log({
      actorId: actor.id,
      targetUserId: userId,
      action: 'ROLE_ASSIGN',
      resource: 'users',
      resourceId: userId,
      ipAddress: this.getIp(req),
      afterData: { role: dto.role },
    });

    return this.findOne(userId);
  }

  async revokeRole(userId: string, roleName: RoleName, actor: AuthenticatedUser, req: Request) {
    await this.findOne(userId);

    const role = await this.prisma.role.findUnique({ where: { name: roleName } });
    if (!role) throw new NotFoundException('Role not found');

    await this.prisma.userRole.deleteMany({
      where: { userId, roleId: role.id },
    });

    await this.auditService.log({
      actorId: actor.id,
      targetUserId: userId,
      action: 'ROLE_REVOKE',
      resource: 'users',
      resourceId: userId,
      ipAddress: this.getIp(req),
      afterData: { role: roleName },
    });

    return this.findOne(userId);
  }

  private async assignRolesToUser(userId: string, roles: RoleName[], grantedBy: string) {
    for (const roleName of roles) {
      const role = await this.prisma.role.findUnique({ where: { name: roleName } });
      if (role) {
        await this.prisma.userRole.upsert({
          where: { userId_roleId: { userId, roleId: role.id } },
          update: {},
          create: { userId, roleId: role.id, grantedBy },
        });
      }
    }
  }

  private async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: this.configService.get<number>('argon2.memoryCost', 65536),
      timeCost: this.configService.get<number>('argon2.timeCost', 3),
      parallelism: this.configService.get<number>('argon2.parallelism', 4),
    });
  }

  private getIp(req: Request): string {
    return (
      (req.headers['cf-connecting-ip'] as string) ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket.remoteAddress ||
      ''
    );
  }
}
