FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg python3 python3-opencv && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages ./packages
COPY worker ./worker
RUN corepack enable && pnpm install --frozen-lockfile --filter @clipforge/worker... || pnpm install
ENV NODE_ENV=production WORKER_CONCURRENCY=1
CMD ["pnpm", "--filter", "@clipforge/worker", "start"]
