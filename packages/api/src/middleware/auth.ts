/**
 * API key authentication middleware.
 * Validates Bearer tokens against a set of known keys.
 */

const API_KEYS = new Map<string, { projectId?: string; createdAt: string }>();

/** Register an API key (for development/testing). */
export function registerApiKey(key: string, projectId?: string) {
  API_KEYS.set(key, { projectId, createdAt: new Date().toISOString() });
}

/** Validate an API key from an Authorization header. */
export function validateApiKey(authHeader: string | null): { valid: boolean; projectId?: string; error?: string } {
  if (!authHeader) return { valid: false, error: "Missing Authorization header" };

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return { valid: false, error: "Invalid Authorization format. Use: Bearer <key>" };
  }

  const key = parts[1];
  if (!key) return { valid: false, error: "Empty API key" };

  const record = API_KEYS.get(key);
  if (!record) return { valid: false, error: "Invalid API key" };

  return { valid: true, projectId: record.projectId };
}

/** Generate a random API key. */
export function generateApiKey(): string {
  return `cf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
}
