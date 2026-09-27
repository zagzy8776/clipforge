import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const SALT_LENGTH = 32;
const HASH_LENGTH = 64;

export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve) => {
    const salt = randomBytes(SALT_LENGTH);
    const { scryptSync } = require("node:crypto");
    const hash = scryptSync(password, salt, HASH_LENGTH, { cost: 16384, blockSize: 8, parallelization: 1 });
    resolve(`${salt.toString("hex")}:${hash.toString("hex")}`);
  });
}

export function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve) => {
    const [saltHex, hashHex] = storedHash.split(":");
    if (!saltHex || !hashHex) return resolve(false);
    const salt = Buffer.from(saltHex, "hex");
    const storedHashBuf = Buffer.from(hashHex, "hex");
    const { scryptSync } = require("node:crypto");
    const hash = scryptSync(password, salt, HASH_LENGTH, { cost: 16384, blockSize: 8, parallelization: 1 });
    resolve(timingSafeEqual(hash, storedHashBuf));
  });
}

/* -------------------------------------------------------------------------- */
/* HMAC-signed session tokens                                                 */
/* -------------------------------------------------------------------------- */

export interface SessionPayload { userId: string; email: string; iat: number; exp: number; }

const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export function createSessionToken(userId: string, email: string, secret: string): string {
  const payload = { userId, email, iat: Date.now(), exp: Date.now() + TOKEN_EXPIRY_MS };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHash("sha256").update(payloadB64 + secret).digest("hex");
  return `${payloadB64}.${signature}`;
}

export function verifySessionToken(token: string, secret: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, signature] = parts;
  const expected = createHash("sha256").update(payloadB64 + secret).digest("hex");
  if (Buffer.byteLength(signature) !== Buffer.byteLength(expected)) return null;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const payload: SessionPayload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch { return null; }
}
