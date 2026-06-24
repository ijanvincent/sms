import "dotenv/config";

import { generateApiKey } from "@/lib/auth/api-key";
import { prisma } from "@/lib/db";

// Usage: npm run key:create -- "label" [dailyQuota]
// Prints the raw key once; only its hash is stored. Omit the quota for unlimited.
async function main() {
  const label = process.argv[2] ?? "default";
  const quotaArg = process.argv[3];
  const dailyQuota = quotaArg ? Number.parseInt(quotaArg, 10) : null;
  if (dailyQuota !== null && (!Number.isInteger(dailyQuota) || dailyQuota < 1)) {
    console.error("dailyQuota must be a positive integer");
    process.exit(1);
  }

  const { raw, hashedKey, prefix } = generateApiKey();
  await prisma.apiKey.create({ data: { label, hashedKey, prefix, dailyQuota } });
  console.log(raw);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
