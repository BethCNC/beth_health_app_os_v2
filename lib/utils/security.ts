import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;

export function hashSecret(secret: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(secret, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifySecret(secret: string, encodedHash: string): boolean {
  const [salt, hash] = encodedHash.split(":");
  if (!salt || !hash) {
    return false;
  }

  const secretBuffer = scryptSync(secret, salt, KEY_LENGTH);
  const hashBuffer = Buffer.from(hash, "hex");
  if (secretBuffer.length !== hashBuffer.length) {
    return false;
  }

  return timingSafeEqual(secretBuffer, hashBuffer);
}
