# ================= INSTALL BUN ===================
ARG BUN_VERSION=1.3.9

FROM oven/bun:${BUN_VERSION}-slim AS bun

FROM node:24-bullseye-slim AS base

COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
RUN ln -s /usr/local/bin/bun /usr/local/bin/bunx

RUN apt-get update -qq \
    && apt-get install -qq --no-install-recommends \
    build-essential \
    ca-certificates \
    git \
    g++ \
    openssl \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# =============== INSTALL & BUILD =================

FROM base AS builder
ARG SCOPE
COPY . .
RUN SENTRYCLI_SKIP_DOWNLOAD=1 bun install --frozen-lockfile
RUN SKIP_ENV_CHECK=true DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder NEXT_PUBLIC_VIEWER_URL=http://localhost bunx nx build ${SCOPE}
RUN DATABASE_URL=postgresql:// bunx nx db:generate prisma

# ================== RELEASE ======================

FROM node:24-bullseye-slim AS release
ARG SCOPE
ENV SCOPE=${SCOPE}

RUN apt-get update -qq \
    && apt-get install -qq --no-install-recommends \
    bash \
    ca-certificates \
    dos2unix \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Next standalone runtime (minimal app runtime dependencies)
COPY --from=builder --chown=node:node /app/apps/${SCOPE}/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/${SCOPE}/.next/static ./apps/${SCOPE}/.next/static
COPY --from=builder --chown=node:node /app/apps/${SCOPE}/public ./apps/${SCOPE}/public

# Prisma runtime pieces (builder entrypoint runs migrations)
COPY --from=builder /app/packages/prisma/postgresql ./packages/prisma/postgresql
COPY --from=builder /app/packages/prisma/prisma.config.ts ./packages/prisma/prisma.config.ts
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Runtime env injection helper used by entrypoint
COPY --from=builder /app/node_modules/next-runtime-env ./node_modules/next-runtime-env

COPY scripts/${SCOPE}-entrypoint.sh ./
RUN dos2unix ./${SCOPE}-entrypoint.sh \
    && chmod +x ./${SCOPE}-entrypoint.sh \
    && ln -s ./${SCOPE}-entrypoint.sh ./entrypoint.sh

USER node
ENTRYPOINT ["/app/entrypoint.sh"]

EXPOSE 3000
ENV PORT=3000
