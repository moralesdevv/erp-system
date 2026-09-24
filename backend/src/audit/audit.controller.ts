import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { AuditService } from './audit.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/permissions.decorator';

class AuditQueryDto {
  @IsOptional() @IsString() actorId?: string;
  @IsOptional() @IsString() action?: AuditAction;
  @IsOptional() @IsString() resource?: string;
  @IsOptional() @IsDateString() fromDate?: string;
  @IsOptional() @IsDateString() toDate?: string;
  @IsOptional() @Transform(({ value }) => parseInt(value)) @IsInt() @Min(1) page?: number;
  @IsOptional() @Transform(({ value }) => parseInt(value)) @IsInt() @Min(1) @Max(200) limit?: number;
}

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(RolesGuard, PermissionsGuard)
@Roles('super_admin', 'admin')
@RequirePermission('audit:read')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Query audit logs (admin only)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(@Query() query: AuditQueryDto) {
    return this.auditService.findAll({
      ...query,
      fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
      toDate: query.toDate ? new Date(query.toDate) : undefined,
    });
  }
}
