# Annalu Studio OS

Centro de comando digital da **Dev Annalu**: projetos, escopo, tarefas, calendário, notas, ideias, arquivos, clientes e GitHub em um só lugar.

> Documentação do produto (fonte da verdade): [docs/](docs/README.md) · Decisões: [docs/decisoes/registro-de-decisoes.md](docs/decisoes/registro-de-decisoes.md)

## Estrutura

```
apps/
  web/          Next.js 16 (interface)            → http://localhost:3000
  api/          NestJS 12 + Prisma 7 (API REST)   → http://localhost:4000/api
packages/
  contracts/    Schemas Zod e tipos compartilhados entre web e API
design/         Protótipos visuais, adesivos da colagem e modelo 3D (Blender)
docs/           PRD, arquitetura, modelo de dados, backlog, decisões
```

## Pré-requisitos

- Node.js 24 (`.nvmrc`)
- pnpm 12 (`npm install -g pnpm@12`)
- Docker Desktop (MySQL local na porta **3307**, para não conflitar com outros projetos)

## Primeiros passos

```bash
pnpm install
cp .env.example .env          # ajuste se precisar (nunca versionar o .env)
pnpm db:up                    # sobe o MySQL no Docker
pnpm --filter @studio/api db:migrate   # cria as tabelas
pnpm dev                      # web + API em modo desenvolvimento
```

## Comandos úteis

| Comando | O que faz |
|---|---|
| `pnpm dev` | Sobe web e API com recarga automática |
| `pnpm build` | Compila tudo (gera o cliente Prisma antes) |
| `pnpm test` | Testes unitários e e2e |
| `pnpm --filter @studio/api test:int` | Testes de integração com MySQL real (banco `studio_test`) |
| `pnpm --filter @studio/api worker` | Processo que executa a fila de jobs (após o build) |
| `pnpm typecheck` / `pnpm lint` | Verificação de tipos e lint |
| `pnpm db:up` / `pnpm db:down` | Liga/desliga os serviços do Docker |
| `pnpm --filter @studio/api db:studio` | Abre o Prisma Studio para inspecionar o banco |

## Segurança

- Segredos só em `.env` (ignorado pelo Git) ou nas variáveis do servidor.
- A API recusa iniciar com configuração inválida.
- Logs não registram headers, cookies, corpo de requisição nem query string.
- CI roda varredura de segredos (gitleaks) e auditoria de dependências.
