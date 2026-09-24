import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { Prisma, PaymentMethod, StockMovementType } from '@prisma/client';

export interface CreateSaleItemDto {
  productId: string;
  quantity: number;
  unitPrice: number;
  discountPct?: number;
  lotId?: string;
}

export interface CreateSaleDto {
  branchId: string;
  customerId?: string;
  cashRegisterId?: string;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  items: CreateSaleItemDto[];
  notes?: string;
  discountAmount?: number;
}

export interface SaleQueryDto {
  branchId?: string;
  customerId?: string;
  userId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  async findAll(query: SaleQueryDto) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.SaleWhereInput = {
      ...(query.branchId && { branchId: query.branchId }),
      ...(query.customerId && { customerId: query.customerId }),
      ...(query.userId && { userId: query.userId }),
      ...(query.status && { status: query.status as any }),
      ...(query.fromDate || query.toDate
        ? {
            createdAt: {
              ...(query.fromDate && { gte: new Date(query.fromDate) }),
              ...(query.toDate && { lte: new Date(query.toDate) }),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, code: true } },
          user: { select: { id: true, firstName: true, lastName: true } },
          branch: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        },
      }),
      this.prisma.sale.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        user: { select: { id: true, firstName: true, lastName: true } },
        branch: true,
        items: {
          include: { product: { include: { category: true } } },
        },
        payments: true,
      },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    return sale;
  }

  async create(dto: CreateSaleDto, userId: string) {
    if (!dto.items?.length) throw new BadRequestException('Sale must have at least one item');

    return this.prisma.$transaction(async (tx) => {
      // Generate sale number
      const count = await tx.sale.count();
      const number = `VTA-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

      // Calculate totals
      let subtotal = 0;
      let taxAmount = 0;
      const processedItems: Array<{
        productId: string;
        quantity: Prisma.Decimal;
        unitPrice: Prisma.Decimal;
        costUnit: Prisma.Decimal;
        discountPct: Prisma.Decimal;
        discountAmount: Prisma.Decimal;
        taxAmount: Prisma.Decimal;
        subtotal: Prisma.Decimal;
        total: Prisma.Decimal;
        lotId?: string;
      }> = [];

      for (const item of dto.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, isActive: true, deletedAt: null },
        });
        if (!product) throw new NotFoundException(`Product ${item.productId} not found`);

        const unitPrice = item.unitPrice;
        const discountPct = item.discountPct || 0;
        const discountAmount = (unitPrice * item.quantity * discountPct) / 100;
        const itemSubtotal = unitPrice * item.quantity - discountAmount;
        const itemTax = itemSubtotal * (Number(product.taxRate) / 100);
        const itemTotal = itemSubtotal + itemTax;

        subtotal += itemSubtotal;
        taxAmount += itemTax;

        processedItems.push({
          productId: item.productId,
          quantity: new Prisma.Decimal(item.quantity),
          unitPrice: new Prisma.Decimal(unitPrice),
          costUnit: product.cost,
          discountPct: new Prisma.Decimal(discountPct),
          discountAmount: new Prisma.Decimal(discountAmount),
          taxAmount: new Prisma.Decimal(itemTax),
          subtotal: new Prisma.Decimal(itemSubtotal),
          total: new Prisma.Decimal(itemTotal),
          lotId: item.lotId,
        });
      }

      const saleDiscount = dto.discountAmount || 0;
      const total = subtotal + taxAmount - saleDiscount;
      const change = Math.max(0, dto.amountPaid - total);

      if (dto.paymentMethod === 'CASH' && dto.amountPaid < total) {
        throw new BadRequestException('Insufficient payment amount');
      }

      const sale = await tx.sale.create({
        data: {
          number,
          branchId: dto.branchId,
          customerId: dto.customerId,
          cashRegisterId: dto.cashRegisterId,
          userId,
          subtotal: new Prisma.Decimal(subtotal),
          discountAmount: new Prisma.Decimal(saleDiscount),
          taxAmount: new Prisma.Decimal(taxAmount),
          total: new Prisma.Decimal(total),
          paymentMethod: dto.paymentMethod,
          amountPaid: new Prisma.Decimal(dto.amountPaid),
          change: new Prisma.Decimal(change),
          notes: dto.notes,
          items: { create: processedItems },
        },
        include: { items: true },
      });

      // Deduct stock for each item
      for (const item of dto.items) {
        await this.inventoryService.recordMovement({
          productId: item.productId,
          branchId: dto.branchId,
          type: StockMovementType.SALE_OUT,
          quantity: item.quantity,
          referenceId: sale.id,
          referenceType: 'sale',
          createdBy: userId,
        });
      }

      // Update customer credit balance if credit payment
      if (dto.paymentMethod === 'CREDIT' && dto.customerId) {
        await tx.customer.update({
          where: { id: dto.customerId },
          data: { creditBalance: { increment: total } },
        });

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);

        await tx.credit.create({
          data: {
            customerId: dto.customerId,
            saleId: sale.id,
            amount: new Prisma.Decimal(total),
            balance: new Prisma.Decimal(total),
            dueDate,
          },
        });
      }

      return sale;
    });
  }

  async voidSale(id: string, userId: string, reason: string) {
    const sale = await this.findOne(id);

    if (sale.status === 'VOIDED') throw new BadRequestException('Sale already voided');

    // Return stock
    for (const item of sale.items) {
      await this.inventoryService.recordMovement({
        productId: item.productId,
        branchId: sale.branchId,
        type: StockMovementType.RETURN_IN,
        quantity: Number(item.quantity),
        referenceId: sale.id,
        referenceType: 'sale_void',
        createdBy: userId,
      });
    }

    // Reverse credit if applicable
    if (sale.paymentMethod === 'CREDIT' && sale.customerId) {
      await this.prisma.customer.update({
        where: { id: sale.customerId },
        data: { creditBalance: { decrement: sale.total } },
      });
      await this.prisma.credit.updateMany({
        where: { saleId: id },
        data: { status: 'WRITTEN_OFF' },
      });
    }

    return this.prisma.sale.update({
      where: { id },
      data: {
        status: 'VOIDED',
        voidedAt: new Date(),
        voidedBy: userId,
        voidReason: reason,
      },
    });
  }

  async getDailySummary(branchId: string, date?: Date) {
    const day = date || new Date();
    const startOfDay = new Date(day);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(day);
    endOfDay.setHours(23, 59, 59, 999);

    const [totals, byMethod, count] = await Promise.all([
      this.prisma.sale.aggregate({
        where: {
          branchId,
          status: 'COMPLETED',
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
        _sum: { total: true, taxAmount: true, discountAmount: true },
        _avg: { total: true },
        _count: true,
      }),
      this.prisma.sale.groupBy({
        by: ['paymentMethod'],
        where: {
          branchId,
          status: 'COMPLETED',
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.sale.count({
        where: { branchId, status: 'VOIDED', createdAt: { gte: startOfDay, lte: endOfDay } },
      }),
    ]);

    return {
      date: day,
      totalSales: totals._count,
      totalRevenue: totals._sum.total ?? 0,
      avgTicket: totals._avg.total ?? 0,
      totalTax: totals._sum.taxAmount ?? 0,
      totalDiscount: totals._sum.discountAmount ?? 0,
      voidedCount: count,
      byMethod,
    };
  }
}
