import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getKPIs(branchId?: string) {
    const now = new Date();
    const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
    const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const baseWhere = { status: 'COMPLETED' as const, ...(branchId && { branchId }) };

    const [todaySales, yesterdaySales, monthSales, lastMonthSales, pendingCredits, lowStockCount] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { ...baseWhere, createdAt: { gte: startOfToday } },
        _sum: { total: true }, _count: true, _avg: { total: true },
      }),
      this.prisma.sale.aggregate({
        where: { ...baseWhere, createdAt: { gte: startOfYesterday, lt: startOfToday } },
        _sum: { total: true }, _count: true,
      }),
      this.prisma.sale.aggregate({
        where: { ...baseWhere, createdAt: { gte: startOfMonth } },
        _sum: { total: true }, _count: true,
      }),
      this.prisma.sale.aggregate({
        where: { ...baseWhere, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
        _sum: { total: true }, _count: true,
      }),
      this.prisma.credit.aggregate({
        where: { status: { in: ['ACTIVE', 'OVERDUE'] } },
        _sum: { balance: true }, _count: true,
      }),
      this.prisma.product.count({
        where: {
          isActive: true,
          deletedAt: null,
          stock: branchId
            ? { some: { branchId, quantity: { lte: 0 } } }
            : { some: { quantity: { lte: 0 } } },
        },
      }),
    ]);

    const todayRevenue = Number(todaySales._sum.total ?? 0);
    const yesterdayRevenue = Number(yesterdaySales._sum.total ?? 0);
    const monthRevenue = Number(monthSales._sum.total ?? 0);
    const lastMonthRevenue = Number(lastMonthSales._sum.total ?? 0);

    return {
      today: {
        revenue: todayRevenue,
        sales: todaySales._count,
        avgTicket: Number(todaySales._avg.total ?? 0),
        changeVsYesterday: yesterdayRevenue > 0
          ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
          : 0,
      },
      month: {
        revenue: monthRevenue,
        sales: monthSales._count,
        changeVsLastMonth: lastMonthRevenue > 0
          ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
          : 0,
      },
      credits: {
        pending: pendingCredits._count,
        totalBalance: Number(pendingCredits._sum.balance ?? 0),
      },
      lowStock: lowStockCount,
    };
  }

  async getRevenueTrend(branchId?: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const sales = await this.prisma.sale.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startDate },
        ...(branchId && { branchId }),
      },
      select: { total: true, createdAt: true },
    });

    // Group by date
    const byDate = new Map<string, { revenue: number; count: number }>();
    for (let i = 0; i <= days; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const key = d.toISOString().split('T')[0];
      byDate.set(key, { revenue: 0, count: 0 });
    }

    for (const sale of sales) {
      const key = sale.createdAt.toISOString().split('T')[0];
      const existing = byDate.get(key) || { revenue: 0, count: 0 };
      existing.revenue += Number(sale.total);
      existing.count += 1;
      byDate.set(key, existing);
    }

    return Array.from(byDate.entries()).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      count: data.count,
    }));
  }

  async getTopProducts(branchId?: string, limit = 10, fromDate?: Date) {
    const startDate = fromDate || new Date(new Date().setDate(new Date().getDate() - 30));

    const topItems = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: {
          status: 'COMPLETED',
          createdAt: { gte: startDate },
          ...(branchId && { branchId }),
        },
      },
      _sum: { quantity: true, total: true },
      _count: true,
      orderBy: { _sum: { total: 'desc' } },
      take: limit,
    });

    const products = await this.prisma.product.findMany({
      where: { id: { in: topItems.map((i) => i.productId) } },
      include: { category: true },
    });

    return topItems.map((item) => ({
      product: products.find((p) => p.id === item.productId),
      totalSold: Number(item._sum.quantity ?? 0),
      totalRevenue: Number(item._sum.total ?? 0),
      transactionCount: item._count,
    }));
  }

  async getBranchComparison(fromDate?: Date) {
    const startDate = fromDate || new Date(new Date().setDate(1));

    const branches = await this.prisma.branch.findMany({ where: { isActive: true } });
    const results = [];

    for (const branch of branches) {
      const stats = await this.prisma.sale.aggregate({
        where: { branchId: branch.id, status: 'COMPLETED', createdAt: { gte: startDate } },
        _sum: { total: true },
        _count: true,
        _avg: { total: true },
      });

      results.push({
        branch,
        revenue: Number(stats._sum.total ?? 0),
        sales: stats._count,
        avgTicket: Number(stats._avg.total ?? 0),
      });
    }

    return results.sort((a, b) => b.revenue - a.revenue);
  }

  async getRecentActivity(limit = 20) {
    const [recentSales, recentPurchases] = await Promise.all([
      this.prisma.sale.findMany({
        take: limit / 2,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, number: true, total: true, status: true, createdAt: true,
          customer: { select: { name: true } },
          user: { select: { firstName: true, lastName: true } },
          branch: { select: { name: true } },
        },
      }),
      this.prisma.purchase.findMany({
        take: limit / 2,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, number: true, total: true, status: true, createdAt: true,
          supplier: { select: { name: true } },
          branch: { select: { name: true } },
        },
      }),
    ]);

    const activities = [
      ...recentSales.map((s) => ({ type: 'sale', ...s })),
      ...recentPurchases.map((p) => ({ type: 'purchase', ...p })),
    ];

    return activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
  }

  async getCashFlow(branchId?: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [income, expenses] = await Promise.all([
      this.prisma.sale.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startDate },
          ...(branchId && { branchId }),
        },
        _sum: { total: true },
      }),
      this.prisma.purchase.aggregate({
        where: {
          status: 'RECEIVED',
          createdAt: { gte: startDate },
          ...(branchId && { branchId }),
        },
        _sum: { total: true },
      }),
    ]);

    return {
      income: Number(income._sum.total ?? 0),
      expenses: Number(expenses._sum.total ?? 0),
      net: Number(income._sum.total ?? 0) - Number(expenses._sum.total ?? 0),
    };
  }
}
