import "dotenv/config";

import { chmod, writeFile } from "node:fs/promises";

import { API_KEY_SCOPE } from "@/lib/auth/api-key-scope";
import { generateApiKey } from "@/lib/auth/api-key";
import { prisma } from "@/lib/db";
import { createDeviceSchema } from "@/server/validation/device";

const name = process.env.PROVISION_NAME;
const carrier = process.env.PROVISION_CARRIER ?? "";
const outputPath = process.env.PROVISION_OUTPUT;
const quotaText = process.env.PROVISION_CLIENT_DAILY_QUOTA ?? "100";
const dailyQuota = Number.parseInt(quotaText, 10);

if (!name || !outputPath) {
  throw new Error("PROVISION_NAME and PROVISION_OUTPUT are required");
}
if (!Number.isInteger(dailyQuota) || dailyQuota < 1) {
  throw new Error("PROVISION_CLIENT_DAILY_QUOTA must be a positive integer");
}

const deviceInput = createDeviceSchema.parse({ name, carrier });
const gatewayKey = generateApiKey();
const clientKey = generateApiKey();

const provisioned = await prisma.$transaction(async (tx) => {
  const device = await tx.device.create({
    data: {
      name: deviceInput.name,
      carrier: deviceInput.carrier,
    },
    select: { id: true, name: true, carrier: true },
  });

  await tx.apiKey.createMany({
    data: [
      {
        label: `${device.name} sender`,
        hashedKey: gatewayKey.hashedKey,
        prefix: gatewayKey.prefix,
        scope: API_KEY_SCOPE.GATEWAY,
      },
      {
        label: `${device.name} client`,
        hashedKey: clientKey.hashedKey,
        prefix: clientKey.prefix,
        scope: API_KEY_SCOPE.CLIENT,
        dailyQuota,
      },
    ],
  });

  return device;
});

await writeFile(
  outputPath,
  `${JSON.stringify(
    {
      deviceId: provisioned.id,
      deviceName: provisioned.name,
      carrier: provisioned.carrier,
      gatewayApiKey: gatewayKey.raw,
      clientApiKey: clientKey.raw,
      clientDailyQuota: dailyQuota,
    },
    null,
    2,
  )}\n`,
  { mode: 0o600 },
);
await chmod(outputPath, 0o600);
await prisma.$disconnect();

console.log(`Provisioned sender ${provisioned.id}; credentials written to the protected output file.`);
