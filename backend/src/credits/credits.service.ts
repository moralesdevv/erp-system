import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, PaymentMethod } from '@prisma/client';

@Injectable()
export class CreditsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(customerId?: string, status?: string, overdue?: boolean, page = 1, limit = 20) {
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;
    const now = new Date();

    const where: Prisma.CreditWhereInput = {
      ...(customerId && { customerId }),
      ...(status ? { status: status as any } : {}),
      ...(overdue && { dueDate: { lt: now }, status: { in: ['ACTIVE', 'OVERDUE'] } }),
    };

    // Mark overdue credits
    await this.prisma.credit.updateMany({
      where: { status: 'ACTIVE', dueDate: { lt: now } },
      data: { status: 'OVERDUE' },
    });

    const [data, total] = await Promise.all([
      this.prisma.credit.findMany({
        where,
        skip,
        take,
        orderBy: { dueDate: 'asc' },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          payments: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
      }),
      this.prisma.credit.count({ where }),
    ]);

    return { data, total, page, limit: take };
  }

  async findOne(id: string) {
    const credit = await this.prisma.credit.findUnique({
      where: { id },
      include: {
        customer: true,
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!credit) throw new NotFoundException('Credit not found');
    return credit;
  }

  async addPayment(creditId: string, amount: number, method: PaymentMethod, reference?: string, notes?: string) {
    const credit = await this.findOne(creditId);

    if (credit.status === 'PAID') throw new BadRequestException('Credit is already fully paid');
    if (amount <= 0) throw new BadRequestException('Payment amount must be positive');
    if (amount > Number(credit.balance)) {
      throw new BadRequestException(`Payment exceeds balance of ${credit.balance}`);
    }

    const newBalance = Number(credit.balance) - amount;
    const newStatus = newBalance === 0 ? 'PAID' : credit.status;

    return this.prisma.$transaction(async (tx) => {
      await tx.creditPayment.create({
        data: {
          creditId,
          amount: new Prisma.Decimal(amount),
          method,
          reference,
          notes,
        },
      });

      await tx.credit.update({
        where: { id: creditId },
        data: {
          balance: new Prisma.Decimal(newBalance),
          status: newStatus as any,
        },
      });

      await tx.customer.update({
        where: { id: credit.customerId },
        data: { creditBalance: { decrement: amount } },
      });

      return { message: 'Payment recorded', remainingBalance: newBalance, status: newStatus };
    });
  }

  async getAgingReport(branchId?: string) {
    const now = new Date();
    const credits = await this.prisma.credit.findMany({
      where: { status: { in: ['ACTIVE', 'OVERDUE'] }, balance: { gt: 0 } },
      include: { customer: true },
    });

    const aging = {
      current: { count: 0, total: 0 },
      days_1_30: { count: 0, total: 0 },
      days_31_60: { count: 0, total: 0 },
      days_61_90: { count: 0, total: 0 },
      over_90: { count: 0, total: 0 },
    };

    for (const credit of credits) {
      const daysOverdue = Math.floor((now.getTime() - credit.dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const balance = Number(credit.balance);

      if (daysOverdue <= 0) {
        aging.current.count++;
        aging.current.total += balance;
      } else if (daysOverdue <= 30) {
        aging.days_1_30.count++;
        aging.days_1_30.total += balance;
      } else if (daysOverdue <= 60) {
        aging.days_31_60.count++;
        aging.days_31_60.total += balance;
      } else if (daysOverdue <= 90) {
        aging.days_61_90.count++;
        aging.days_61_90.total += balance;
      } else {
        aging.over_90.count++;
        aging.over_90.total += balance;
      }
    }

    return { aging, total: credits.reduce((s, c) => s + Number(c.balance), 0) };
  }

  async getStats() {
    const [total, overdue, collected] = await Promise.all([
      this.prisma.credit.aggregate({
        where: { status: { in: ['ACTIVE', 'OVERDUE'] } },
        _sum: { balance: true },
        _count: true,
      }),
      this.prisma.credit.count({ where: { status: 'OVERDUE' } }),
      this.prisma.creditPayment.aggregate({
        where: { createdAt: { gte: new Date(new Date().setDate(1)) } },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalBalance: total._sum.balance ?? 0,
      totalCredits: total._count,
      overdueCount: overdue,
      collectedThisMonth: collected._sum.amount ?? 0,
    };
  }
}
