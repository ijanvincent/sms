import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

// Password hashes are stored as "<saltHex>:<derivedKeyHex>". scrypt is a
// memory-hard KDF available in the Node runtime, so no native dependency.
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, "hex");
  const derived = (await scryptAsync(
    password,
    Buffer.from(saltHex, "hex"),
    expected.length,
  )) as Buffer;

  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

// Verifies a login against the single admin credential held in the environment.
// The password hash is always evaluated so the response time does not reveal
// whether the username matched.
export async function verifyAdminCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  const expectedUsername = process.env.ADMIN_USERNAME;
  const storedHash = process.env.ADMIN_PASSWORD_HASH;
  if (!expectedUsername || !storedHash) {
    throw new Error(
      "ADMIN_USERNAME / ADMIN_PASSWORD_HASH are not set. Run `npm run admin:create`.",
    );
  }

  const passwordOk = await verifyPassword(password, storedHash);
  return username === expectedUsername && passwordOk;
}
