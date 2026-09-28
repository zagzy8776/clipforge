import type { PublishRequest, PublishResult } from "./platforms.js";

const YT_UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos";

export async function publishYouTubeShorts(req: PublishRequest): Promise<PublishResult> {
  if (!req.accessToken) return { platform: "youtube_shorts", success: false, error: "Missing YouTube access token" };
  try {
    const metadata = {
      snippet: { title: req.title.slice(0, 100), description: (req.description ?? "") + "\n\n#Shorts", tags: req.tags ?? ["shorts"], categoryId: "22" },
      status: { privacyStatus: req.privacy ?? "public", selfDeclaredMadeForKids: false },
    };
    const initRes = await fetch(`${YT_UPLOAD_URL}?uploadType=resumable&part=snippet,status`, {
      method: "POST",
      headers: { Authorization: `Bearer ${req.accessToken}`, "Content-Type": "application/json", "X-Upload-Content-Type": "video/mp4" },
      body: JSON.stringify(metadata),
    });
    if (!initRes.ok) return { platform: "youtube_shorts", success: false, error: `Init failed: ${await initRes.text()}` };
    const uploadUrl = initRes.headers.get("location");
    if (!uploadUrl) return { platform: "youtube_shorts", success: false, error: "No upload URL" };
    const fs = await import("node:fs/promises");
    const buffer = await fs.readFile(req.videoPathOrUrl);
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { Authorization: `Bearer ${req.accessToken}`, "Content-Type": "video/mp4", "Content-Length": String(buffer.byteLength) },
      body: buffer,
    });
    if (!uploadRes.ok) return { platform: "youtube_shorts", success: false, error: `Upload failed: ${await uploadRes.text()}` };
    const data = await uploadRes.json() as { id?: string };
    if (!data.id) return { platform: "youtube_shorts", success: false, error: "No video ID" };
    return { platform: "youtube_shorts", success: true, externalId: data.id, url: `https://youtube.com/shorts/${data.id}` };
  } catch (err: any) {
    return { platform: "youtube_shorts", success: false, error: err.message };
  }
}
