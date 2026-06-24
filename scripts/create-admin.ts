import "dotenv/config";

import { hashPassword } from "@/lib/auth/admin";

// Usage: npm run admin:create -- "username" "password"
// Prints the .env lines to paste; the plaintext password is never stored.
async function main() {
  const username = process.argv[2];
  const password = process.argv[3];
  if (!username || !password) {
    console.error('Usage: npm run admin:create -- "username" "password"');
    process.exit(1);
  }

  const hash = await hashPassword(password);
  console.log("# Add these to your .env:");
  console.log(`ADMIN_USERNAME=${username}`);
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
