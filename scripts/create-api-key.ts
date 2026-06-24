import "dotenv/config";

import { generateApiKey } from "@/lib/auth/api-key";
import { prisma } from "@/lib/db";

// Usage: npm run key:create -- "label"
// Prints the raw key once; only its hash is stored.
async function main() {
  const label = process.argv[2] ?? "default";
  const { raw, hashedKey, prefix } = generateApiKey();
  await prisma.apiKey.create({ data: { label, hashedKey, prefix } });
  console.log(raw);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
