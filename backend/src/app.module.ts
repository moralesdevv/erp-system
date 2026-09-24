import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import {
  appConfig, jwtConfig, redisConfig, throttleConfig,
  uploadConfig, argon2Config, loggingConfig,
} from './config/app.config';

// Core modules
import { PrismaModule } from './prisma/prisma.module';
import { LoggerModule } from './logger/logger.module';

// Security
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { AuditModule } from './audit/audit.module';
import { UploadModule } from './upload/upload.module';

// ERP modules
import { BranchesModule } from './branches/branches.module';
import { CategoriesModule } from './categories/categories.module';
import { BrandsModule } from './brands/brands.module';
import { ProductsModule } from './products/products.module';
import { InventoryModule } from './inventory/inventory.module';
import { CustomersModule } from './customers/customers.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { SalesModule } from './sales/sales.module';
import { PurchasesModule } from './purchases/purchases.module';
import { CreditsModule } from './credits/credits.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificationsModule } from './notifications/notifications.module';

// Realtime & tasks
import { EventsModule } from './events/events.module';
import { TasksModule } from './common/tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.production', '.env'],
      load: [appConfig, jwtConfig, redisConfig, throttleConfig, uploadConfig, argon2Config, loggingConfig],
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        throttlers: [{
          ttl: cfg.get<number>('throttle.ttl', 60) * 1000,
          limit: cfg.get<number>('throttle.limit', 100),
        }],
      }),
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    PrismaModule,
    LoggerModule,

    // Security
    AuthModule,
    UsersModule,
    RolesModule,
    AuditModule,
    UploadModule,

    // ERP Business Modules
    BranchesModule,
    CategoriesModule,
    BrandsModule,
    ProductsModule,
    InventoryModule,
    CustomersModule,
    SuppliersModule,
    SalesModule,
    PurchasesModule,
    CreditsModule,
    DashboardModule,
    NotificationsModule,

    // Realtime & Tasks
    EventsModule,
    TasksModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
