import { PrismaClient, RoleName } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const roles: { name: RoleName; displayName: string; description: string }[] = [
  { name: 'super_admin', displayName: 'Super Administrator', description: 'Full system access' },
  { name: 'admin', displayName: 'Administrator', description: 'Administrative access' },
  { name: 'manager', displayName: 'Manager', description: 'Management access' },
  { name: 'cashier', displayName: 'Cashier', description: 'Point of sale access' },
  { name: 'inventory', displayName: 'Inventory Clerk', description: 'Inventory management access' },
  { name: 'sales', displayName: 'Sales Representative', description: 'Sales access' },
];

const permissions = [
  // Users
  { resource: 'users', action: 'create' },
  { resource: 'users', action: 'read' },
  { resource: 'users', action: 'update' },
  { resource: 'users', action: 'delete' },
  // Roles
  { resource: 'roles', action: 'assign' },
  { resource: 'roles', action: 'revoke' },
  // Sales
  { resource: 'sales', action: 'create' },
  { resource: 'sales', action: 'read' },
  { resource: 'sales', action: 'update' },
  { resource: 'sales', action: 'delete' },
  { resource: 'sales', action: 'export' },
  // Inventory
  { resource: 'inventory', action: 'create' },
  { resource: 'inventory', action: 'read' },
  { resource: 'inventory', action: 'update' },
  { resource: 'inventory', action: 'delete' },
  { resource: 'inventory', action: 'export' },
  // Payments
  { resource: 'payments', action: 'create' },
  { resource: 'payments', action: 'read' },
  { resource: 'payments', action: 'refund' },
  // Reports
  { resource: 'reports', action: 'read' },
  { resource: 'reports', action: 'export' },
  // Audit
  { resource: 'audit', action: 'read' },
  // Settings
  { resource: 'settings', action: 'read' },
  { resource: 'settings', action: 'update' },
];

async function main() {
  console.log('Seeding database...');

  // Create roles
  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: { ...role, isSystem: true },
    });
  }

  // Create permissions
  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { resource_action: perm },
      update: {},
      create: perm,
    });
  }

  // Assign all permissions to super_admin
  const superAdminRole = await prisma.role.findUnique({ where: { name: 'super_admin' } });
  const allPermissions = await prisma.permission.findMany();

  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdminRole!.id, permissionId: perm.id } },
      update: {},
      create: { roleId: superAdminRole!.id, permissionId: perm.id },
    });
  }

  // Create default super admin user (CHANGE PASSWORD IMMEDIATELY IN PRODUCTION)
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@123!ChangeMe';
  const passwordHash = await argon2.hash(adminPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@erp.local' },
    update: {},
    create: {
      email: 'admin@erp.local',
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      isEmailVerified: true,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: superAdminRole!.id } },
    update: {},
    create: { userId: adminUser.id, roleId: superAdminRole!.id },
  });

  console.log('Seed completed successfully.');
  console.log(`Admin user: admin@erp.local / ${adminPassword}`);
  console.log('IMPORTANT: Change the admin password immediately after first login!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
