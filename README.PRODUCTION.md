# ClipForge — Production Branch

This branch contains the full production foundation built for the long-form → short-form SaaS.

## Quick start

```bash
git checkout production
cp .env.example .env
# fill DEEPGRAM_API_KEY, GROQ_API_KEY, etc.
docker compose up -d
pnpm install
pnpm clipforge path/to/video.mp4 output/
```

## Packages added

- `@clipforge/transcription` — Deepgram / Groq / silence
- `@clipforge/speaker` — active speaker tracking
- `@clipforge/ffmpeg` — silence, crop, multi-aspect, face track
- `@clipforge/publishing` — YouTube / TikTok / Instagram
- `@clipforge/branding` — brand kits
- `@clipforge/billing` — plan limits
- `@clipforge/captions` — styles + translation
- `@clipforge/ingest` — YouTube download
- `@clipforge/storage` — S3/R2
- `@clipforge/db` — Drizzle schema
- `@clipforge/analytics` — engagement prediction
- `@clipforge/api` — webhooks + MCP

See `docs/` for architecture and status.
