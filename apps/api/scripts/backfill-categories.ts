/**
 * One-time backfill: seed default categories for existing users who have none.
 * Run: npx tsx --env-file=.env scripts/backfill-categories.ts
 */
import { PrismaClient } from "@prisma/client";
import { seedUserCategories } from "../src/lib/seed.js";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  console.log(`Found ${users.length} user(s). Checking for missing categories...`);

  let seeded = 0;
  let skipped = 0;

  for (const user of users) {
    const count = await prisma.category.count({ where: { user_id: user.id } });
    if (count > 0) {
      console.log(`  SKIP  ${user.email} — already has ${count} categories`);
      skipped++;
    } else {
      await seedUserCategories(user.id);
      const newCount = await prisma.category.count({ where: { user_id: user.id } });
      console.log(`  SEEDED ${user.email} — ${newCount} categories created`);
      seeded++;
    }
  }

  console.log(`\nDone. Seeded: ${seeded}, Skipped: ${skipped}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
