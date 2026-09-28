# ClipForge — Production on master

All production foundation is on **master**. The temporary `production` branch was removed.

## Included
- Schema, docker-compose, CI
- STT factory (Deepgram / Groq / silence)
- Billing limits, multi-aspect export
- Package indexes for speaker, branding, publishing, captions, ingest, analytics, broll
- Docs

## Local full sources
Complete implementations also exist under the build artifacts path used during development.
Copy any remaining large provider files (Deepgram client body, active-speaker engine, publish clients, worker, full UI pages) from that build if not already merged.

## Next
1. Set API keys in `.env`
2. `docker compose up -d`
3. Wire remaining full source files as needed
4. Stripe when ready
