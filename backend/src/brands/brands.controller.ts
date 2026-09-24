import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BrandsService, CreateBrandDto } from './brands.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Brands')
@ApiBearerAuth()
@Controller('brands')
@UseGuards(RolesGuard)
export class BrandsController {
  constructor(private readonly svc: BrandsService) {}
  @Get() findAll() { return this.svc.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Post() @Roles('super_admin', 'admin', 'inventory') create(@Body() dto: CreateBrandDto) { return this.svc.create(dto); }
  @Patch(':id') @Roles('super_admin', 'admin', 'inventory') update(@Param('id') id: string, @Body() dto: Partial<CreateBrandDto>) { return this.svc.update(id, dto); }
  @Delete(':id') @Roles('super_admin', 'admin') remove(@Param('id') id: string) { return this.svc.remove(id); }
}
