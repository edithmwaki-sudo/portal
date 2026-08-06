const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({ log: ['error'] });
(async () => {
  try {
    const rows = await p.rolePermission.findMany({
      where: { roleId: 7 },
      include: { permission: true },
      orderBy: { permission: { id: 'asc' } },
    });
    console.log('rolePermission rows:', rows.length, 'perms:', rows.map((r) => r.permission.name).join(','));
    const roles = await p.role.findMany({ orderBy: { id: 'asc' } });
    console.log('roles:', roles.length, roles.map((r) => r.name).join(','));
  } catch (e) {
    console.log('ERR:', e.message);
  } finally {
    await p.$disconnect();
  }
})();
