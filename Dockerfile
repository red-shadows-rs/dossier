# ─────────────────────────────────────────────
# Dossier - Dockerfile
# ─────────────────────────────────────────────

# ── Base Runtime Environment ──
ARG PLAYWRIGHT_VERSION=1.64.0
FROM mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 TZ=UTC
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get remove -y nodejs \
 && apt-get install -y --no-install-recommends \
      nodejs fonts-noto-core tar ca-certificates build-essential python3 \
 && rm -rf /var/lib/apt/lists/*

# ── Dependencies ──
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm install --include=dev

# ── Build ──
FROM deps AS build
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

# ── Production Runner ──
FROM base AS runner
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
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
COPY --from=build /app/tsconfig.json ./tsconfig.json
RUN mkdir -p /app/data && chown -R pwuser:pwuser /app
USER pwuser
EXPOSE 3000
CMD ["sh", "-c", "npm run db:migrate && npm run seed && node server.js"]
