import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export class CreateBranchDto {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  isMain?: boolean;
}

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.branch.findMany({
      where: { isActive: true },
      include: { _count: { select: { users: true, sales: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async create(dto: CreateBranchDto) {
    if (dto.isMain) {
      await this.prisma.branch.updateMany({ where: { isMain: true }, data: { isMain: false } });
    }
    return this.prisma.branch.create({ data: dto });
  }

  async update(id: string, dto: Partial<CreateBranchDto>) {
    await this.findOne(id);
    if (dto.isMain) {
      await this.prisma.branch.updateMany({ where: { isMain: true }, data: { isMain: false } });
    }
    return this.prisma.branch.update({ where: { id }, data: dto });
  }

  async getMainBranch() {
    const branch = await this.prisma.branch.findFirst({ where: { isMain: true } });
    if (!branch) return this.prisma.branch.findFirst({ orderBy: { createdAt: 'asc' } });
    return branch;
  }
}
