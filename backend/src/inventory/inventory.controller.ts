import { Controller, Get, Post, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InventoryService, StockAdjustDto, StockTransferDto } from './inventory.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
@UseGuards(RolesGuard)
export class InventoryController {
  constructor(private readonly svc: InventoryService) {}

  @Get('stock')
  @ApiOperation({ summary: 'Get current stock levels' })
  getStock(@Query('branchId') branchId?: string, @Query('productId') productId?: string) {
    return this.svc.getStock(branchId, productId);
  }

  @Get('summary')
  getSummary(@Query('branchId') branchId?: string) {
    return this.svc.getStockSummary(branchId);
  }

  @Get('kardex/:productId')
  @ApiOperation({ summary: 'Get stock movement history (kardex)' })
  getKardex(
    @Param('productId') productId: string,
    @Query('branchId') branchId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.svc.getKardex(
      productId,
      branchId,
      fromDate ? new Date(fromDate) : undefined,
      toDate ? new Date(toDate) : undefined,
      page,
      limit,
    );
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Get lots expiring soon' })
  getExpiring(@Query('days') days?: number) {
    return this.svc.getExpiringLots(days || 30);
  }

  @Post('adjust')
  @Roles('super_admin', 'admin', 'inventory')
  @ApiOperation({ summary: 'Manual stock adjustment' })
  adjust(@Body() dto: StockAdjustDto, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.adjustStock({ ...dto, createdBy: user.id });
  }

  @Post('transfer')
  @Roles('super_admin', 'admin', 'inventory', 'manager')
  @ApiOperation({ summary: 'Transfer stock between branches' })
  transfer(@Body() dto: StockTransferDto, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.transferStock({ ...dto, createdBy: user.id });
  }
}
