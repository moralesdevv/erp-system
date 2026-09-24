import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CustomersService, CreateCustomerDto } from './customers.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
@UseGuards(RolesGuard)
export class CustomersController {
  constructor(private readonly svc: CustomersService) {}

  @Get()
  findAll(@Query('search') search?: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.svc.findAll(search, page, limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Get(':id/stats')
  getStats(@Param('id') id: string) {
    return this.svc.getStats(id);
  }

  @Post()
  @Roles('super_admin', 'admin', 'manager', 'sales', 'cashier')
  create(@Body() dto: CreateCustomerDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin', 'manager', 'sales')
  update(@Param('id') id: string, @Body() dto: Partial<CreateCustomerDto>) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
