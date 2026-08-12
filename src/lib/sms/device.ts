// The Android sender polls every five seconds. Three missed polls are enough to
// call it offline without letting a brief network hiccup make the UI flicker.
export const DEVICE_ONLINE_WINDOW_MS = 15_000;

export function isDeviceOnline(
  lastSeenAt: Date | null,
  now = Date.now(),
): boolean {
  return (
    lastSeenAt !== null &&
    lastSeenAt.getTime() >= now - DEVICE_ONLINE_WINDOW_MS
  );
}
