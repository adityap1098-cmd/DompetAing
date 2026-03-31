// Run with: tsx prisma/seed.ts
// This file is only for running as a script, not imported by API code.

async function main() {
  console.log("🌱 Seed: no global data to seed.");
  console.log("Per-user categories are created automatically on first login.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
