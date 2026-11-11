# 05 — Arquitetura Técnica

> Status: rascunho para revisão · Fase 0 · 10/11/2026

## 1. Validação da stack baseline

A stack do Master Prompt é **[DIRETRIZ]** como baseline, "sujeita a validação". Avaliação:

| Componente | Baseline | Parecer | Observação |
|---|---|---|---|
| Frontend | Next.js + React + TypeScript | ✅ Confirmado | App Router. Next **não acessa o banco** e não contém regra de negócio (ver §3) |
| Estilo | Tailwind CSS + shadcn/ui | ✅ Confirmado | Tailwind v4 com tokens CSS |
| Backend | NestJS + TypeScript, REST | ✅ Confirmado | Módulos por domínio = monólito modular natural |
| Banco | MySQL + Prisma | ✅ Confirmado | MySQL 8.0+ (necessário para `CHECK`, `SKIP LOCKED`, FULLTEXT InnoDB, JSON) |
| Storage | S3 compatível privado | ✅ Confirmado | Provedor em aberto (Q4) |
| Infra | Docker, CI/CD, HTTPS, backups | ✅ Confirmado | Proposta de hospedagem em §9 |
| Arquitetura | Monólito modular | ✅ Confirmado | **[DIRETRIZ]** |

Não há motivo técnico para trocar a baseline. Duas aplicações (Next + Nest) têm custo operacional maior que uma só, mas trazem um backend com módulos, injeção de dependência e guards de autorização bem definidos, além de ficar pronto para clientes futuros (app móvel, portal do cliente, webhooks).

## 2. Visão geral

```
                     Navegador (owner)
                            │ HTTPS
                            ▼
                ┌───────────────────────┐
                │  Caddy (reverse proxy,│  TLS automático, HSTS,
                │  HTTPS, compressão)   │  limites de corpo
                └──────────┬────────────┘
                           │  (mesma origem: annalustudio.devannalu.com)   
             ┌─────────────┴──────────────┐
             │ /*                         │ /api/*
             ▼                            ▼
   ┌───────────────────┐        ┌──────────────────────────┐
   │ apps/web          │  SSR   │ apps/api (NestJS)        │
   │ Next.js           │──────▶ │ REST /api/v1             │
   │ (UI, SSR, sem DB) │ cookie │ módulos de domínio       │
   └───────────────────┘        │ ┌──────────────────────┐ │
                                │ │ worker (mesmo código, │ │
                                │ │ processo separado)    │ │
                                │ └──────────────────────┘ │
                                └───┬─────────┬────────┬───┘
                                    │         │        │
                              ┌─────▼──┐ ┌────▼────┐ ┌─▼───────────┐
                              │ MySQL 8│ │ Storage │ │ GitHub API  │
                              │        │ │ S3      │ │ + webhooks  │
                              └────────┘ └─────────┘ └─────────────┘
```

**Mesma origem [PROPOSTA]:** o proxy roteia `/api/*` para o NestJS e o resto para o Next. Vantagens: cookie de sessão `__Host-` sem CORS, CSRF mais simples, um único certificado.

## 3. Estrutura do repositório **[PROPOSTA]**

Monorepo com **pnpm workspaces** + **Turborepo** (cache de build/test).

```
/
├── apps/
│   ├── web/                     # Next.js
│   │   └── src/
│   │       ├── app/             # rotas (App Router)
│   │       ├── components/
│   │       │   ├── ui/          # primitivos (shadcn adaptado aos tokens)
│   │       │   └── <dominio>/   # projects/, tasks/, notes/…
│   │       ├── features/        # hooks de dados (TanStack Query) por domínio
│   │       ├── lib/             # cliente HTTP, formatação pt-BR, utilitários
│   │       └── styles/          # tokens.css, globals.css
│   └── api/                     # NestJS
│       ├── prisma/              # schema.prisma, migrations/, seed (só dev)
│       └── src/
│           ├── main.ts          # API HTTP
│           ├── worker.ts        # processador de jobs
│           ├── common/          # filtros de erro, guards, interceptors, paginação
│           ├── infra/           # prisma, storage (S3), crypto, mail (futuro), clock
│           └── modules/
│               ├── auth/  workspaces/  projects/  scope/  tasks/  milestones/
│               ├── calendar/  notes/  ideas/  files/  clients/  tags/
│               ├── activity/  audit/  search/  dashboard/  reports/
│               ├── jobs/  trash/  export/
│               └── github/      # Fase 1.1
├── packages/
│   ├── contracts/               # schemas Zod + tipos de request/response compartilhados
│   ├── domain-rules/            # funções puras compartilhadas (ex.: datas pt-BR) — só se necessário
│   └── config/                  # tsconfig, eslint, prettier compartilhados
├── docker/                      # Dockerfiles, compose de dev, Caddyfile
├── docs/
└── .github/workflows/
```

