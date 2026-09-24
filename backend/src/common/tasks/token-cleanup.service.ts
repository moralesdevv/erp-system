import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { LoggerService } from '../../logger/logger.service';

@Injectable()
export class TokenCleanupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  // Run every hour — clean up expired and revoked refresh tokens
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredTokens() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isRevoked: true, revokedAt: { lt: thirtyDaysAgo } },
        ],
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired/revoked tokens`, 'TokenCleanup');
    }
  }

  // Run daily — unlock accounts whose lockout period has expired
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async unlockExpiredLockouts() {
    const result = await this.prisma.user.updateMany({
      where: {
        lockedUntil: { lt: new Date() },
        failedLoginAttempts: { gt: 0 },
      },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    if (result.count > 0) {
      this.logger.log(`Unlocked ${result.count} accounts after lockout expiry`, 'TokenCleanup');
    }
  }
}
