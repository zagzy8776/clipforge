import type { ArtifactStorage, ArtifactInfo, PutOptions } from "./artifact-storage.js";

/**
 * S3-compatible artifact storage.
 * Works with AWS S3, MinIO, Cloudflare R2, etc.
 */
export class S3ArtifactStorage implements ArtifactStorage {
  private bucket: string;
  private endpoint: string;
  private accessKey: string;
  private secretKey: string;

  constructor(opts: { bucket: string; endpoint: string; accessKey: string; secretKey: string }) {
    this.bucket = opts.bucket;
    this.endpoint = opts.endpoint;
    this.accessKey = opts.accessKey;
    this.secretKey = opts.secretKey;
  }

  async put(key: string, data: Buffer | string, opts?: PutOptions): Promise<string> {
    const body = typeof data === "string" ? data : data;
    const contentType = opts?.contentType ?? "application/octet-stream";

    // Use S3 PutObject API
    await this.s3Request("PUT", key, body as Buffer, contentType);
    return key;
  }

  async get(key: string): Promise<Buffer> {
    const response = await this.s3Request("GET", key);
    return Buffer.from(await response.arrayBuffer());
  }

  async getSignedUrl(key: string, expiresInSec = 3600): Promise<string> {
    // In production: generate S3 presigned URL
    // For now: return the direct URL
    return `${this.endpoint}/${this.bucket}/${key}?expires=${expiresInSec}`;
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.s3Request("HEAD", key);
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    await this.s3Request("DELETE", key);
  }

  async head(key: string): Promise<ArtifactInfo> {
    const response = await this.s3Request("HEAD", key);
    return {
      key,
      size: parseInt(response.headers.get("content-length") ?? "0"),
      contentType: response.headers.get("content-type") ?? "application/octet-stream",
      lastModified: response.headers.get("last-modified") ?? new Date().toISOString(),
    };
  }

  async list(prefix: string): Promise<ArtifactInfo[]> {
    // Use S3 ListObjectsV2
    const url = `${this.endpoint}/${this.bucket}?prefix=${encodeURIComponent(prefix)}&list-type=2`;
    const response = await this.s3RequestUrl(url, "GET");
    const text = await response.text();
    // Parse XML response (simplified — in production use an S3 SDK)
    const items: ArtifactInfo[] = [];
    const keyMatches = text.matchAll(/<Key>([^<]+)<\/Key>/g);
    for (const match of keyMatches) {
      items.push({ key: match[1]!, size: 0, contentType: "application/octet-stream", lastModified: new Date().toISOString() });
    }
    return items;
  }

  private async s3Request(method: string, key: string, body?: Buffer, contentType?: string): Promise<Response> {
    const url = `${this.endpoint}/${this.bucket}/${key}`;
    return this.s3RequestUrl(url, method, body, contentType);
  }

  private async s3RequestUrl(url: string, method: string, body?: Buffer, contentType?: string): Promise<Response> {
    const headers: Record<string, string> = {
      "x-amz-date": new Date().toISOString().replace(/[:.]/g, "-"),
    };
    if (contentType) headers["Content-Type"] = contentType;

    return fetch(url, {
      method,
      headers,
      body: body as any,
    });
  }
}
