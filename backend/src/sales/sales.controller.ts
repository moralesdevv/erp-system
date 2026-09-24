import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SalesService, CreateSaleDto, SaleQueryDto } from './sales.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Sales')
@ApiBearerAuth()
@Controller('sales')
@UseGuards(RolesGuard)
export class SalesController {
  constructor(private readonly svc: SalesService) {}

  @Get()
  @ApiOperation({ summary: 'List sales with filters' })
  findAll(@Query() query: SaleQueryDto) {
    return this.svc.findAll(query);
  }

  @Get('daily-summary')
  @ApiOperation({ summary: 'Daily sales summary for a branch' })
  dailySummary(@Query('branchId') branchId: string, @Query('date') date?: string) {
    return this.svc.getDailySummary(branchId, date ? new Date(date) : undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new sale (POS or manual)' })
  @Roles('super_admin', 'admin', 'manager', 'cashier', 'sales')
  create(@Body() dto: CreateSaleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.create(dto, user.id);
  }

  @Post(':id/void')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Void a sale' })
  @Roles('super_admin', 'admin', 'manager')
  void(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.voidSale(id, user.id, reason);
  }
}