### Camadas dentro de cada módulo do backend

```
modules/tasks/
├── tasks.controller.ts      # HTTP: valida entrada (Zod), chama service, mapeia resposta
├── tasks.service.ts         # caso de uso: orquestra, transação, autorização de recurso, atividade
├── tasks.repository.ts      # acesso Prisma, SEMPRE filtrando por workspaceId
├── tasks.rules.ts           # regras puras (ex.: cálculo de progresso, transições) — testes unitários
├── dto/                     # (reexporta schemas de packages/contracts)
└── tasks.module.ts
```

Regras:
- Controller nunca acessa Prisma.
- Módulo só fala com outro módulo via service exportado (nunca pelo repository alheio).
- Regras de negócio ficam no backend; o frontend só replica o mínimo para UX otimista (e o servidor é a verdade). **[DIRETRIZ]**

## 4. Frontend **[PROPOSTA]**

| Tema | Escolha | Motivo |
|---|---|---|
| Dados do servidor | **TanStack Query** | Cache, invalidação, updates otimistas (Kanban, checkbox) |
| SSR | Server Components buscam dados iniciais na API repassando o cookie | Primeira pintura rápida |
| Formulários | **React Hook Form + Zod** (schemas de `packages/contracts`) | Mesma validação no front e no back |
| Estado local de UI | Estado de componente / Zustand só se necessário | Evitar estado global desnecessário |
| Editor | **Tiptap** | Robusto, JSON estruturado, extensível |
| Drag and drop | **dnd-kit** | Suporte a teclado e leitor de tela |
| Calendário | Componente próprio sobre `date-fns` (+ `date-fns-tz`) **[PROPOSTA]** | Bibliotecas prontas são difíceis de adequar ao design system; avaliar FullCalendar como alternativa se o custo for alto |
| Gráficos | **Recharts** ou visx | Só para relatórios |
| Datas/moeda | `Intl.DateTimeFormat('pt-BR')`, `Intl.NumberFormat('pt-BR', { currency: 'BRL' })` | Nativo |
| Ícones | lucide-react | **[DIRETRIZ]** |

Sem Server Actions com regra de negócio e sem acesso direto ao banco pelo Next.

## 5. Backend e API **[PROPOSTA]**

### Convenções REST
- Prefixo `/api/v1`. Recursos escopados por workspace: `/api/v1/workspaces/{workspaceId}/projects/{projectId}/tasks`.
  - Workspace explícito na URL evita ambiguidade entre abas e prepara multi-workspace.
- Validação de entrada com **Zod** (`nestjs-zod`), schemas compartilhados via `packages/contracts`.
- **Sucesso:** retorna o recurso diretamente (`200/201`) ou `{ data: [...], nextCursor }` para listas.
- **Erro:** `application/problem+json` (RFC 9457), com `code` estável e mensagem em pt-BR:
  ```json
  { "type": "about:blank", "title": "Conflito de versão", "status": 409,
    "code": "NOTE_VERSION_CONFLICT", "detail": "Esta nota foi alterada em outra aba.",
    "requestId": "01JC…" }
  ```
- **Paginação:** por cursor (`?cursor=&limit=`), limite máximo 100.
- **Concorrência otimista:** recursos editáveis têm `version`; `PATCH` envia `version` esperado; divergência → `409`.
- **Idempotência:** criação via captura rápida aceita header `Idempotency-Key` (evita duplicar nota em reenvio).
- **Documentação:** OpenAPI gerado a partir dos schemas, publicado só em ambiente de desenvolvimento.

