import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { CreditsService } from './credits.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Credits')
@ApiBearerAuth()
@Controller('credits')
@UseGuards(RolesGuard)
export class CreditsController {
  constructor(private readonly svc: CreditsService) {}

  @Get()
  findAll(
    @Query('customerId') c?: string,
    @Query('status') s?: string,
    @Query('overdue') o?: string,
    @Query('page') p?: number,
    @Query('limit') l?: number,
  ) {
    return this.svc.findAll(c, s, o === 'true', p, l);
  }

  @Get('stats')
  getStats() { return this.svc.getStats(); }

  @Get('aging')
  getAging(@Query('branchId') b?: string) { return this.svc.getAgingReport(b); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post(':id/payment')
  @HttpCode(HttpStatus.OK)
  @Roles('super_admin', 'admin', 'manager', 'cashier')
  addPayment(
    @Param('id') id: string,
    @Body() body: { amount: number; method: PaymentMethod; reference?: string; notes?: string },
  ) {
    return this.svc.addPayment(id, body.amount, body.method, body.reference, body.notes);
  }
}
