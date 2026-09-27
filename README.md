# ClipForge

**AI-powered long-form → short-form content engine.**

ClipForge understands your video first, identifies the strongest moments, then produces polished, ranked, ready-to-post short-form clips.

## Architecture

```
clipforge/
├── packages/
│   ├── types/        — Domain types + Zod schemas (single source of truth)
│   ├── ffmpeg/       — Binary resolution, probe, extract, silence detect, render
│   ├── ai/           — Provider abstraction + heuristic mock (runs without API keys)
│   ├── scoring/      — Weighted 7-dimension scoring + Jaccard deduplication
│   ├── transcription/— STT provider abstraction + silence-based fallback
│   ├── analysis/     — 3-pass content understanding pipeline
│   ├── rendering/    — Render plan builder + caption time remapping
│   └── core/         — Pipeline orchestrator (state machine + progress events)
├── apps/
│   ├── cli/          — CLI entry point
│   └── web/          — Next.js 16 dashboard (Tailwind v4)
├── tools/            — Test fixture generator
└── tests/            — Unit tests (vitest)
```

## Pipeline

```
VIDEO INPUT
    ↓
1. PROBE ─────────────── Extract metadata (codec, fps, resolution)
2. EXTRACT AUDIO ─────── Normalize to 16kHz mono WAV
3. TRANSCRIBE ────────── Timestamped segments (word-level)
4. UNDERSTAND (Pass 1) ─ Section detection, topic clustering
5. FIND CANDIDATES ───── Per-section moment mining
6. SCORE + RANK (Pass 3) ─ 7-dimension scoring + dedup + global rank
7. BUILD PLANS ───────── Silence removal + caption remapping + 9:16 reframe
8. RENDER ────────────── FFmpeg: trim → silence cut → crop → captions → encode
9. FINALIZE ──────────── analysis.json manifest + thumbnails
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Generate a test video
pnpm generate:fixture

# Run the full engine
pnpm clipforge input/test-fixture.mp4 output/test-run

# Run tests
pnpm test

# Type check
pnpm typecheck
```

## Configuration

All tunable parameters live in `EngineConfig`:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `targetClips` | 10 | Number of clips to produce |
| `minClipDuration` | 20s | Minimum clip length |
| `maxClipDuration` | 90s | Maximum clip length |
| `aspectRatio` | 9:16 | Output format |
| `captionStyle` | modern | ASS preset (modern/bold/dynamic/minimal/karaoke) |
| `crf` | 23 | Video quality (lower = better) |
| `duplicateThreshold` | 0.55 | Jaccard similarity for dedup |

## AI Providers

The engine works **without any API key** using the heuristic mock provider. To use real AI:

```bash
export OPENAI_API_KEY=sk-...   # GPT-4 for analysis + scoring
```

Provider priority:
- `OPENAI_API_KEY` → OpenAI (GPT-4)
- `ANTHROPIC_API_KEY` → Anthropic (Claude)
- No key → Heuristic local provider (deterministic, no I/O)

## Testing

10 unit tests covering:
- Lexical signal extraction (hook, emotion, novelty, curiosity, payoff, coherence)
- Weighted scoring engine
- Jaccard similarity deduplication

```bash
pnpm test
```

## Score Dimensions

Every clip is scored on 7 dimensions (0–100):

| Dimension | Weight | What it measures |
|-----------|--------|-----------------|
| Hook | 20% | Opening statement strength |
| Emotion | 15% | Emotional intensity markers |
| Novelty | 15% | Surprising or contrarian perspective |
| Information | 15% | Data density, specificity |
| Curiosity | 10% | Questions, cliffhangers, gaps |
| Payoff | 15% | Narrative resolution, resolution |
| Coherence | 10% | Self-contained story structure |

**Overall = Σ(dimension × weight)**

These are *Engagement Potential Scores*, not predictions of virality.

## Tech Stack

- **Runtime:** Node.js 20+
- **Language:** TypeScript 5.9 (strict, composite project references)
- **Video:** FFmpeg (bundled via @ffmpeg-installer)
- **Testing:** Vitest
- **Frontend:** Next.js 16, React 19, Tailwind CSS v4
- **Monorepo:** pnpm workspaces
