import type { PublishRequest, PublishResult } from "./platforms.js";

const GRAPH = "https://graph.facebook.com/v21.0";

export async function publishInstagramReels(req: PublishRequest): Promise<PublishResult> {
  if (!req.accessToken) return { platform: "instagram_reels", success: false, error: "Missing Instagram access token" };
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (!igUserId) return { platform: "instagram_reels", success: false, error: "INSTAGRAM_BUSINESS_ACCOUNT_ID not configured" };
  try {
    const videoUrl = req.videoPathOrUrl.startsWith("http") ? req.videoPathOrUrl : null;
    if (!videoUrl) return { platform: "instagram_reels", success: false, error: "Instagram requires a public HTTPS video URL" };
    const containerRes = await fetch(`${GRAPH}/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ media_type: "REELS", video_url: videoUrl, caption: `${req.title}\n\n${req.description ?? ""}`.slice(0, 2200), share_to_feed: true, access_token: req.accessToken }),
    });
    if (!containerRes.ok) return { platform: "instagram_reels", success: false, error: `Container failed: ${await containerRes.text()}` };
    const containerData = await containerRes.json() as { id?: string };
    const creationId = containerData.id;
    if (!creationId) return { platform: "instagram_reels", success: false, error: "No creation_id" };
    let status = "IN_PROGRESS";
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const statusRes = await fetch(`${GRAPH}/${creationId}?fields=status_code&access_token=${req.accessToken}`);
      const statusData = await statusRes.json() as { status_code?: string };
      status = statusData.status_code ?? "ERROR";
      if (status === "FINISHED" || status === "ERROR") break;
    }
    if (status !== "FINISHED") return { platform: "instagram_reels", success: false, error: `Container status: ${status}` };
    const publishRes = await fetch(`${GRAPH}/${igUserId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: creationId, access_token: req.accessToken }),
    });
    if (!publishRes.ok) return { platform: "instagram_reels", success: false, error: `Publish failed: ${await publishRes.text()}` };
    const publishData = await publishRes.json() as { id?: string };
    return { platform: "instagram_reels", success: true, externalId: publishData.id, url: publishData.id ? `https://www.instagram.com/reel/${publishData.id}/` : undefined };
  } catch (err: any) {
    return { platform: "instagram_reels", success: false, error: err.message };
  }
}