### Autorização (multi-usuário pronto, sem complexidade)
1. `SessionGuard` resolve o usuário a partir do cookie.
2. `WorkspaceMemberGuard` confirma que o usuário é membro do `workspaceId` da rota e anexa o papel ao contexto.
3. Repositórios exigem `workspaceId` em toda consulta (assinatura do método obriga; revisão de código + teste).
4. Recurso de outro workspace retorna `404` (não revela existência).
5. Papéis: enum `OWNER | ADMIN | COLLABORATOR | CLIENT` existe no schema, mas só `OWNER` é usado; um único decorator `@RequireRole()` fica pronto para a Fase 3. **[PROPOSTA]**
6. Testes de autorização por endpoint: usuário de outro workspace recebe 404/403.

## 6. Banco de dados **[PROPOSTA]**

- MySQL 8.0+, `utf8mb4` / `utf8mb4_0900_ai_ci` (busca sem distinção de acento e caixa, importante em português).
- Prisma com migrações versionadas (`prisma migrate`); migrações revisadas no PR; produção usa `prisma migrate deploy` em etapa de release.
- IDs: `cuid()` (string) — não sequenciais, seguros para URLs; `slug` legível só em projetos.
- Datas: `DATETIME(3)` em UTC; datas sem hora (vencimentos, datas-alvo) como `DATE`.
- Exclusão: `deletedAt` (lixeira 30 dias) nas entidades principais; job de purga definitiva.
- Busca: índices `FULLTEXT` (InnoDB) em título + texto extraído (`plainText`) de notas, tarefas, ideias, projetos, arquivos, clientes. Avaliar Meilisearch só se a relevância for insuficiente. **[FUTURO]**
- Detalhes em [06-modelo-dados.md](06-modelo-dados.md).

## 7. Armazenamento de arquivos **[PROPOSTA]**

### Fluxo de upload (MVP: via API)
1. Frontend envia `multipart/form-data` para `POST …/files` (streaming, sem carregar tudo em memória).
2. API valida: tamanho (limite por tipo), extensão na lista permitida, **tipo real por assinatura de bytes** (`file-type`), coerência extensão × conteúdo.
3. Gera chave de storage sem dados do usuário: `ws/{workspaceId}/f/{fileId}/v{n}` (nome original só no banco).
4. Calcula SHA-256 (integridade e detecção de duplicatas).
5. Envia ao bucket privado; grava `File` + `FileVersion` em transação após sucesso; em falha, remove o objeto órfão (e job de limpeza periódica cobre falhas parciais).
6. Imagens: job assíncrono gera miniaturas (`sharp`) e remove metadados EXIF (inclusive GPS) da miniatura; original preservado. **[PROPOSTA]**

> Upload direto ao S3 por URL pré-assinada fica para depois: exige validação pós-upload assíncrona e é desnecessário para uma usuária. **[FUTURO]**

### Download
- `GET …/files/{id}/download` → verifica autorização → responde `302` para URL assinada de **5 minutos**, com `response-content-disposition` (`attachment` para tudo que não for imagem raster ou PDF) e `response-content-type` fixado pelo valor validado.
- SVG, HTML, XML: sempre `attachment`, nunca renderizados inline. **[PROPOSTA]**
- Bucket sem acesso público; CORS do bucket restrito à origem da aplicação.

### Política inicial de tipos **[PROPOSTA — Q9]**
| Grupo | Extensões | Limite |
|---|---|---|
| Imagens | png, jpg/jpeg, webp, gif, avif, svg (só download) | 25 MB |
| Documentos | pdf, txt, md, csv, docx, xlsx, pptx, odt, ods, odp | 50 MB |
| Design | fig (exportado), psd, ai | 200 MB |
| Compactados | zip | 200 MB |
| Bloqueados | exe, msi, bat, cmd, sh, ps1, js, html, jar, apk, dmg, iso | — |

### Antivírus
- MVP com usuária única: validação por assinatura + bloqueio de executáveis. **ClamAV** (container) fica como **pré-requisito obrigatório antes de qualquer upload por terceiros** (colaboradores/clientes). **[PROPOSTA]**

