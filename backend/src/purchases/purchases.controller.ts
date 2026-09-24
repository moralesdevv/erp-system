import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PurchasesService, CreatePurchaseDto } from './purchases.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Purchases')
@ApiBearerAuth()
@Controller('purchases')
@UseGuards(RolesGuard)
export class PurchasesController {
  constructor(private readonly svc: PurchasesService) {}

  @Get()
  findAll(
    @Query('branchId') b?: string,
    @Query('supplierId') s?: string,
    @Query('status') st?: string,
    @Query('page') p?: number,
    @Query('limit') l?: number,
  ) {
    return this.svc.findAll(b, s, st, p, l);
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('super_admin', 'admin', 'manager', 'inventory')
  create(@Body() dto: CreatePurchaseDto, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.create(dto, user.id);
  }

  @Post(':id/receive')
  @HttpCode(HttpStatus.OK)
  @Roles('super_admin', 'admin', 'manager', 'inventory')
  receive(@Param('id') id: string, @Body('notes') notes: string, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.receive(id, user.id, notes);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles('super_admin', 'admin', 'manager')
  cancel(@Param('id') id: string) { return this.svc.cancel(id); }
}
