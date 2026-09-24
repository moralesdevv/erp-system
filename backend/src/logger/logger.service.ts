import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: winston.Logger;

  constructor(private readonly configService: ConfigService) {
    const logDir = this.configService.get<string>('logging.dir', './logs');
    const logLevel = this.configService.get<string>('logging.level', 'info');
    const nodeEnv = this.configService.get<string>('app.nodeEnv', 'development');

    const transports: winston.transport[] = [
      new winston.transports.DailyRotateFile({
        dirname: logDir,
        filename: 'error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '30d',
        zippedArchive: true,
      }),
      new winston.transports.DailyRotateFile({
        dirname: logDir,
        filename: 'combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        zippedArchive: true,
      }),
      new winston.transports.DailyRotateFile({
        dirname: logDir,
        filename: 'security-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'warn',
        maxSize: '20m',
        maxFiles: '90d',
        zippedArchive: true,
      }),
    ];

    if (nodeEnv !== 'production') {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf(({ timestamp, level, message, context }) => {
              return `${timestamp} [${context || 'App'}] ${level}: ${message}`;
            }),
          ),
        }),
      );
    }

    this.logger = winston.createLogger({
      level: logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      transports,
      exitOnError: false,
    });
  }

  log(message: string, context?: string): void {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string): void {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string): void {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string): void {
    this.logger.verbose(message, { context });
  }

  security(event: string, data: Record<string, unknown>): void {
    this.logger.warn(`[SECURITY] ${event}`, { ...data, securityEvent: true });
  }

  audit(action: string, data: Record<string, unknown>): void {
    this.logger.info(`[AUDIT] ${action}`, { ...data, auditEvent: true });
  }
}
