import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { LoggerService } from './logger/logger.service';
import { XssSanitizeMiddleware } from './common/middleware/xss-sanitize.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const configService = app.get(ConfigService);
  const logger = app.get(LoggerService);
  const nodeEnv = configService.get<string>('app.nodeEnv');
  const allowedOrigins = configService.get<string[]>('app.allowedOrigins', []);
  const cookieSecret = configService.get<string>('app.cookieSecret');

  app.useLogger(logger);

  // ─── Helmet security headers ─────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      frameguard: { action: 'deny' },
      noSniff: true,
      xssFilter: true,
      hidePoweredBy: true,
    }),
  );

  // ─── Cookie parser ───────────────────────────────────────────────────────────
  app.use(cookieParser(cookieSecret));

  // ─── XSS sanitization middleware ─────────────────────────────────────────────
  app.use(new XssSanitizeMiddleware().use);

  // ─── CORS ────────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposedHeaders: ['X-Total-Count'],
  });

  // ─── Global prefix ───────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ─── Global validation pipe ──────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── Global filters and interceptors ────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter(logger, nodeEnv));
  app.useGlobalInterceptors(new LoggingInterceptor(logger));

  // ─── WebSocket adapter ───────────────────────────────────────────────────────
  app.useWebSocketAdapter(new IoAdapter(app));

  // ─── Swagger (dev only) ──────────────────────────────────────────────────────
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('ERP System API')
      .setDescription('Enterprise Resource Planning - REST API Documentation')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
      .addCookieAuth('refreshToken')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = configService.get<number>('app.port', 3000);
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 ERP API running on port ${port} [${nodeEnv}]`, 'Bootstrap');
}

bootstrap();
