import type { PublishRequest, PublishResult } from "./platforms.js";

const TIKTOK_API = "https://open.tiktokapis.com/v2";

export async function publishTikTok(req: PublishRequest): Promise<PublishResult> {
  if (!req.accessToken) return { platform: "tiktok", success: false, error: "Missing TikTok access token" };
  try {
    await fetch(`${TIKTOK_API}/post/publish/creator_info/query/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${req.accessToken}`, "Content-Type": "application/json" },
    });
    const fs = await import("node:fs/promises");
    const buffer = await fs.readFile(req.videoPathOrUrl);
    const size = buffer.byteLength;
    const initRes = await fetch(`${TIKTOK_API}/post/publish/video/init/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${req.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        post_info: { title: req.title.slice(0, 150), privacy_level: req.privacy === "public" ? "PUBLIC_TO_EVERYONE" : "SELF_ONLY", disable_duet: false, disable_comment: false, disable_stitch: false, video_cover_timestamp_ms: 1000 },
        source_info: { source: "FILE_UPLOAD", video_size: size, chunk_size: size, total_chunk_count: 1 },
      }),
    });
    if (!initRes.ok) return { platform: "tiktok", success: false, error: `Init failed: ${await initRes.text()}` };
    const initData = await initRes.json() as { data?: { publish_id?: string; upload_url?: string } };
    const uploadUrl = initData.data?.upload_url;
    const publishId = initData.data?.publish_id;
    if (!uploadUrl || !publishId) return { platform: "tiktok", success: false, error: "No upload_url or publish_id" };
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "video/mp4", "Content-Length": String(size), "Content-Range": `bytes 0-${size - 1}/${size}` },
      body: buffer,
    });
    if (!uploadRes.ok) return { platform: "tiktok", success: false, error: `Upload failed: ${await uploadRes.text()}` };
    return { platform: "tiktok", success: true, externalId: publishId };
  } catch (err: any) {
    return { platform: "tiktok", success: false, error: err.message };
  }
}
