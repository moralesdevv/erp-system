import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SuppliersService, CreateSupplierDto } from './suppliers.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Suppliers')
@ApiBearerAuth()
@Controller('suppliers')
@UseGuards(RolesGuard)
export class SuppliersController {
  constructor(private readonly svc: SuppliersService) {}

  @Get()
  findAll(@Query('search') s?: string, @Query('page') p?: number, @Query('limit') l?: number) {
    return this.svc.findAll(s, p, l);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @Roles('super_admin', 'admin', 'manager')
  create(@Body() dto: CreateSupplierDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin', 'manager')
  update(@Param('id') id: string, @Body() dto: Partial<CreateSupplierDto>) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
