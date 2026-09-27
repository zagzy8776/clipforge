/**
 * ClipForge Auth — standalone implementation for Vercel deployment.
 * No workspace package dependencies needed.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const SECRET = process.env.CLIPFORGE_API_SECRET || "clipforge-dev-secret";
const SALT_LENGTH = 32;
const HASH_LENGTH = 64;
const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

// ── Password hashing ──

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const { scryptSync } = require("node:crypto");
  const hash = scryptSync(password, salt, HASH_LENGTH, { cost: 16384, blockSize: 8, parallelization: 1 });
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [saltHex, hashHex] = storedHash.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const stored = Buffer.from(hashHex, "hex");
  const { scryptSync } = require("node:crypto");
  const hash = scryptSync(password, salt, HASH_LENGTH, { cost: 16384, blockSize: 8, parallelization: 1 });
  return timingSafeEqual(hash, stored);
}

// ── Session tokens ──

export interface SessionPayload { userId: string; email: string; iat: number; exp: number; }
export interface Session { user: { id: string; email: string; name?: string }; token: string; expiresAt: number; }

export function createSessionToken(userId: string, email: string): string {
  const payload = { userId, email, iat: Date.now(), exp: Date.now() + TOKEN_EXPIRY_MS };
  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHash("sha256").update(b64 + SECRET).digest("hex");
  return `${b64}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [b64, sig] = parts;
  const expected = createHash("sha256").update(b64 + SECRET).digest("hex");
  if (Buffer.byteLength(sig) !== Buffer.byteLength(expected)) return null;
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload: SessionPayload = JSON.parse(Buffer.from(b64, "base64url").toString());
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch { return null; }
}

// ── User store (in-memory for Vercel serverless) ──

interface User { id: string; email: string; name?: string; passwordHash: string; createdAt: string; }

const userStore = new Map<string, User>();
const sessionStore = new Map<string, Session>();

export function createSession(userId: string, email: string, name?: string): Session {
  const token = createSessionToken(userId, email);
  const session: Session = { user: { id: userId, email, name }, token, expiresAt: Date.now() + TOKEN_EXPIRY_MS };
  sessionStore.set(token, session);
  return session;
}

export function validateSession(token: string): Session | null {
  const session = sessionStore.get(token);
  if (!session || Date.now() > session.expiresAt) { sessionStore.delete(token); return null; }
  if (!verifySessionToken(token)) { sessionStore.delete(token); return null; }
  return session;
}

export function destroySession(token: string): void { sessionStore.delete(token); }

export async function registerUser(email: string, password: string, name?: string): Promise<{ user: User; session: Session }> {
  for (const u of userStore.values()) { if (u.email === email) throw new Error("Email already registered"); }
  const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const passwordHash = await hashPassword(password);
  const user: User = { id, email, name, passwordHash, createdAt: new Date().toISOString() };
  userStore.set(id, user);
  return { user, session: createSession(id, email, name) };
}

export async function loginUser(email: string, password: string): Promise<Session> {
  let found: User | undefined;
  for (const u of userStore.values()) { if (u.email === email) { found = u; break; } }
  if (!found) throw new Error("Invalid email or password");
  if (!await verifyPassword(password, found.passwordHash)) throw new Error("Invalid email or password");
  return createSession(found.id, found.email, found.name);
}
