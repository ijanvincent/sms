import { prisma } from "@/lib/db";
import { DEVICE_ONLINE_WINDOW_MS } from "@/lib/sms/device";
import { MESSAGE_STATUS } from "@/lib/sms/status";

export interface OverviewStats {
  messages: { total: number; pending: number; claimed: number; sent: number; failed: number };
  devices: { total: number; online: number };
}

export async function getOverviewStats(): Promise<OverviewStats> {
  const [byStatus, deviceTotal, online] = await Promise.all([
    // One GROUP BY instead of five separate COUNT(*) queries.
    prisma.message.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.device.count(),
    prisma.device.count({
      where: {
        lastSeenAt: { gte: new Date(Date.now() - DEVICE_ONLINE_WINDOW_MS) },
      },
    }),
  ]);

  const countFor = (status: string) =>
    byStatus.find((row) => row.status === status)?._count._all ?? 0;

  return {
    messages: {
      total: byStatus.reduce((sum, row) => sum + row._count._all, 0),
      pending: countFor(MESSAGE_STATUS.PENDING),
      claimed: countFor(MESSAGE_STATUS.CLAIMED),
      sent: countFor(MESSAGE_STATUS.SENT),
      failed: countFor(MESSAGE_STATUS.FAILED),
    },
    devices: { total: deviceTotal, online },
  };
}

export function getRecentMessages(limit = 8) {
  return prisma.message.findMany({ orderBy: { createdAt: "desc" }, take: limit });
}
