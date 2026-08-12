import "dotenv/config";

import {
  API_KEY_SCOPE,
  ALL_API_KEY_SCOPES,
  isApiKeyScope,
} from "@/lib/auth/api-key-scope";
import { prisma } from "@/lib/db";
import { createApiKey } from "@/server/services/api-key-service";

// Usage: npm run key:create -- "label" [scope] [dailyQuota]
//   scope: "client" (enqueue, default) or "gateway" (claim/report — the sender).
// Prints the raw key once; only its hash is stored. Omit the quota for unlimited.
// The dashboard's /keys page issues keys through the same service.
async function main() {
  const label = process.argv[2] ?? "default";

  const scope = process.argv[3] ?? API_KEY_SCOPE.CLIENT;
  if (!isApiKeyScope(scope)) {
    console.error(`scope must be one of: ${ALL_API_KEY_SCOPES.join(", ")}`);
    process.exit(1);
  }

  const quotaArg = process.argv[4];
  const dailyQuota = quotaArg ? Number.parseInt(quotaArg, 10) : null;
  if (dailyQuota !== null && (!Number.isInteger(dailyQuota) || dailyQuota < 1)) {
    console.error("dailyQuota must be a positive integer");
    process.exit(1);
  }

  const { raw } = await createApiKey({ label, scope, dailyQuota });
  console.log(raw);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
