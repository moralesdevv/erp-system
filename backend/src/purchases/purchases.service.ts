import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { Prisma, StockMovementType } from '@prisma/client';

export interface CreatePurchaseItemDto {
  productId: string;
  quantity: number;
  unitCost: number;
}

export interface CreatePurchaseDto {
  branchId: string;
  supplierId: string;
  expectedAt?: string;
  notes?: string;
  items: CreatePurchaseItemDto[];
}

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  async findAll(branchId?: string, supplierId?: string, status?: string, page = 1, limit = 20) {
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;
    const where = {
      ...(branchId && { branchId }),
      ...(supplierId && { supplierId }),
      ...(status && { status: status as any }),
    };

    const [data, total] = await Promise.all([
      this.prisma.purchase.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.purchase.count({ where }),
    ]);

    return { data, total, page, limit: take };
  }

  async findOne(id: string) {
    const p = await this.prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        branch: true,
        user: { select: { id: true, firstName: true, lastName: true } },
        items: { include: { product: { include: { category: true } } } },
      },
    });
    if (!p) throw new NotFoundException('Purchase not found');
    return p;
  }

  async create(dto: CreatePurchaseDto, userId: string) {
    const count = await this.prisma.purchase.count();
    const number = `OC-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    let subtotal = 0;
    const items = [];
    for (const item of dto.items) {
      const itemTotal = item.quantity * item.unitCost;
      subtotal += itemTotal;
      items.push({
        productId: item.productId,
        quantity: new Prisma.Decimal(item.quantity),
        unitCost: new Prisma.Decimal(item.unitCost),
        total: new Prisma.Decimal(itemTotal),
      });
    }

    return this.prisma.purchase.create({
      data: {
        number,
        branchId: dto.branchId,
        supplierId: dto.supplierId,
        userId,
        subtotal: new Prisma.Decimal(subtotal),
        total: new Prisma.Decimal(subtotal),
        notes: dto.notes,
        expectedAt: dto.expectedAt ? new Date(dto.expectedAt) : undefined,
        items: { create: items },
      },
      include: { items: true },
    });
  }

  async receive(id: string, userId: string, notes?: string) {
    const purchase = await this.findOne(id);

    if (purchase.status === 'CANCELLED') {
      throw new BadRequestException('Cannot receive a cancelled purchase');
    }
    if (purchase.status === 'RECEIVED') {
      throw new BadRequestException('Purchase already received');
    }

    // Add stock for each item
    for (const item of purchase.items) {
      await this.inventoryService.recordMovement({
        productId: item.productId,
        branchId: purchase.branchId,
        type: StockMovementType.PURCHASE_IN,
        quantity: Number(item.quantity),
        costUnit: Number(item.unitCost),
        referenceId: purchase.id,
        referenceType: 'purchase',
        createdBy: userId,
      });

      // Update product cost (FIFO-ish)
      await this.prisma.product.update({
        where: { id: item.productId },
        data: { cost: item.unitCost },
      });
    }

    return this.prisma.purchase.update({
      where: { id },
      data: {
        status: 'RECEIVED',
        receivedAt: new Date(),
        notes: notes || purchase.notes,
      },
    });
  }

  async cancel(id: string) {
    const purchase = await this.findOne(id);
    if (purchase.status === 'RECEIVED') throw new BadRequestException('Cannot cancel received purchase');
    return this.prisma.purchase.update({ where: { id }, data: { status: 'CANCELLED' } });
  }
}
