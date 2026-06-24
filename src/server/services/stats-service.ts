import { prisma } from "@/lib/db";
import { DEVICE_ONLINE_WINDOW_MS } from "@/lib/sms/device";
import { MESSAGE_STATUS } from "@/lib/sms/status";

export interface OverviewStats {
  messages: { total: number; pending: number; claimed: number; sent: number; failed: number };
  devices: { total: number; online: number };
}

export async function getOverviewStats(): Promise<OverviewStats> {
  const [total, pending, claimed, sent, failed, deviceTotal, online] = await Promise.all([
    prisma.message.count(),
    prisma.message.count({ where: { status: MESSAGE_STATUS.PENDING } }),
    prisma.message.count({ where: { status: MESSAGE_STATUS.CLAIMED } }),
    prisma.message.count({ where: { status: MESSAGE_STATUS.SENT } }),
    prisma.message.count({ where: { status: MESSAGE_STATUS.FAILED } }),
    prisma.device.count(),
    prisma.device.count({
      where: {
        lastSeenAt: { gte: new Date(Date.now() - DEVICE_ONLINE_WINDOW_MS) },
      },
    }),
  ]);

  return {
    messages: { total, pending, claimed, sent, failed },
    devices: { total: deviceTotal, online },
  };
}

export function getRecentMessages(limit = 8) {
  return prisma.message.findMany({ orderBy: { createdAt: "desc" }, take: limit });
}
