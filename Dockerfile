FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy workspace config + lockfile first (Docker layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

# Install all deps (devDeps needed for tsc + vite build)
RUN NODE_ENV=development pnpm install --frozen-lockfile

# Copy full source
COPY tsconfig.base.json ./
COPY packages/ packages/
COPY apps/ apps/

# Vite embeds VITE_* at build time
ARG VITE_AUTH0_DOMAIN
ARG VITE_AUTH0_CLIENT_ID
ARG VITE_AUTH0_AUDIENCE
ARG VITE_API_URL

# Build shared package first, then web + api
RUN pnpm --filter @mailhub/shared build
RUN pnpm --filter @mailhub/web build
RUN pnpm --filter @mailhub/api build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "--max-old-space-size=512", "apps/api/build/server.js"]
