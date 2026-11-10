# API do Annalu Studio OS (NestJS + Prisma). Build a partir da RAIZ do repositório:
#   docker build -f apps/api/Dockerfile -t studio-api .
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=@studio/api...

FROM base AS runtime
ENV NODE_ENV=production
# Mantém node_modules completo: o CLI do Prisma é necessário para aplicar migrações na inicialização.
COPY --from=build /repo /repo
WORKDIR /repo/apps/api
USER node
EXPOSE 4000
# Confere a DATABASE_URL, aplica migrações pendentes e sobe a API.
# (O worker usa a mesma imagem com: node dist/worker.js)
COPY --chown=node:node apps/api/docker-entrypoint.sh /usr/local/bin/studio-entrypoint
CMD ["sh", "/usr/local/bin/studio-entrypoint"]
