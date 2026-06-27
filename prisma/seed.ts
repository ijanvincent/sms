import "dotenv/config";

import { prisma } from "@/lib/db";
import { normalizePhMobile } from "@/lib/sms/phone";

// Known development devices, re-created idempotently after a database reset
// (e.g. `prisma migrate reset` or a `docker compose down -v` followed by a
// fresh seed). Real devices will self-register through the Android gateway app
// once it exists; until then this keeps a usable device row in place.
//
// `id` is stable and human-readable so the upsert is idempotent and the gateway
// poll target stays the same across resets.
const SEED_DEVICES: ReadonlyArray<{
  id: string;
  name: string;
  carrier: string;
  rawSim: string;
}> = [
  {
    id: "seed-honor-tm",
    name: "Honor TM",
    carrier: "TM",
    // Placeholder number — the real SIM self-registers via the Android gateway.
    rawSim: "09171234567",
  },
];

async function main() {
  for (const { id, name, carrier, rawSim } of SEED_DEVICES) {
    const simNumber = normalizePhMobile(rawSim);
    if (!simNumber) {
      throw new Error(`Invalid PH mobile number for seed device "${name}": ${rawSim}`);
    }

    const device = await prisma.device.upsert({
      where: { id },
      update: { name, carrier, simNumber },
      create: { id, name, carrier, simNumber },
    });

    console.log(`Seeded device ${device.id} (${device.name}, ${device.simNumber})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
