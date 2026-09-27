# ClipForge Production Architecture

**Version:** 1.0.0
**Status:** Living document

## Vision
ClipForge turns long-form video into ranked, ready-to-post short-form clips for TikTok, Reels, and Shorts.

## Stack
- Next.js 16 + TypeScript
- Postgres 16 + Drizzle
- Redis + BullMQ
- S3/R2/MinIO
- Deepgram / Groq STT
- FFmpeg + face tracking

See full docs in repo for pipeline stages, packages, and NFRs.
