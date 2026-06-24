import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export const SESSION_COOKIE = "sms_session";
export const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

const ALG = "HS256";
const ISSUER = "sms-gateway";

// Edge-compatible: jose + Web Crypto only, so this module is safe to import
// from middleware. Never import the Node-only admin module here.
function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set. Add it to your .env.");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(subject: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: ALG })
    .setSubject(subject)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      issuer: ISSUER,
    });
    return payload;
  } catch {
    return null;
  }
}