## 8. Autenticação e sessão

> **Atualizado em 10/11/2026 (D-19):** login **só com e-mail e senha** no MVP; 2FA fica para o futuro. Os itens abaixo sobre TOTP e códigos de recuperação valem só para essa fase futura.
>
> **Primeiro acesso:** o e-mail da owner é configurado na variável de ambiente `OWNER_EMAIL` (fora do Git). A tela `/configuracao-inicial` só aceita esse e-mail **e** exige um token de uso único (`SETUP_TOKEN`, definido no servidor), porque sem ele qualquer pessoa que acessasse o site antes da owner poderia criar a senha. Depois que a senha é definida, a rota é desativada para sempre.
>
> **Compensações pela ausência de 2FA:** senha com mínimo de 12 caracteres e verificação contra senhas vazadas conhecidas (lista local, sem enviar a senha a terceiros); bloqueio progressivo após tentativas erradas; aviso de novo login em Configurações → Segurança; sessões revogáveis.

- **Login:** e-mail + senha com **Argon2id** (parâmetros mínimos OWASP: 19 MiB, t=2, p=1); comparação em tempo constante; mensagens genéricas ("E-mail ou senha incorretos").
- **2FA TOTP** (RFC 6238) com 10 códigos de recuperação (armazenados com hash). Recomendado ativar logo no primeiro acesso.
- **Sessão:** token aleatório de 256 bits em cookie `__Host-sid` (`HttpOnly; Secure; SameSite=Lax; Path=/`); banco guarda só o **hash SHA-256** do token. Expiração: 7 dias de inatividade, 30 dias absoluto; rotação do token no login e ao elevar privilégio.
- **CSRF:** mesma origem + `SameSite=Lax` + token anti-CSRF (double-submit) exigido em métodos não-GET + verificação do header `Origin`.
- **Força bruta:** limite por IP e por conta (`@nestjs/throttler` + contador no banco), atraso progressivo, auditoria de falhas.
- **Recuperação de senha sem e-mail no MVP:** códigos de recuperação + comando de servidor (`pnpm api cli reset-password`) executado com acesso à máquina. E-mail transacional entra quando houver mais usuários. **[PROPOSTA]**
- **Setup inicial:** rota `/configuracao-inicial` só funciona se não existir usuário **e** com um token de setup de uso único definido em variável de ambiente.
- Login com GitHub OAuth não é proposto como método principal (acopla o acesso ao produto a uma conta externa). **[PROPOSTA]**

### Como ficou implementado (M2, 11/11/2026 — D-33)

| Item | Implementação |
|---|---|
| Rotas | `GET /api/auth/csrf`, `GET/POST /api/auth/setup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`. Contratos em `packages/contracts/src/auth.ts` |
| Seguro por padrão | `SessionGuard` global: toda rota exige sessão; exceções marcadas com `@Public()` (health, csrf, setup, login) |
| CSRF | Middleware em toda mutação: `Origin` (se presente) igual a `APP_ORIGIN` **e** header `x-csrf-token` igual ao cookie `__Host-csrf` (HttpOnly, SameSite=Strict). A interface obtém o token em `GET /api/auth/csrf`. Vale também para login e setup |
| Sessão | Token de 256 bits no cookie `__Host-sid`; banco guarda o SHA-256. 30 dias absoluto, 7 dias sem uso; `lastSeenAt` atualizado no máximo a cada 5 min. Token novo a cada login |
| Senha | Argon2id (`@node-rs/argon2`, m=19 MiB, t=2, p=1); mínimo de 12 caracteres; lista local de ~30 mil senhas vazadas com 12+ caracteres (SecLists, `apps/api/data/senhas-vazadas.txt.gz`); recusa senha quase igual ao nome/e-mail |
| Força bruta | **Retirado a pedido da owner (D-34):** sem bloqueio por conta nem limite por IP. Mantidos: Argon2id (lento por natureza), mesma resposta e mesmo tempo para e-mail inexistente, auditoria de cada falha |
| IP real | `TRUST_PROXY_HOPS` (padrão 1: Traefik → Next → API). IPs gravados truncados (IPv4 /24, IPv6 /48) |
| Primeiro acesso | Só com `OWNER_EMAIL` **e** `SETUP_TOKEN` (≥ 32 caracteres) configurados e nenhuma usuária no banco; e-mail e token comparados em tempo constante; resposta igual para e-mail ou token errado; depois disso a rota responde 404. Variáveis podem ser apagadas após o setup |
| Auditoria | `AuditLog`: `setup.completed`, `setup.rejected`, `login.succeeded`, `login.failed`, `logout`. Metadados sem senha, token ou e-mail digitado |
| Autorização por workspace | `WorkspaceMemberGuard` nas rotas `workspaces/:workspaceId/...`: não membro → 404. `WorkspaceScope` (tipo que só o guard cria) é o primeiro parâmetro de todo repositório; `inScope()` acrescenta o filtro e `foundOr404()` padroniza o 404. `@RequireRole()` pronto para a Fase 3 |
| Testes | `apps/api/test/auth.int-spec.ts` (MySQL real) e helper `createTwoWorkspaces()` em `test/helpers/app.ts`, **obrigatório em todo módulo novo** (E2-4) |

