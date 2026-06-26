// Best-effort client IP, used only as a key for rate-limiting / throttling.
// Trusts the standard reverse-proxy headers; on an untrusted network these can
// be spoofed, so treat this as a throttling aid, never an authorization control.
// Deploy behind a proxy you control that sets `X-Forwarded-For` from the real
// peer for this to be reliable.
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
