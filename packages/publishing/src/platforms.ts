import { publishYouTubeShorts } from "./youtube.js";
import { publishTikTok } from "./tiktok.js";
import { publishInstagramReels } from "./instagram.js";

export type Platform = "tiktok" | "youtube_shorts" | "instagram_reels" | "linkedin" | "x";

export interface PublishRequest {
  platform: Platform;
  videoPathOrUrl: string;
  title: string;
  description?: string;
  tags?: string[];
  privacy?: "public" | "private" | "unlisted";
  accessToken: string;
}

export interface PublishResult {
  platform: Platform;
  success: boolean;
  externalId?: string;
  url?: string;
  error?: string;
}

export async function publishClip(req: PublishRequest): Promise<PublishResult> {
  switch (req.platform) {
    case "youtube_shorts": return publishYouTubeShorts(req);
    case "tiktok": return publishTikTok(req);
    case "instagram_reels": return publishInstagramReels(req);
    case "linkedin": return { platform: "linkedin", success: false, error: "LinkedIn — Phase 2" };
    case "x": return { platform: "x", success: false, error: "X — Phase 2" };
    default: return { platform: req.platform, success: false, error: "Unsupported platform" };
  }
}
