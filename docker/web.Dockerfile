FROM node:20-slim AS builder

WORKDIR /app
COPY apps/web/package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/ ./apps/web/
COPY packages/types/ ./packages/types/
RUN corepack enable && pnpm install --frozen-lockfile
RUN cd apps/web && pnpm build

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

ENV PORT=3000
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
