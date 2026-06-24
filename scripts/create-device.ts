import "dotenv/config";

import { prisma } from "@/lib/db";

// Usage: npm run device:create -- "name" "GLOBE"
// Prints the new device id (used by the gateway app to poll).
async function main() {
  const name = process.argv[2] ?? "default-device";
  const carrier = process.argv[3];
  const device = await prisma.device.create({ data: { name, carrier } });
  console.log(device.id);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
