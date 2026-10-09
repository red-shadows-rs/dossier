# Dossier — production image.
# The Playwright image tag MUST equal the installed `playwright` npm version
# (package.json). Chromium is required at runtime to render PDFs.
ARG PLAYWRIGHT_VERSION=1.64.0
FROM mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 TZ=UTC
# fonts-noto-core: Arabic fallback glyphs; tar: weekly files backup (15.4).
# build-essential + python3: compile the better-sqlite3 native binding when no
# prebuilt binary matches the image's Node version.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      fonts-noto-core tar ca-certificates build-essential python3 \
 && rm -rf /var/lib/apt/lists/*

# ── deps: full install (dev deps are needed to build) ──
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# ── build ──
FROM deps AS build
# `next build` forces NODE_ENV=production, and src/lib/env.ts validates the
# environment at build time. These are throwaway build-only placeholders; the
# real values are injected at runtime via env_file / compose.
ENV APP_URL=http://localhost:3000 \
    APP_SECRET=0000000000000000000000000000000000000000000000000000000000000000 \
    SMTP_HOST=localhost \
    SMTP_PORT=587 \
    SMTP_SECURE=false \
    SMTP_USER=build \
    SMTP_PASS=build \
    SMTP_FROM="Dossier <no-reply@example.com>"
COPY . .
RUN npm run build

# ── runner ──
FROM base AS runner
ENV NODE_ENV=production
# Standalone server + static assets + everything the worker/migrate scripts need.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/assets ./assets
COPY --from=build /app/messages ./messages
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/src ./src
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
# tsconfig.json lets `tsx` (db:migrate, worker) resolve the `@/*` path aliases.
COPY --from=build /app/tsconfig.json ./tsconfig.json
RUN mkdir -p /app/data && chown -R pwuser:pwuser /app
USER pwuser
EXPOSE 3000
CMD ["sh", "-c", "npm run db:migrate && node server.js"]
