import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsInt, Min, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto, AssignRoleDto } from './dto/create-user.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

class PaginationDto {
  @IsOptional() @Transform(({ value }) => parseInt(value)) @IsInt() @Min(1) page?: number;
  @IsOptional() @Transform(({ value }) => parseInt(value)) @IsInt() @Min(1) limit?: number;
}

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(RolesGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users' })
  @Roles('super_admin', 'admin', 'manager')
  @RequirePermission('users:read')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(@Query() query: PaginationDto) {
    return this.usersService.findAll(query.page, query.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @Roles('super_admin', 'admin', 'manager')
  @RequirePermission('users:read')
  @ApiParam({ name: 'id' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user' })
  @Roles('super_admin', 'admin')
  @RequirePermission('users:create')
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.usersService.create(dto, actor, req);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user profile' })
  @Roles('super_admin', 'admin')
  @RequirePermission('users:update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.usersService.update(id, dto, actor, req);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a user' })
  @Roles('super_admin', 'admin')
  @RequirePermission('users:delete')
  remove(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.usersService.softDelete(id, actor, req);
  }

  @Post(':id/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change user password' })
  changePassword(
    @Param('id') id: string,
    @Body() dto: ChangePasswordDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.usersService.changePassword(id, dto, actor, req);
  }

  @Post(':id/roles')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign a role to a user' })
  @Roles('super_admin', 'admin')
  @RequirePermission('roles:assign')
  assignRole(
    @Param('id') id: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.usersService.assignRole(id, dto, actor, req);
  }

  @Delete(':id/roles/:role')
  @ApiOperation({ summary: 'Revoke a role from a user' })
  @Roles('super_admin', 'admin')
  @RequirePermission('roles:revoke')
  revokeRole(
    @Param('id') id: string,
    @Param('role') role: RoleName,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.usersService.revokeRole(id, role, actor, req);
  }
}
