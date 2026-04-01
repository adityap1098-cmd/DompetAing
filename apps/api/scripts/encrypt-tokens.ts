// ══════════════════════════════════════════════════════════
// Migration: Encrypt existing plain-text OAuth tokens
//
// Usage: npx tsx --env-file=.env scripts/encrypt-tokens.ts
// ══════════════════════════════════════════════════════════

import { PrismaClient } from "@prisma/client";
import { encryptToken, isEncrypted } from "../src/lib/crypto.js";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, access_token: true, refresh_token: true },
  });

  console.log(`Found ${users.length} users to check`);

  let encrypted = 0;
  let skipped = 0;

  for (const user of users) {
    const needsUpdate: Record<string, string | null> = {};

    if (user.access_token && !isEncrypted(user.access_token)) {
      needsUpdate.access_token = encryptToken(user.access_token);
    }

    if (user.refresh_token && !isEncrypted(user.refresh_token)) {
      needsUpdate.refresh_token = encryptToken(user.refresh_token);
    }

    if (Object.keys(needsUpdate).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: needsUpdate,
      });
      encrypted++;
      console.log(`✅ Encrypted tokens for: ${user.email}`);
    } else {
      skipped++;
      console.log(`⏭️  Already encrypted: ${user.email}`);
    }
  }

  console.log(`\nDone: ${encrypted} encrypted, ${skipped} skipped`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
