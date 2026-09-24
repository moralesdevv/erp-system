import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockMovementType, Prisma } from '@prisma/client';

export interface StockAdjustDto {
  productId: string;
  branchId: string;
  quantity: number;
  type: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'INITIAL';
  costUnit?: number;
  notes?: string;
  createdBy?: string;
}

export interface StockTransferDto {
  productId: string;
  fromBranchId: string;
  toBranchId: string;
  quantity: number;
  notes?: string;
  createdBy?: string;
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Get current stock ─────────────────────────────────────────────────────

  async getStock(branchId?: string, productId?: string) {
    return this.prisma.stock.findMany({
      where: {
        ...(branchId && { branchId }),
        ...(productId && { productId }),
      },
      include: {
        product: { include: { category: true, brand: true } },
        branch: true,
      },
    });
  }

  async getStockSummary(branchId?: string) {
    const stock = await this.prisma.stock.findMany({
      where: branchId ? { branchId } : {},
      include: { product: { include: { category: true } } },
    });

    const totalProducts = stock.length;
    const totalValue = stock.reduce(
      (sum, s) => sum + Number(s.quantity) * Number(s.product.cost),
      0,
    );
    const lowStock = stock.filter((s) => Number(s.quantity) <= s.product.minStock).length;

    return { totalProducts, totalValue, lowStock };
  }

  // ─── Record movement (internal use) ────────────────────────────────────────

  async recordMovement(dto: {
    productId: string;
    branchId: string;
    type: StockMovementType;
    quantity: number;
    costUnit?: number;
    referenceId?: string;
    referenceType?: string;
    lotId?: string;
    notes?: string;
    createdBy?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      // Get or create stock record
      let stock = await tx.stock.findUnique({
        where: { productId_branchId: { productId: dto.productId, branchId: dto.branchId } },
      });

      if (!stock) {
        stock = await tx.stock.create({
          data: {
            productId: dto.productId,
            branchId: dto.branchId,
            quantity: new Prisma.Decimal(0),
          },
        });
      }

      const balanceBefore = Number(stock.quantity);
      const isIn = ['PURCHASE_IN', 'TRANSFER_IN', 'ADJUSTMENT_IN', 'RETURN_IN', 'INITIAL'].includes(dto.type);
      const delta = isIn ? dto.quantity : -dto.quantity;
      const balanceAfter = balanceBefore + delta;

      if (balanceAfter < 0) {
        throw new BadRequestException(
          `Insufficient stock: available ${balanceBefore}, requested ${dto.quantity}`,
        );
      }

      // Update stock
      await tx.stock.update({
        where: { productId_branchId: { productId: dto.productId, branchId: dto.branchId } },
        data: { quantity: new Prisma.Decimal(balanceAfter) },
      });

      // Create movement record
      return tx.stockMovement.create({
        data: {
          productId: dto.productId,
          branchId: dto.branchId,
          type: dto.type,
          quantity: new Prisma.Decimal(dto.quantity),
          costUnit: dto.costUnit ? new Prisma.Decimal(dto.costUnit) : null,
          balanceBefore: new Prisma.Decimal(balanceBefore),
          balanceAfter: new Prisma.Decimal(balanceAfter),
          referenceId: dto.referenceId,
          referenceType: dto.referenceType,
          lotId: dto.lotId,
          notes: dto.notes,
          createdBy: dto.createdBy,
        },
      });
    });
  }

  // ─── Adjust stock ──────────────────────────────────────────────────────────

  async adjustStock(dto: StockAdjustDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, deletedAt: null } });
    if (!product) throw new NotFoundException('Product not found');

    return this.recordMovement({
      productId: dto.productId,
      branchId: dto.branchId,
      type: dto.type as StockMovementType,
      quantity: dto.quantity,
      costUnit: dto.costUnit,
      notes: dto.notes,
      createdBy: dto.createdBy,
    });
  }

  // ─── Transfer stock ─────────────────────────────────────────────────────────

  async transferStock(dto: StockTransferDto) {
    if (dto.fromBranchId === dto.toBranchId) {
      throw new BadRequestException('Cannot transfer to the same branch');
    }

    await this.recordMovement({
      productId: dto.productId,
      branchId: dto.fromBranchId,
      type: StockMovementType.TRANSFER_OUT,
      quantity: dto.quantity,
      notes: dto.notes,
      createdBy: dto.createdBy,
    });

    await this.recordMovement({
      productId: dto.productId,
      branchId: dto.toBranchId,
      type: StockMovementType.TRANSFER_IN,
      quantity: dto.quantity,
      notes: dto.notes,
      createdBy: dto.createdBy,
    });

    return { message: 'Transfer completed successfully' };
  }

  // ─── Kardex ────────────────────────────────────────────────────────────────

  async getKardex(
    productId: string,
    branchId?: string,
    fromDate?: Date,
    toDate?: Date,
    page = 1,
    limit = 50,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.StockMovementWhereInput = {
      productId,
      ...(branchId && { branchId }),
      ...(fromDate || toDate
        ? { createdAt: { ...(fromDate && { gte: fromDate }), ...(toDate && { lte: toDate }) } }
        : {}),
    };

    const [moves, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { branch: true },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return { data: moves, total, page, limit };
  }

  // ─── Lots / expiry tracking ─────────────────────────────────────────────────

  async getExpiringLots(daysAhead = 30) {
    const cutoff = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
    return this.prisma.lot.findMany({
      where: {
        isActive: true,
        expiresAt: { lte: cutoff },
        quantity: { gt: 0 },
      },
      include: { product: { include: { category: true } } },
      orderBy: { expiresAt: 'asc' },
    });
  }

  async createLot(dto: {
    productId: string;
    lotNumber: string;
    expiresAt?: Date;
    quantity: number;
    costUnit: number;
    branchId: string;
    createdBy?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const lot = await tx.lot.create({
        data: {
          productId: dto.productId,
          lotNumber: dto.lotNumber,
          expiresAt: dto.expiresAt,
          quantity: new Prisma.Decimal(dto.quantity),
          costUnit: new Prisma.Decimal(dto.costUnit),
        },
      });

      await this.recordMovement({
        productId: dto.productId,
        branchId: dto.branchId,
        type: StockMovementType.PURCHASE_IN,
        quantity: dto.quantity,
        costUnit: dto.costUnit,
        lotId: lot.id,
        createdBy: dto.createdBy,
      });

      return lot;
    });
  }
}