### Módulos do MVP (D-35)

- Rotas REST em `/api/workspaces/{workspaceId}/{clients|projects|milestones|tasks|events|notes|ideas|files}` (GET lista, POST, GET/PATCH/DELETE `:id`), geradas por `apps/api/src/modules/crud.ts`, sempre com `WorkspaceScope` e checagem de que IDs referenciados (projeto, cliente, marco, ideia) são do mesmo workspace (422 `INVALID_REFERENCE`).
- Especiais: `POST ideas/:id/convert` (transação), `GET dashboard`, `GET calendar?from&to` (máx. 100 dias; tarefas, marcos, eventos e início/prazo dos projetos não arquivados), `GET github/repos` e `POST github/import` (D-39), `GET reports`, `GET search?q`, `POST files` (multipart, campo `file`) e `GET files/:id/download` (streaming pela API, bucket nunca exposto).
- Notas com concorrência otimista (`version` → 409 `VERSION_CONFLICT`). Upload: lista de extensões permitida, limite por tipo e assinatura de bytes.
- `GET activity?days=` (7–371): contagem diária por tipo de ação, no fuso da usuária. `PUT /api/auth/me/dashboard`: disposição dos widgets do Início (validada por `dashboardLayoutSchema`).
- Listas sem paginação por cursor nesta versão (limite de 1000 itens por consulta).

## 9. Jobs em segundo plano **[PROPOSTA]**

Necessários para: lembretes, miniaturas, purga da lixeira, exportação de dados, e (1.1) processamento de webhooks e sincronização GitHub.

- **Fila no próprio MySQL** (tabela `Job`), processada pelo `worker.ts` usando `SELECT … FOR UPDATE SKIP LOCKED`; reexecução com backoff exponencial; máximo de tentativas; status visível.
- Agendamentos recorrentes via `@nestjs/schedule` no worker (ex.: purga diária, reconciliação GitHub).
- **Sem Redis no MVP** (um componente a menos para operar). Migrar para BullMQ + Redis se o volume justificar. Interface `JobQueue` isola a implementação.

## 10. Segurança transversal

