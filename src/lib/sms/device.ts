// A device is "online" while its heartbeat is recent; the gateway app is
// expected to touch lastSeenAt on every poll.
export const DEVICE_ONLINE_WINDOW_MS = 2 * 60 * 1000;

export function isDeviceOnline(lastSeenAt: Date | null): boolean {
  return (
    lastSeenAt !== null &&
    lastSeenAt.getTime() >= Date.now() - DEVICE_ONLINE_WINDOW_MS
  );
}
