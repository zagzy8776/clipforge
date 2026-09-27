import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, createSessionToken, verifySessionToken } from "../packages/auth/src/crypto";
import { registerUser, loginUser, createSession, validateSession, destroySession } from "../packages/auth/src/index";

describe("Password Hashing", () => {
  it("hashes and verifies passwords", async () => {
    const hash = await hashPassword("secure-password-123");
    expect(hash).toContain(":");
    expect(await verifyPassword("secure-password-123", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("produces different hashes for same password", async () => {
    const h1 = await hashPassword("test");
    const h2 = await hashPassword("test");
    expect(h1).not.toBe(h2);
  });
});

describe("Session Tokens", () => {
  const secret = "test-secret-key";

  it("creates and verifies tokens", () => {
    const token = createSessionToken("user-1", "test@example.com", secret);
    expect(token).toContain(".");
    const payload = verifySessionToken(token, secret);
    expect(payload).not.toBeNull();
    expect(payload!.userId).toBe("user-1");
    expect(payload!.email).toBe("test@example.com");
  });

  it("rejects invalid tokens", () => {
    expect(verifySessionToken("invalid.token", secret)).toBeNull();
    expect(verifySessionToken("bad-signature." + "a".repeat(64), secret)).toBeNull();
  });

  it("rejects tokens with wrong secret", () => {
    const token = createSessionToken("user-1", "test@example.com", "secret-a");
    expect(verifySessionToken(token, "secret-b")).toBeNull();
  });
});

describe("User Registration & Login", () => {
  it("registers a new user", async () => {
    const { user, session } = await registerUser(`test-${Date.now()}@example.com`, "password123", "Test User");
    expect(user.email).toContain("@example.com");
    expect(user.name).toBe("Test User");
    expect(session.token).toBeTruthy();
  });

  it("logs in with correct credentials", async () => {
    const email = `login-${Date.now()}@example.com`;
    await registerUser(email, "mypassword");
    const session = await loginUser(email, "mypassword");
    expect(session.token).toBeTruthy();
    expect(session.user.email).toBe(email);
  });

  it("rejects wrong password", async () => {
    const email = `fail-${Date.now()}@example.com`;
    await registerUser(email, "correct-password");
    await expect(loginUser(email, "wrong-password")).rejects.toThrow("Invalid email or password");
  });

  it("rejects duplicate email", async () => {
    const email = `dup-${Date.now()}@example.com`;
    await registerUser(email, "password123");
    await expect(registerUser(email, "password456")).rejects.toThrow("already registered");
  });
});

describe("Session Management", () => {
  it("creates and validates sessions", () => {
    const session = createSession("user-1", "test@test.com", "Test");
    expect(validateSession(session.token)).not.toBeNull();
  });

  it("destroys sessions", () => {
    const session = createSession("user-2", "test2@test.com");
    destroySession(session.token);
    expect(validateSession(session.token)).toBeNull();
  });
});
