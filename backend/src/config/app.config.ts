import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3001').split(','),
  cookieSecret: process.env.COOKIE_SECRET,
}));

export const jwtConfig = registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
  refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
}));

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
}));

export const throttleConfig = registerAs('throttle', () => ({
  ttl: parseInt(process.env.THROTTLE_TTL_SECONDS || '60', 10),
  limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
}));

export const uploadConfig = registerAs('upload', () => ({
  dir: process.env.UPLOAD_DIR || './uploads',
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
  allowedMimeTypes: (
    process.env.ALLOWED_MIME_TYPES ||
    'image/jpeg,image/png,image/webp,application/pdf'
  ).split(','),
}));

export const argon2Config = registerAs('argon2', () => ({
  memoryCost: parseInt(process.env.ARGON2_MEMORY_COST || '65536', 10),
  timeCost: parseInt(process.env.ARGON2_TIME_COST || '3', 10),
  parallelism: parseInt(process.env.ARGON2_PARALLELISM || '4', 10),
}));

export const loggingConfig = registerAs('logging', () => ({
  level: process.env.LOG_LEVEL || 'info',
  dir: process.env.LOG_DIR || './logs',
}));
