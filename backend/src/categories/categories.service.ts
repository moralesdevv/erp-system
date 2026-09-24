import { Injectable, NotFoundException } from '@nestjs/common';
import { IsString, IsOptional, IsNumber } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

export class CreateCategoryDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() parentId?: string;
  @IsOptional() @IsNumber() sortOrder?: number;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(includeChildren = false) {
    return this.prisma.category.findMany({
      where: { isActive: true, parentId: includeChildren ? undefined : null },
      include: {
        children: includeChildren ? { where: { isActive: true } } : false,
        _count: { select: { products: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const cat = await this.prisma.category.findUnique({
      where: { id },
      include: { children: true, parent: true },
    });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async create(dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: dto });
  }

  async update(id: string, dto: Partial<CreateCategoryDto>) {
    await this.findOne(id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.category.update({ where: { id }, data: { isActive: false } });
  }
}
