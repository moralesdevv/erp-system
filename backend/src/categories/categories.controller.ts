import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CategoriesService, CreateCategoryDto } from './categories.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Categories')
@ApiBearerAuth()
@Controller('categories')
@UseGuards(RolesGuard)
export class CategoriesController {
  constructor(private readonly svc: CategoriesService) {}

  @Get()
  findAll(@Query('tree') tree?: string) {
    return this.svc.findAll(tree === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @Roles('super_admin', 'admin', 'inventory')
  create(@Body() dto: CreateCategoryDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin', 'inventory')
  update(@Param('id') id: string, @Body() dto: Partial<CreateCategoryDto>) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
