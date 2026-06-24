import { prisma } from "@/lib/db";

export interface DeviceListItem {
  id: string;
  name: string;
  carrier: string | null;
  simNumber: string | null;
  enabled: boolean;
  lastSeenAt: Date | null;
  createdAt: Date;
  messageCount: number;
}

export async function listDevices(): Promise<DeviceListItem[]> {
  const devices = await prisma.device.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { messages: true } } },
  });

  return devices.map(({ _count, ...device }) => ({
    ...device,
    messageCount: _count.messages,
  }));
}
