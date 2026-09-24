import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(RolesGuard)
export class DashboardController {
  constructor(private readonly svc: DashboardService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'Get executive KPIs' })
  getKPIs(@Query('branchId') branchId?: string) {
    return this.svc.getKPIs(branchId);
  }

  @Get('revenue-trend')
  @ApiOperation({ summary: 'Get revenue trend for charts' })
  getRevenueTrend(@Query('branchId') b?: string, @Query('days') d?: number) {
    return this.svc.getRevenueTrend(b, d || 30);
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Get best-selling products' })
  getTopProducts(@Query('branchId') b?: string, @Query('limit') l?: number) {
    return this.svc.getTopProducts(b, l || 10);
  }

  @Get('branch-comparison')
  @Roles('super_admin', 'admin', 'manager')
  @ApiOperation({ summary: 'Compare sales across branches' })
  getBranchComparison(@Query('fromDate') d?: string) {
    return this.svc.getBranchComparison(d ? new Date(d) : undefined);
  }

  @Get('activity')
  @ApiOperation({ summary: 'Recent transactions and activity feed' })
  getRecentActivity(@Query('limit') limit?: number) {
    return this.svc.getRecentActivity(limit || 20);
  }

  @Get('cash-flow')
  @Roles('super_admin', 'admin', 'manager')
  @ApiOperation({ summary: 'Income vs expenses cash flow' })
  getCashFlow(@Query('branchId') b?: string, @Query('days') d?: number) {
    return this.svc.getCashFlow(b, d || 30);
  }
}
