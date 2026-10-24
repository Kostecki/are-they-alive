# Base for dev/build. Runs on the build machine's own platform even for
# cross-platform builds: the output is plain JS (no native modules), so only
# the runner stage needs the target platform, and the build skips QEMU.
FROM --platform=$BUILDPLATFORM node:26.12.1-slim AS base
WORKDIR /are-they-alive

# Install the pnpm version from package.json's packageManager field, kept current by Renovate
COPY package.json ./
RUN npm install -g "pnpm@$(node -p "require('./package.json').packageManager.split('@')[1].split('+')[0]")"

# Install all (dev) deps
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml ./

# Use a cache for the pnpm store to speed subsequent builds. The store path is
# set explicitly; pnpm's default (~/.local/share/pnpm/store) isn't the mount.
RUN --mount=type=cache,target=/pnpm/store \
  pnpm install --frozen-lockfile --store-dir /pnpm/store

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

# Just the Node binary, without debug symbols (~20MB). The official image's
# npm, yarn and headers aren't needed at runtime.
FROM node:26.12.1-alpine3.24 AS node
RUN apk add --no-cache binutils && strip /usr/local/bin/node

# Final runtime image: Nitro's .output is self-contained, no node_modules needed.
# Alpine (musl) is safe because the output has no native modules; keep its
# version in step with the node image above.
FROM alpine:3.24.3 AS runner
# Node bundles its own CA certificates and time zone data, so it only needs
# the C++ runtime; tini runs as PID 1
RUN apk add --no-cache libstdc++ tini \
  && addgroup -g 1000 node \
  && adduser -u 1000 -G node -s /bin/sh -D node
COPY --from=node /usr/local/bin/node /usr/local/bin/node

WORKDIR /are-they-alive

# Owned by root, so the app running as node can't modify its own code
COPY --from=build /are-they-alive/.output ./.output

ENV NODE_ENV=production
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", ".output/server/index.mjs"]
