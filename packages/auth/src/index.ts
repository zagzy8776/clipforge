import { hashPassword, verifyPassword, createSessionToken, verifySessionToken } from "./crypto.js";
import type { SessionPayload } from "./crypto.js";

export interface User { id: string; email: string; name?: string; passwordHash: string; createdAt: string; }
export interface Session { user: { id: string; email: string; name?: string }; token: string; expiresAt: number; }

const userStore = new Map<string, User>();
const sessionStore = new Map<string, Session>();

export function createSession(userId: string, email: string, name?: string): Session {
  const secret = process.env.CLIPFORGE_API_SECRET || "dev-secret";
  const token = createSessionToken(userId, email, secret);
  const session: Session = { user: { id: userId, email, name }, token, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  sessionStore.set(token, session);
  return session;
}

export function validateSession(token: string): Session | null {
  const session = sessionStore.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) { sessionStore.delete(token); return null; }
  const secret = process.env.CLIPFORGE_API_SECRET || "dev-secret";
  if (!verifySessionToken(token, secret)) { sessionStore.delete(token); return null; }
  return session;
}

export function destroySession(token: string): void { sessionStore.delete(token); }

export async function registerUser(email: string, password: string, name?: string): Promise<{ user: User; session: Session }> {
  for (const u of userStore.values()) { if (u.email === email) throw new Error("Email already registered"); }
  const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const passwordHash = await hashPassword(password);
  const user: User = { id, email, name, passwordHash, createdAt: new Date().toISOString() };
  userStore.set(id, user);
  const session = createSession(id, email, name);
  return { user, session };
}

export async function loginUser(email: string, password: string): Promise<Session> {
  let found: User | undefined;
  for (const u of userStore.values()) { if (u.email === email) { found = u; break; } }
  if (!found) throw new Error("Invalid email or password");
  const valid = await verifyPassword(password, found.passwordHash);
  if (!valid) throw new Error("Invalid email or password");
  return createSession(found.id, found.email, found.name);
}

export function getUserFromToken(token: string): User | null {
  const session = validateSession(token);
  return session ? (userStore.get(session.user.id) ?? null) : null;
}

export { hashPassword, verifyPassword, createSessionToken, verifySessionToken };
