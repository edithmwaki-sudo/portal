import { PrismaClient } from '@prisma/client';
import { SEED_PERMISSIONS } from './permissions.seed';

/**
 * Reconciles the `permissions` table against the hardcoded SEED_PERMISSIONS
 * list (derived from `src/permissions/permissions.ts`):
 * - inserts any permission missing from the DB (keeps descriptions in sync)
 * - prunes any DB row that is not in the seed list (cascade FK cleans up
 *   permission_role pivots)
 *
 * Runs on every boot after startup so the DB can never drift from the
 * application layer. Idempotent and atomic.
 */
export async function syncPermissions(prisma: PrismaClient): Promise<void> {
  const existing = await prisma.permission.findMany({
    select: { id: true, name: true, description: true },
  });
  const existingByName = new Map(existing.map((p) => [p.name, p]));
  const seedByName = new Map(SEED_PERMISSIONS.map((p) => [p.name, p]));

  const toInsert = SEED_PERMISSIONS.filter(
    (seed) => !existingByName.has(seed.name),
  );

  const toUpdate = existing.filter(
    (row) => seedByName.get(row.name)?.description !== row.description,
  );

  const toPrune = existing.filter((row) => !seedByName.has(row.name));

  if (toInsert.length === 0 && toUpdate.length === 0 && toPrune.length === 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    if (toInsert.length > 0) {
      await tx.permission.createMany({ data: toInsert, skipDuplicates: true });
    }

    for (const row of toUpdate) {
      const seed = seedByName.get(row.name);
      if (seed) {
        await tx.permission.update({
          where: { id: row.id },
          data: { description: seed.description },
        });
      }
    }

    if (toPrune.length > 0) {
      await tx.permission.deleteMany({
        where: { id: { in: toPrune.map((p) => p.id) } },
      });
    }
  });
}
