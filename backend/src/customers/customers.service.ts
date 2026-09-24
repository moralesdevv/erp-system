import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export class CreateCustomerDto {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  nit?: string;
  creditLimit?: number;
  notes?: string;
}

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(search?: string, page = 1, limit = 20) {
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;

    const where: Prisma.CustomerWhereInput = {
      deletedAt: null,
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { nit: { contains: search } },
          { code: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: { _count: { select: { sales: true } } },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { data, total, page, limit: take };
  }

  async findOne(id: string) {
    const c = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        sales: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, number: true, total: true, status: true, createdAt: true },
        },
        credits: {
          where: { status: { in: ['ACTIVE', 'OVERDUE'] } },
          select: { id: true, amount: true, balance: true, dueDate: true, status: true },
        },
      },
    });
    if (!c) throw new NotFoundException('Customer not found');
    return c;
  }

  async create(dto: CreateCustomerDto) {
    if (dto.nit) {
      const existing = await this.prisma.customer.findFirst({ where: { nit: dto.nit } });
      if (existing) throw new ConflictException('NIT already registered');
    }

    // Auto-generate customer code
    const count = await this.prisma.customer.count();
    const code = `CLI-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.customer.create({
      data: {
        ...dto,
        code,
        creditLimit: dto.creditLimit ? new Prisma.Decimal(dto.creditLimit) : new Prisma.Decimal(0),
      },
    });
  }

  async update(id: string, dto: Partial<CreateCustomerDto>) {
    await this.findOne(id);
    const { creditLimit, ...rest } = dto;
    return this.prisma.customer.update({
      where: { id },
      data: {
        ...rest,
        ...(creditLimit !== undefined && { creditLimit: new Prisma.Decimal(creditLimit) }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.customer.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }

  async getStats(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('Customer not found');

    const [salesStats, creditBalance] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { customerId: id, status: 'COMPLETED' },
        _sum: { total: true },
        _count: true,
        _avg: { total: true },
      }),
      this.prisma.credit.aggregate({
        where: { customerId: id, status: { in: ['ACTIVE', 'OVERDUE'] } },
        _sum: { balance: true },
      }),
    ]);

    return {
      customer,
      totalSales: salesStats._count,
      totalRevenue: salesStats._sum.total ?? 0,
      avgTicket: salesStats._avg.total ?? 0,
      creditBalance: creditBalance._sum.balance ?? 0,
    };
  }
}
