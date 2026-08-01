FROM node:24-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
ARG CHRONO_BUILD_VERSION=development
ARG CHRONO_BUILD_COMMIT=unknown
ENV CHRONO_BUILD_VERSION=$CHRONO_BUILD_VERSION
ENV CHRONO_BUILD_COMMIT=$CHRONO_BUILD_COMMIT
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS migrator
ARG CHRONO_BUILD_VERSION=development
ARG CHRONO_BUILD_COMMIT=unknown
ENV CHRONO_BUILD_VERSION=$CHRONO_BUILD_VERSION
ENV CHRONO_BUILD_COMMIT=$CHRONO_BUILD_COMMIT
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json package-lock.json drizzle.config.ts ./
COPY drizzle ./drizzle
COPY src/db/schema ./src/db/schema
CMD ["npm", "run", "db:migrate"]

FROM node:24-alpine AS updater
ARG CHRONO_BUILD_VERSION=development
ARG CHRONO_BUILD_COMMIT=unknown
ENV CHRONO_BUILD_VERSION=$CHRONO_BUILD_VERSION
ENV CHRONO_BUILD_COMMIT=$CHRONO_BUILD_COMMIT
WORKDIR /opt/chrono
RUN apk add --no-cache docker-cli docker-cli-compose
COPY scripts/updater.mjs ./scripts/updater.mjs
COPY src/modules/settings/domain/calendar-version.ts ./src/modules/settings/domain/calendar-version.ts
CMD ["node", "/opt/chrono/scripts/updater.mjs", "watch"]

FROM base AS runner
ARG CHRONO_BUILD_VERSION=development
ARG CHRONO_BUILD_COMMIT=unknown
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV CHRONO_BUILD_VERSION=$CHRONO_BUILD_VERSION
ENV CHRONO_BUILD_COMMIT=$CHRONO_BUILD_COMMIT

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/src/modules/time-tracking/assets ./assets/time-tracking
# Native Sharp bindings dynamically load their matching vendored libvips tree.
# Next's standalone trace includes the binding but can omit that optional tree.
COPY --from=dependencies --chown=nextjs:nodejs /app/node_modules/@img ./node_modules/@img
COPY --from=dependencies --chown=nextjs:nodejs /app/node_modules/sharp ./node_modules/sharp

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
