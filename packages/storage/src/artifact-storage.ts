import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

/* -------------------------------------------------------------------------- */
/* ArtifactStorage interface                                                   */
/* -------------------------------------------------------------------------- */

export interface PutOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface ArtifactInfo {
  key: string;
  size: number;
  contentType: string;
  lastModified: string;
}

export interface ArtifactStorage {
  put(key: string, data: Buffer | string, opts?: PutOptions): Promise<string>;
  get(key: string): Promise<Buffer>;
  getSignedUrl(key: string, expiresInSec?: number): Promise<string>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  head(key: string): Promise<ArtifactInfo>;
  /** List artifacts with a prefix. */
  list(prefix: string): Promise<ArtifactInfo[]>;
}

/* -------------------------------------------------------------------------- */
/* LocalArtifactStorage — file system backed                                   */
/* -------------------------------------------------------------------------- */

export class LocalArtifactStorage implements ArtifactStorage {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
    mkdirSync(basePath, { recursive: true });
  }

  async put(key: string, data: Buffer | string, _opts?: PutOptions): Promise<string> {
    const fullPath = join(this.basePath, key);
    mkdirSync(dirname(fullPath), { recursive: true });
    const buf = typeof data === "string" ? Buffer.from(data, "utf-8") : data;
    writeFileSync(fullPath, buf);
    return key;
  }

  async get(key: string): Promise<Buffer> {
    const fullPath = join(this.basePath, key);
    if (!existsSync(fullPath)) throw new Error(`Artifact not found: ${key}`);
    return readFileSync(fullPath);
  }

  async getSignedUrl(key: string, _expiresInSec?: number): Promise<string> {
    // Local: return file:// URL (for dev; in prod, S3 returns presigned URLs)
    const fullPath = join(this.basePath, key);
    if (!existsSync(fullPath)) throw new Error(`Artifact not found: ${key}`);
    return `file://${fullPath.replace(/\\/g, "/")}`;
  }

  async exists(key: string): Promise<boolean> {
    return existsSync(join(this.basePath, key));
  }

  async delete(key: string): Promise<void> {
    const fullPath = join(this.basePath, key);
    if (existsSync(fullPath)) unlinkSync(fullPath);
  }

  async head(key: string): Promise<ArtifactInfo> {
    const fullPath = join(this.basePath, key);
    if (!existsSync(fullPath)) throw new Error(`Artifact not found: ${key}`);
    const stat = statSync(fullPath);
    return {
      key,
      size: stat.size,
      contentType: "application/octet-stream",
      lastModified: stat.mtime.toISOString(),
    };
  }

  async list(prefix: string): Promise<ArtifactInfo[]> {
    const { readdirSync } = await import("node:fs");
    const results: ArtifactInfo[] = [];
    const dir = join(this.basePath, prefix);
    if (!existsSync(dir)) return results;

    const walk = (d: string) => {
      for (const entry of readdirSync(d, { withFileTypes: true })) {
        const fullPath = join(d, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else {
          const rel = fullPath.slice(this.basePath.length + 1).replace(/\\/g, "/");
          if (rel.startsWith(prefix)) {
            const stat = statSync(fullPath);
            results.push({ key: rel, size: stat.size, contentType: "application/octet-stream", lastModified: stat.mtime.toISOString() });
          }
        }
      }
    };
    walk(dir);
    return results;
  }
}
