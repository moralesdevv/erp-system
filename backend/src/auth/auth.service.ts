import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 30;
const REFRESH_TOKEN_COOKIE = 'refreshToken';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly auditService: AuditService,
  ) {}

  // ─── Register ──────────────────────────────────────────────────────────────

  async register(dto: RegisterDto, req: Request) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await this.hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    await this.auditService.log({
      actorId: user.id,
      action: 'CREATE',
      resource: 'users',
      resourceId: user.id,
      ipAddress: this.getIp(req),
      userAgent: req.headers['user-agent'],
      afterData: { email: user.email, firstName: user.firstName },
    });

    return { message: 'Account created successfully. Please verify your email.' };
  }

  // ─── Login ─────────────────────────────────────────────────────────────────

  async login(dto: LoginDto, req: Request, res: Response) {
    const ip = this.getIp(req);
    const userAgent = req.headers['user-agent'];

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      this.logger.security('LOGIN_FAILED_USER_NOT_FOUND', { email: dto.email, ip });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      this.logger.security('LOGIN_BLOCKED_ACCOUNT_LOCKED', { userId: user.id, ip });
      throw new ForbiddenException(`Account locked. Try again in ${remaining} minutes.`);
    }

    // Verify password
    const passwordValid = await this.verifyPassword(user.passwordHash, dto.password);
    if (!passwordValid) {
      await this.handleFailedLogin(user.id, ip);
      await this.auditService.log({
        actorId: user.id,
        action: 'LOGIN_FAILED',
        resource: 'auth',
        ipAddress: ip,
        userAgent,
        metadata: { reason: 'invalid_password' },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is disabled. Contact administrator.');
    }

    // Reset failed attempts on successful login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      },
    });

    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = await this.generateRefreshToken(payload, user.id, ip, userAgent);

    // Set refresh token as HttpOnly, Secure cookie
    this.setRefreshTokenCookie(res, refreshToken);

    await this.auditService.log({
      actorId: user.id,
      action: 'LOGIN',
      resource: 'auth',
      ipAddress: ip,
      userAgent,
    });

    const roles = user.userRoles.map((ur) => ur.role.name);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles,
      },
    };
  }

  // ─── Refresh Token ─────────────────────────────────────────────────────────

  async refreshTokens(userId: string, oldRefreshToken: string, req: Request, res: Response) {
    const ip = this.getIp(req);
    const userAgent = req.headers['user-agent'];
    const tokenHash = this.hashToken(oldRefreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!storedToken || storedToken.userId !== userId || storedToken.isRevoked) {
      this.logger.security('REFRESH_TOKEN_REUSE_DETECTED', { userId, ip });
      // Revoke ALL tokens for this user (token theft detected)
      await this.revokeAllUserTokens(userId);
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.expiresAt < new Date()) {
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true, revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token expired');
    }

    // Rotate: revoke old token and issue new pair
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('User account is not active');
    }

    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = this.generateAccessToken(payload);
    const newRefreshToken = await this.generateRefreshToken(payload, user.id, ip, userAgent);

    this.setRefreshTokenCookie(res, newRefreshToken);

    return { accessToken };
  }

  // ─── Logout ────────────────────────────────────────────────────────────────

  async logout(userId: string, refreshToken: string | undefined, req: Request, res: Response) {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash, userId },
        data: { isRevoked: true, revokedAt: new Date() },
      });
    }

    res.clearCookie(REFRESH_TOKEN_COOKIE, this.cookieOptions());

    await this.auditService.log({
      actorId: userId,
      action: 'LOGOUT',
      resource: 'auth',
      ipAddress: this.getIp(req),
      userAgent: req.headers['user-agent'],
    });

    return { message: 'Logged out successfully' };
  }

  // ─── Revoke all sessions ───────────────────────────────────────────────────

  async revokeAllSessions(userId: string, req: Request) {
    await this.revokeAllUserTokens(userId);
    await this.auditService.log({
      actorId: userId,
      action: 'SESSION_REVOKE',
      resource: 'auth',
      ipAddress: this.getIp(req),
      userAgent: req.headers['user-agent'],
      metadata: { scope: 'all_sessions' },
    });
    return { message: 'All sessions revoked' };
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: this.configService.get<number>('argon2.memoryCost', 65536),
      timeCost: this.configService.get<number>('argon2.timeCost', 3),
      parallelism: this.configService.get<number>('argon2.parallelism', 4),
    });
  }

  private async verifyPassword(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  private generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn: this.configService.get<string>('jwt.accessExpiration', '15m'),
    });
  }

  private async generateRefreshToken(
    payload: JwtPayload,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string> {
    const expirationDays = 7;
    const expiresAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000);

    const token = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<string>('jwt.refreshExpiration', '7d'),
    });

    const tokenHash = this.hashToken(token);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, userAgent, ipAddress, expiresAt },
    });

    return token;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async handleFailedLogin(userId: string, ip: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const attempts = user.failedLoginAttempts + 1;
    const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;
    const lockedUntil = shouldLock
      ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
      : null;

    await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: attempts, lockedUntil },
    });

    if (shouldLock) {
      this.logger.security('ACCOUNT_LOCKED_BRUTE_FORCE', { userId, attempts, ip });
    }
  }

  private async revokeAllUserTokens(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    });
  }

  private setRefreshTokenCookie(res: Response, token: string) {
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    res.cookie(REFRESH_TOKEN_COOKIE, token, {
      ...this.cookieOptions(),
      maxAge,
    });
  }

  private cookieOptions() {
    const isProduction =
      this.configService.get<string>('app.nodeEnv') === 'production';
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict' as const,
      path: '/api/v1/auth',
    };
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
