# ClipForge Production

All production work is on **master**.

## What's included

- Full Postgres schema (orgs, projects, jobs, clips, usage)
- docker-compose (Postgres, Redis, MinIO, worker, web)
- STT: Deepgram + Groq + silence fallback
- Speaker tracking, silence removal, multi-aspect export
- Publishing: YouTube Shorts, TikTok, Instagram Reels
- Brand kits, billing limits, captions, B-roll, translation
- Auth middleware, webhooks, analytics
- Review UI, upload, landing page

## Quick start

```bash
cp .env.example .env
# add DEEPGRAM_API_KEY / GROQ_API_KEY
docker compose up -d
pnpm install
```

Stripe billing left for a later pass.
