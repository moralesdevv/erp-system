import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export class CreateSupplierDto {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  nit?: string;
  contact?: string;
  notes?: string;
}

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(search?: string, page = 1, limit = 20) {
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;

    const where = {
      deletedAt: null,
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search } },
          { nit: { contains: search } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: { _count: { select: { purchases: true } } },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return { data, total, page, limit: take };
  }

  async findOne(id: string) {
    const s = await this.prisma.supplier.findFirst({
      where: { id, deletedAt: null },
      include: {
        purchases: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, number: true, total: true, status: true, createdAt: true },
        },
      },
    });
    if (!s) throw new NotFoundException('Supplier not found');
    return s;
  }

  async create(dto: CreateSupplierDto) {
    const count = await this.prisma.supplier.count();
    const code = `PROV-${String(count + 1).padStart(4, '0')}`;
    return this.prisma.supplier.create({ data: { ...dto, code } });
  }

  async update(id: string, dto: Partial<CreateSupplierDto>) {
    await this.findOne(id);
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.supplier.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }
}
