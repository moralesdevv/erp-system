import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export class CreateProductDto {
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId?: string;
  brandId?: string;
  unitOfMeasure?: string;
  cost: number;
  price: number;
  minPrice?: number;
  wholesalePrice?: number;
  minStock?: number;
  maxStock?: number;
  taxRate?: number;
  imageUrl?: string;
  trackExpiry?: boolean;
  trackLots?: boolean;
}

export class ProductQueryDto {
  search?: string;
  categoryId?: string;
  brandId?: string;
  lowStock?: boolean;
  page?: number;
  limit?: number;
  branchId?: string;
}

const PRODUCT_INCLUDE = {
  category: { select: { id: true, name: true } },
  brand: { select: { id: true, name: true } },
  stock: true,
};

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ProductQueryDto) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      isActive: true,
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...(query.brandId && { brandId: query.brandId }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { sku: { contains: query.search, mode: 'insensitive' } },
          { barcode: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: PRODUCT_INCLUDE,
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    // Attach computed stock
    const data = products.map((p) => {
      const totalStock = p.stock.reduce((sum, s) => sum + Number(s.quantity), 0);
      const branchStock = query.branchId
        ? p.stock.find((s) => s.branchId === query.branchId)?.quantity ?? 0
        : totalStock;
      return {
        ...p,
        totalStock,
        branchStock: Number(branchStock),
        isLowStock: totalStock <= p.minStock,
      };
    });

    if (query.lowStock) {
      return { data: data.filter((p) => p.isLowStock), total, page, limit };
    }

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const p = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        ...PRODUCT_INCLUDE,
        lots: { where: { isActive: true }, orderBy: { expiresAt: 'asc' } },
      },
    });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  async findByBarcode(barcode: string) {
    const p = await this.prisma.product.findFirst({
      where: { barcode, deletedAt: null, isActive: true },
      include: PRODUCT_INCLUDE,
    });
    if (!p) throw new NotFoundException(`Product with barcode ${barcode} not found`);
    return p;
  }

  async create(dto: CreateProductDto) {
    const existing = await this.prisma.product.findFirst({
      where: { OR: [{ sku: dto.sku }, ...(dto.barcode ? [{ barcode: dto.barcode }] : [])] },
    });
    if (existing) throw new ConflictException('SKU or barcode already exists');

    return this.prisma.product.create({
      data: {
        ...dto,
        cost: new Prisma.Decimal(dto.cost),
        price: new Prisma.Decimal(dto.price),
        minPrice: dto.minPrice ? new Prisma.Decimal(dto.minPrice) : undefined,
        wholesalePrice: dto.wholesalePrice ? new Prisma.Decimal(dto.wholesalePrice) : undefined,
        taxRate: dto.taxRate ? new Prisma.Decimal(dto.taxRate) : new Prisma.Decimal(0),
      },
      include: PRODUCT_INCLUDE,
    });
  }

  async update(id: string, dto: Partial<CreateProductDto>) {
    await this.findOne(id);
    const { cost, price, minPrice, wholesalePrice, taxRate, ...rest } = dto;
    return this.prisma.product.update({
      where: { id },
      data: {
        ...rest,
        ...(cost !== undefined && { cost: new Prisma.Decimal(cost) }),
        ...(price !== undefined && { price: new Prisma.Decimal(price) }),
        ...(minPrice !== undefined && { minPrice: new Prisma.Decimal(minPrice) }),
        ...(wholesalePrice !== undefined && { wholesalePrice: new Prisma.Decimal(wholesalePrice) }),
        ...(taxRate !== undefined && { taxRate: new Prisma.Decimal(taxRate) }),
      },
      include: PRODUCT_INCLUDE,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async getLowStockAlerts(branchId?: string) {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, deletedAt: null },
      include: { stock: branchId ? { where: { branchId } } : true, category: true },
    });

    return products
      .map((p) => {
        const stock = p.stock.reduce((sum, s) => sum + Number(s.quantity), 0);
        return { ...p, currentStock: stock, isLowStock: stock <= p.minStock };
      })
      .filter((p) => p.isLowStock)
      .sort((a, b) => a.currentStock - b.currentStock);
  }

  async getStockByBranch(productId: string) {
    const product = await this.findOne(productId);
    const stock = await this.prisma.stock.findMany({
      where: { productId },
      include: { branch: true },
    });
    return { product, stock };
  }
}
