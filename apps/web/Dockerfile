# Web do Annalu Studio OS (Next.js, saída standalone). Build a partir da RAIZ do repositório:
#   docker build -f apps/web/Dockerfile -t studio-web .
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm turbo run build --filter=@studio/web...

FROM node:24-alpine AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
# API_ORIGIN (endereço interno da API) é lido em tempo de execução pelo servidor do Next.
CMD ["node", "apps/web/server.js"]
