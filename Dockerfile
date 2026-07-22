FROM node:24-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS migrator
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json package-lock.json drizzle.config.ts ./
COPY drizzle ./drizzle
COPY src/db/schema ./src/db/schema
CMD ["npm", "run", "db:migrate"]

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Native Sharp bindings dynamically load their matching vendored libvips tree.
# Next's standalone trace includes the binding but can omit that optional tree.
COPY --from=dependencies --chown=nextjs:nodejs /app/node_modules/@img ./node_modules/@img
COPY --from=dependencies --chown=nextjs:nodejs /app/node_modules/sharp ./node_modules/sharp

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
