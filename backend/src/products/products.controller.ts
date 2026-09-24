import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ProductsService, CreateProductDto, ProductQueryDto } from './products.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
@UseGuards(RolesGuard)
export class ProductsController {
  constructor(private readonly svc: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products with search, filters, stock info' })
  findAll(@Query() query: ProductQueryDto) {
    return this.svc.findAll(query);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get products with stock below minimum' })
  lowStock(@Query('branchId') branchId?: string) {
    return this.svc.getLowStockAlerts(branchId);
  }

  @Get('barcode/:barcode')
  @ApiOperation({ summary: 'Find product by barcode (POS use)' })
  findByBarcode(@Param('barcode') barcode: string) {
    return this.svc.findByBarcode(barcode);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Get(':id/stock')
  getStockByBranch(@Param('id') id: string) {
    return this.svc.getStockByBranch(id);
  }

  @Post()
  @Roles('super_admin', 'admin', 'inventory')
  @ApiOperation({ summary: 'Create a new product' })
  create(@Body() dto: CreateProductDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin', 'inventory')
  update(@Param('id') id: string, @Body() dto: Partial<CreateProductDto>) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
