# Base for dev/build
FROM node:26-slim AS base
WORKDIR /are-they-alive

# Install the pnpm version pinned in package.json (volta), kept current by Renovate
COPY package.json ./
RUN npm install -g "pnpm@$(node -p "require('./package.json').volta.pnpm")"

# Install all (dev) deps
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml ./

# Use a cache for the pnpm store to speed subsequent builds
RUN --mount=type=cache,target=/root/.pnpm-store \
  pnpm install --frozen-lockfile

# Build the app (frontend + backend)
FROM deps AS build
COPY src/ ./src
COPY public/ ./public
COPY vite.config.ts tsconfig.json postcss.config.cjs ./

ARG VITE_UMAMI_SRC_URL
ARG VITE_UMAMI_WEBSITE_ID

ENV VITE_UMAMI_SRC_URL=$VITE_UMAMI_SRC_URL
ENV VITE_UMAMI_WEBSITE_ID=$VITE_UMAMI_WEBSITE_ID

RUN pnpm run build

# Final runtime image: Nitro's .output is self-contained, no node_modules needed
FROM node:26-slim AS runner
RUN apt-get update \
  && apt-get install -y --no-install-recommends tzdata tini ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /are-they-alive

COPY --from=build --chown=node:node /are-they-alive/.output ./.output

ENV NODE_ENV=production
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", ".output/server/index.mjs"]