| Área | Medida |
|---|---|
| Cabeçalhos | CSP restritiva com nonce (Next), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` mínima, HSTS (Caddy) |
| XSS | React escapa por padrão; rich text renderizado a partir de JSON do Tiptap com esquema fechado (sem HTML bruto); links só `http/https/mailto` |
| Entrada | Zod em todos os endpoints; limites de tamanho de corpo |
| Segredos | Variáveis de ambiente injetadas no deploy, nunca no repositório; `.env.example` sem valores; varredura de segredos no CI (gitleaks) |
| Criptografia em repouso | Segredos de integração (se armazenados) com AES-256-GCM e chave em variável de ambiente |
| Logs | JSON estruturado (`pino`); redação automática de `authorization`, `cookie`, `password`, `token`, conteúdo de notas |
| Dependências | Dependabot/Renovate + `pnpm audit` no CI |
| SSRF | Servidor não busca URLs fornecidas pela usuária no MVP |
| LGPD | Exportação completa de dados; exclusão definitiva após lixeira; dados mínimos de contatos; registro de finalidade em documentação |
| Auditoria | `AuditLog` para login, falhas, 2FA, sessões, integrações, exportações, exclusões definitivas |

**Nada disso é considerado "seguro" até ser verificado**: o backlog inclui testes de autorização, upload, XSS e uma revisão de segurança antes do lançamento interno. **[DIRETRIZ]**

## 11. Observabilidade **[PROPOSTA]**

- Logs estruturados com `requestId` propagado do proxy ao worker.
- **Sentry** (ou GlitchTip auto-hospedado) para erros de front e back, com remoção de PII.
- `GET /api/health` (vivo) e `/api/health/ready` (banco + storage).
- Monitor externo de disponibilidade (ex.: UptimeRobot) no domínio.

## 12. Ambientes e implantação **[PROPOSTA — Q3]**

### Local
`docker compose up` com MySQL 8, MinIO (S3 local) e Mailpit (futuro). Apps rodam com `pnpm dev`. Seed apenas em desenvolvimento, claramente fictício e nunca executado em produção.

### Produção (proposta econômica e simples)
- **1 VPS** (2 vCPU, 4 GB RAM, ex.: Hetzner, DigitalOcean ou Magalu Cloud para dados no Brasil) com Docker Compose: `caddy`, `web`, `api`, `worker`, `mysql`.
- **Storage:** Cloudflare R2 (sem custo de saída) ou Backblaze B2 — bucket privado de arquivos + bucket separado de backups.
- **Alternativa gerenciada:** MySQL gerenciado (ex.: DigitalOcean Managed MySQL) quando o custo se justificar, eliminando a gestão de backups do banco.
- **Dados no Brasil:** se a preferência for manter dados em território nacional (LGPD não exige, mas pode ser desejável para clientes), escolher região São Paulo. → Q3.

### Backups **[PROPOSTA]**
- `mysqldump --single-transaction` diário, compactado e **criptografado** (age/GPG), enviado a bucket separado com retenção de 30 diários + 12 mensais.
- Versionamento de objetos ativado no bucket de arquivos (proteção contra exclusão acidental).
- **Teste de restauração mensal** automatizado (restaura em container temporário e verifica contagens).
- Meta: RPO ≤ 24 h, RTO ≤ 4 h.

### CI/CD (GitHub Actions)
1. PR: lint, typecheck, testes unitários e de integração (MySQL em container), build, gitleaks, `pnpm audit`, checagem de migração.
2. `main`: build de imagens Docker → registro (GHCR) → deploy na VPS (SSH + `docker compose pull && up`) → `prisma migrate deploy` → smoke test do health check.
3. Rollback: tag da imagem anterior; migrações escritas para serem compatíveis com a versão anterior (expand/contract).

## 13. Estratégia de testes

| Nível | Ferramenta **[PROPOSTA]** | Foco |
|---|---|---|
| Unitário | Vitest | Regras puras (progresso, datas, transições, validação de arquivo) |
| Integração / API | Vitest + Supertest + MySQL real em container (Testcontainers) | Endpoints, transações, isolamento por workspace, concorrência otimista |
| Componentes | Vitest + Testing Library + axe | Componentes de UI e acessibilidade |
| E2E | Playwright | Fluxos críticos: login + 2FA, criar projeto → tarefa → calendário, captura rápida, conversão de ideia, upload/download |
| Segurança | Testes dedicados | Autorização cruzada, upload malicioso, XSS no editor, CSRF, limitação de taxa |

Meta de cobertura orientada a risco, não a porcentagem: 100% das regras em `*.rules.ts` e de todos os endpoints com teste de autorização.

## 14. Decisões que ficam registradas como ADR

Ver [decisoes/registro-de-decisoes.md](decisoes/registro-de-decisoes.md): ADR-001 monorepo, ADR-002 mesma origem, ADR-003 sessão por cookie, ADR-004 fila em MySQL, ADR-005 upload via API, ADR-006 Tiptap JSON, ADR-007 IDs cuid, ADR-008 workspace na URL.
