# 06 — Modelo de Dados Inicial

> Status: rascunho para revisão · Fase 0 · 10/11/2026
> Todo o modelo é **[PROPOSTA]**. O esquema Prisma abaixo é um **rascunho de referência**, não um arquivo do projeto. Ele será criado em `apps/api/prisma/schema.prisma` no épico E0/E2, após aprovação.

## 1. Convenções

| Convenção | Regra |
|---|---|
| IDs | `String @id @default(cuid())` |
| Escopo | Toda entidade de negócio tem `workspaceId` (FK + índice), mesmo quando derivável do pai — simplifica e protege as consultas escopadas |
| Auditoria básica | `createdAt`, `updatedAt`, `createdById` nas entidades editáveis |
| Lixeira | `deletedAt DateTime?` nas entidades principais; consultas padrão filtram `deletedAt IS NULL` |
| Concorrência | `version Int @default(1)` em entidades editadas por formulário/editor (Project, ProjectScope, Task, Note, Idea, Client, CalendarEvent) |
| Datas sem hora | `@db.Date` (vencimento, data-alvo, início) |
| Datas com hora | `DateTime @db.DateTime(3)` em UTC |
| Texto rico | `content Json` (documento Tiptap) + `plainText Text` (extraído no backend, para busca e prévias) |
| Enums | Valores em inglês no banco; rótulos pt-BR na interface |
| Ordenação manual | `position String` com fractional indexing (inserção entre dois itens sem renumerar) |
| Integridade | FKs reais sempre que possível; polimorfismo só em log de atividade/auditoria |

## 2. Diagrama de entidades (núcleo do MVP)

```
User 1─* WorkspaceMember *─1 Workspace
User 1─* Session
Workspace 1─* Client 1─* ClientContact
Workspace 1─* Project *─0..1 Client
Project 0..1─1 Idea              (sourceIdeaId, único)
Project 1─1 ProjectScope 1─* ScopeItem
ProjectScope 1─* ScopeRevision
Project 1─* Milestone
Project 1─* Task  (projectId opcional se Q17 = sim)
Task 0..1─* Task  (parentTaskId; 1 nível)
Task *─0..1 Milestone
Task 1─* ChecklistItem
Note *─0..1 Project · Note *─0..1 Idea · Note 1─* NoteRevision
Idea 1─* IdeaReference
File 1─* FileVersion · File 1─* FileAttachment (→ Project | Idea | Note | Task)
Project 0..1─ coverFile / logoFile → File
CalendarEvent 1─* Reminder · Task 1─* Reminder
Tag *─* (Project, Task, Note, Idea, File, Client) via tabelas de junção
ActivityEvent, AuditLog, Job, Notification
```

## 3. Entidades

### 3.1 Identidade e workspace

**User** — `id`, `email` (único, normalizado minúsculo), `passwordHash`, `name`, `displayName?`, `avatarFileId?`, `timezone` (padrão `America/Sao_Paulo`), `weekStartsOn` (0 = domingo), `themePreference` (`LIGHT|DARK|SYSTEM`), `totpSecretEnc?` (criptografado), `totpEnabledAt?`, `lastLoginAt?`, `createdAt`, `updatedAt`.

**RecoveryCode** — `id`, `userId`, `codeHash`, `usedAt?`.

**Session** — `id`, `userId`, `tokenHash` (único), `createdAt`, `lastSeenAt`, `expiresAt`, `ip?` (truncado), `userAgent?`, `revokedAt?`, `mfaVerifiedAt?`.

**Workspace** — `id`, `name`, `slug` (único), `createdAt`, `updatedAt`.

**WorkspaceMember** — `workspaceId`, `userId`, `role` (`OWNER|ADMIN|COLLABORATOR|CLIENT`; só OWNER usado no MVP), `createdAt`. Único `(workspaceId, userId)`.

### 3.2 Clientes

**Client** — `id`, `workspaceId`, `name`, `companyName?`, `website?`, `notes?` (texto simples ou rico), `status` (`ACTIVE|INACTIVE`), `version`, auditoria, `deletedAt?`.

**ClientContact** — `id`, `clientId`, `workspaceId`, `name`, `email?`, `phone?`, `role?`, `isPrimary`. Exclusão em cascata com o cliente (inclusive purga definitiva — LGPD).

### 3.3 Projetos

**Project**
| Campo | Tipo | Regras |
|---|---|---|
| `id`, `workspaceId` | | |
| `name` | VarChar(160) | obrigatório |
| `slug` | VarChar(180) | único `(workspaceId, slug)` |
| `description` | Text? | |
| `objective` | Text? | |
| `category` | enum `PERSONAL|OWNED_PRODUCT|CLIENT|PROFESSIONAL_WORK` | obrigatório |
| `subtype` | VarChar(60)? | ex.: "Portfólio", "SaaS", "Website" — lista sugerida por categoria, editável |
| `dataClassification` | enum `PERSONAL|CLIENT|EMPLOYER` | derivado da categoria pelo backend |
| `hideFromOverview` | Boolean | padrão `false`; usado em `PROFESSIONAL_WORK` |
| `status` | enum `IDEA|PLANNING|IN_PROGRESS|PAUSED|COMPLETED|ARCHIVED` | |
| `priority` | enum `LOW|MEDIUM|HIGH|URGENT` | padrão `MEDIUM` |
| `startDate`, `targetDate` | Date? | `targetDate ≥ startDate` (validação de aplicação) |
| `completedAt` | DateTime? | preenchido ao mudar para COMPLETED |
| `clientId` | FK? | obrigatório se `category = CLIENT` (validação de aplicação + teste) |
| `coverFileId`, `logoFileId` | FK? → File | devem ser imagens vinculadas ao projeto; `ON DELETE SET NULL` |
| `sourceIdeaId` | FK? → Idea | **único** (uma ideia gera no máximo um projeto) |
| `pinned` | Boolean | fixado na barra lateral |
| `version`, auditoria, `deletedAt?` | | |

Índices: `(workspaceId, status)`, `(workspaceId, category)`, `(workspaceId, updatedAt)`, FULLTEXT `(name, description, objective)`.

### 3.4 Escopo

**ProjectScope** — `id`, `projectId` (único, 1:1), `workspaceId`, `problemStatement Json?`, `businessObjectives Json?`, `description Json?`, `technicalConsiderations Json?`, `currentRevision Int`, `version`, `updatedAt`, `updatedById`.

**ScopeItem** — `id`, `scopeId`, `workspaceId`, `type` (`DELIVERABLE|FUNCTIONAL_REQ|NON_FUNCTIONAL_REQ|CONSTRAINT|ASSUMPTION|OUT_OF_SCOPE|ACCEPTANCE_CRITERION`), `code` (ex.: `RF-003`), `sequence Int`, `title VarChar(300)`, `details Text?`, `position String`, `deletedAt?`.
- Único `(scopeId, type, sequence)`. Códigos **nunca são reutilizados** (item excluído mantém seu número), garantindo rastreabilidade.

**ScopeRevision** — `id`, `scopeId`, `workspaceId`, `revisionNumber Int`, `snapshot Json` (estado completo do escopo + itens), `changeSummary VarChar(500)?`, `createdById`, `createdAt`, `kind` (`EDIT|RESTORE|INITIAL_FROM_IDEA`; futuro: `CHANGE_REQUEST`).
- Único `(scopeId, revisionNumber)`. Somente inserção (imutável).
- **[FUTURO]** `ScopeChangeRequest` (`revisionId`, `status PENDING|APPROVED|REJECTED`, `requestedById`, `decidedById`, `decidedAt`, `comment`) para aprovação do cliente.

### 3.5 Marcos e tarefas

**Milestone** — `id`, `projectId`, `workspaceId`, `name`, `description?`, `dueDate Date?`, `isDelivery Boolean`, `status` (`OPEN|COMPLETED`), `completedAt?`, `position`, auditoria, `deletedAt?`.

**Task**
| Campo | Tipo | Regras |
|---|---|---|
| `id`, `workspaceId` | | |
| `projectId` | FK? | ver Q17 |
| `milestoneId` | FK? | deve ser do mesmo projeto (validação + teste) |
| `parentTaskId` | FK? → Task | pai não pode ter pai (1 nível); mesmo projeto |
| `title` | VarChar(300) | obrigatório |
| `description` | Json? + `plainText` Text? | |
| `status` | enum `BACKLOG|TODO|IN_PROGRESS|IN_REVIEW|DONE` | |
| `priority` | enum `LOW|MEDIUM|HIGH|URGENT` | |
| `dueDate` | Date? | |
| `dueTime` | Time? (`@db.Time`) | só com `dueDate`; interpretado no fuso da usuária |
| `completedAt` | DateTime? | definido ao entrar em DONE, limpo ao sair |
| `position` | String | ordem dentro da coluna (status) |
| `sourceNoteId` | FK? → Note | quando criada a partir de nota da Inbox |
| `archivedAt`, `deletedAt` | DateTime? | |
| `version`, auditoria | | |

Índices: `(workspaceId, dueDate)`, `(projectId, status, position)`, `(workspaceId, completedAt)`, `(parentTaskId)`, FULLTEXT `(title, plainText)`.

**ChecklistItem** — `id`, `taskId`, `workspaceId`, `text VarChar(500)`, `isDone`, `position`.

### 3.6 Calendário e lembretes

**CalendarEvent** — `id`, `workspaceId`, `projectId?`, `title`, `type` (`MEETING|PERSONAL|REMINDER|OTHER`), `startsAt DateTime`, `endsAt DateTime?`, `allDay Boolean`, `location?`, `url?`, `notes Text?`, `version`, auditoria, `deletedAt?`. Restrição: `endsAt ≥ startsAt` (`CHECK`).
- Tarefas, marcos e entregas **não** são copiados aqui: o endpoint de calendário une as fontes numa consulta por intervalo.
- **[FUTURO]** `recurrenceRule` (RRULE) e `externalId/externalSource` para Google Calendar.

**Reminder** — `id`, `workspaceId`, `userId`, `taskId?`, `eventId?`, `remindAt DateTime`, `sentAt?`, `dismissedAt?`. `CHECK` exatamente um entre `taskId` e `eventId`. Lembrete de tarefa é recalculado quando `dueDate` muda (offset armazenado em `offsetMinutes`).

**Notification** — `id`, `workspaceId`, `userId`, `type`, `title`, `body?`, `link?`, `readAt?`, `createdAt`.

### 3.7 Notas

**Note**
| Campo | Tipo | Regras |
|---|---|---|
| `id`, `workspaceId` | | |
| `projectId`, `ideaId` | FK? | ambos nulos = Inbox. Podem coexistir (nota de ideia convertida) |
| `title` | VarChar(300) | padrão "Sem título" |
| `content` | Json | documento Tiptap |
| `contentSchemaVersion` | Int | permite migrar formato do editor no futuro |
| `plainText` | MediumText | extraído no backend |
| `pinned` | Boolean | |
| `archivedAt`, `deletedAt` | DateTime? | |
| `convertedTaskId` | FK? → Task | nota convertida em tarefa |
| `version`, auditoria | | |

Índices: `(workspaceId, projectId, updatedAt)`, `(workspaceId, ideaId)`, FULLTEXT `(title, plainText)`.

**NoteRevision** — `id`, `noteId`, `workspaceId`, `version Int`, `title`, `content Json`, `createdAt`, `createdById`, `reason` (`AUTOSAVE_SNAPSHOT|BEFORE_RESTORE|CONFLICT_COPY`). Somente inserção.

### 3.8 Idea Lab

**Idea** — `id`, `workspaceId`, `title` (obrigatório), `summary Text?`, `problem Json?`, `targetAudience Json?`, `potentialSolution Json?`, `status` (`SEED|EXPLORING|VALIDATING|ON_HOLD|DISCARDED|CONVERTED`), `convertedAt?`, `coverFileId?`, `version`, auditoria, `deletedAt?`.
- `status = CONVERTED` ⇔ existe `Project.sourceIdeaId = idea.id` (garantido na transação de conversão; teste de integridade).

**IdeaReference** — `id`, `ideaId`, `workspaceId`, `url VarChar(2048)` (somente http/https), `title?`, `note?`, `position`.

### 3.9 Arquivos

**File** (arquivo lógico)
| Campo | Tipo | Regras |
|---|---|---|
| `id`, `workspaceId` | | |
| `displayName` | VarChar(255) | editável, sanitizado (sem `/ \ ..` e caracteres de controle) |
| `currentVersionId` | FK → FileVersion | |
| `kind` | enum `IMAGE|PDF|DOCUMENT|SPREADSHEET|PRESENTATION|DESIGN|ARCHIVE|OTHER` | derivado do MIME validado |
| `isImportant`, `pinned` | Boolean | |
| `collectionId` | FK? → FileCollection | |
| auditoria, `deletedAt?` | | |

**FileVersion** — `id`, `fileId`, `workspaceId`, `versionNumber`, `storageKey` (único; nunca derivado de entrada do usuário), `originalName`, `mimeType` (detectado), `sizeBytes BigInt`, `sha256 Char(64)`, `width?`, `height?`, `thumbnailKey?`, `uploadedById`, `createdAt`. Único `(fileId, versionNumber)`. Imutável.

**FileAttachment** (vínculo, sem cópia)
- `id`, `fileId`, `workspaceId`, `projectId?`, `ideaId?`, `noteId?`, `taskId?`, `createdAt`.
- `CHECK` exatamente um alvo não nulo; únicos `(fileId, projectId)`, `(fileId, ideaId)`, `(fileId, noteId)`, `(fileId, taskId)`.
- FKs reais para cada alvo (preferido a polimorfismo `entityType/entityId`, por integridade referencial).

**FileCollection** — `id`, `workspaceId`, `projectId?`, `name`, `position`.

### 3.10 Tags

**Tag** — `id`, `workspaceId`, `name VarChar(50)`, `color` (um de 8 tokens), único `(workspaceId, name)`.
Junções: `ProjectTag`, `TaskTag`, `NoteTag`, `IdeaTag`, `FileTag`, `ClientTag` — chave composta `(entidadeId, tagId)`, cascata ao excluir.

### 3.11 Atividade, auditoria e infraestrutura

**ActivityEvent** — `id`, `workspaceId`, `actorId?` (nulo = sistema/integração), `projectId?` (para a linha do tempo do projeto), `entityType`, `entityId`, `action` (ex.: `task.status_changed`), `metadata Json` (ex.: `{from:"TODO", to:"DONE"}` — sem conteúdo sensível), `createdAt`. Índices `(workspaceId, createdAt)`, `(projectId, createdAt)`, `(entityType, entityId)`. Escrito **na mesma transação** da mudança.

**AuditLog** — `id`, `workspaceId?`, `userId?`, `action` (ex.: `auth.login_failed`), `ip?`, `userAgent?`, `metadata Json`, `createdAt`. Somente inserção; retenção proposta de 1 ano.

**Job** — `id`, `type`, `payload Json`, `status` (`PENDING|RUNNING|SUCCEEDED|FAILED|DEAD`), `runAt`, `attempts`, `maxAttempts`, `lockedAt?`, `lockedBy?`, `lastError Text?`, `dedupeKey?` (único, para idempotência), `createdAt`, `finishedAt?`. Índice `(status, runAt)`.

**IdempotencyKey** — `key`, `userId`, `requestHash`, `responseStatus`, `responseBody Json`, `createdAt` (expira em 24 h).

### 3.12 GitHub (Fase 1.1)
Ver [07-integracao-github.md](07-integracao-github.md#6-modelo-de-dados).

## 4. Regras de integridade (resumo verificável por testes)

| # | Regra | Onde é garantida |
|---|---|---|
| I-01 | Toda consulta de negócio filtra por `workspaceId` | Repositório + testes de autorização |
| I-02 | FK entre entidades do mesmo workspace (ex.: tarefa não pode apontar para marco de outro projeto/workspace) | Service + teste |
| I-03 | Subtarefa tem no máximo 1 nível e pertence ao mesmo projeto do pai | Service + teste |
| I-04 | `completedAt` consistente com status (DONE ⇔ preenchido) | Service + teste |
| I-05 | Uma ideia gera no máximo um projeto | Índice único `Project.sourceIdeaId` |
| I-06 | Conversão de ideia é atômica | Transação + teste com falha injetada |
| I-07 | Revisões de escopo e de nota são imutáveis e sequenciais | Somente inserção + índice único |
| I-08 | Códigos de itens de escopo nunca são reutilizados | `sequence` crescente por `(scope, type)` |
| I-09 | `FileAttachment` tem exatamente um alvo | `CHECK` |
| I-10 | Capa/logo do projeto são imagens do próprio workspace | Service + teste |
| I-11 | Excluir vínculo nunca apaga o arquivo; excluir arquivo remove vínculos e objeto só após a purga | Service + job |
| I-12 | Atualização com `version` divergente retorna 409 | Service (`UPDATE … WHERE id = ? AND version = ?`) + teste |
| I-13 | Projeto `CLIENT` tem `clientId` | Service + teste |
| I-14 | Contatos de cliente são removidos na purga do cliente | Cascata |

## 5. Rascunho Prisma (trecho de referência)

```prisma
// RASCUNHO — referência para revisão, não é arquivo do projeto.
generator client { provider = "prisma-client-js" }
datasource db { provider = "mysql"; url = env("DATABASE_URL") }

enum ProjectCategory { PERSONAL OWNED_PRODUCT CLIENT PROFESSIONAL_WORK }
enum ProjectStatus   { IDEA PLANNING IN_PROGRESS PAUSED COMPLETED ARCHIVED }
enum Priority        { LOW MEDIUM HIGH URGENT }
enum TaskStatus      { BACKLOG TODO IN_PROGRESS IN_REVIEW DONE }
enum DataClass       { PERSONAL CLIENT EMPLOYER }
enum MemberRole      { OWNER ADMIN COLLABORATOR CLIENT }

model Workspace {
  id        String            @id @default(cuid())
  name      String            @db.VarChar(120)
  slug      String            @unique @db.VarChar(80)
  members   WorkspaceMember[]
  projects  Project[]
  tasks     Task[]
  notes     Note[]
  createdAt DateTime          @default(now()) @db.DateTime(3)
  updatedAt DateTime          @updatedAt @db.DateTime(3)
}

model WorkspaceMember {
  workspaceId String
  userId      String
  role        MemberRole @default(OWNER)
  workspace   Workspace  @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime   @default(now()) @db.DateTime(3)
  @@id([workspaceId, userId])
}

model Project {
  id                 String          @id @default(cuid())
  workspaceId        String
  name               String          @db.VarChar(160)
  slug               String          @db.VarChar(180)
  description        String?         @db.Text
  objective          String?         @db.Text
  category           ProjectCategory
  subtype            String?         @db.VarChar(60)
  dataClassification DataClass
  hideFromOverview   Boolean         @default(false)
  status             ProjectStatus   @default(PLANNING)
  priority           Priority        @default(MEDIUM)
  startDate          DateTime?       @db.Date
  targetDate         DateTime?       @db.Date
  completedAt        DateTime?       @db.DateTime(3)
  clientId           String?
  coverFileId        String?
  logoFileId         String?
  sourceIdeaId       String?         @unique
  pinned             Boolean         @default(false)
  version            Int             @default(1)
  createdById        String
  createdAt          DateTime        @default(now()) @db.DateTime(3)
  updatedAt          DateTime        @updatedAt @db.DateTime(3)
  deletedAt          DateTime?       @db.DateTime(3)

  workspace  Workspace @relation(fields: [workspaceId], references: [id], onDelete: Restrict)
  tasks      Task[]
  notes      Note[]
  // client, coverFile, logoFile, sourceIdea, scope, milestones, attachments, tags…

  @@unique([workspaceId, slug])
  @@index([workspaceId, status])
  @@index([workspaceId, category])
  @@index([workspaceId, updatedAt])
  @@fulltext([name, description, objective])
}

model Task {
  id           String     @id @default(cuid())
  workspaceId  String
  projectId    String?
  milestoneId  String?
  parentTaskId String?
  title        String     @db.VarChar(300)
  description  Json?
  plainText    String?    @db.Text
  status       TaskStatus @default(TODO)
  priority     Priority   @default(MEDIUM)
  dueDate      DateTime?  @db.Date
  dueTime      DateTime?  @db.Time(0)
  completedAt  DateTime?  @db.DateTime(3)
  position     String     @db.VarChar(64)
  archivedAt   DateTime?  @db.DateTime(3)
  version      Int        @default(1)
  createdById  String
  createdAt    DateTime   @default(now()) @db.DateTime(3)
  updatedAt    DateTime   @updatedAt @db.DateTime(3)
  deletedAt    DateTime?  @db.DateTime(3)

  workspace  Workspace @relation(fields: [workspaceId], references: [id], onDelete: Restrict)
  project    Project?  @relation(fields: [projectId], references: [id], onDelete: Restrict)
  parent     Task?     @relation("Subtasks", fields: [parentTaskId], references: [id], onDelete: Cascade)
  subtasks   Task[]    @relation("Subtasks")

  @@index([workspaceId, dueDate])
  @@index([projectId, status, position])
  @@index([workspaceId, completedAt])
  @@fulltext([title, plainText])
}

model Note {
  id                   String    @id @default(cuid())
  workspaceId          String
  projectId            String?
  ideaId               String?
  title                String    @default("Sem título") @db.VarChar(300)
  content              Json
  contentSchemaVersion Int       @default(1)
  plainText            String    @db.MediumText
  pinned               Boolean   @default(false)
  archivedAt           DateTime? @db.DateTime(3)
  version              Int       @default(1)
  createdById          String
  createdAt            DateTime  @default(now()) @db.DateTime(3)
  updatedAt            DateTime  @updatedAt @db.DateTime(3)
  deletedAt            DateTime? @db.DateTime(3)

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Restrict)
  project   Project?  @relation(fields: [projectId], references: [id], onDelete: Restrict)

  @@index([workspaceId, projectId, updatedAt])
  @@index([workspaceId, ideaId])
  @@fulltext([title, plainText])
}
// … demais modelos conforme §3. Restrições CHECK (FileAttachment, Reminder,
// CalendarEvent) são adicionadas via SQL na migração, pois o Prisma não as declara.
```

## 6. Pontos de atenção

- **`CHECK` no Prisma:** não é declarável no schema; será adicionado manualmente no SQL da migração e coberto por teste.
- **Exclusão de workspace:** `Restrict` em tudo (nenhuma exclusão em cascata acidental de dados de negócio). Exclusão de workspace será um processo explícito. **[FUTURO]**
- **Crescimento de `ActivityEvent`:** índice por data; arquivamento após 2 anos se necessário. **[FUTURO]**
- **Snapshots de escopo/nota:** volume pequeno para uma usuária; compressão ou deltas só se necessário. **[FUTURO]**

## 7. Perfil, avatar e pet (D-24) **[PROPOSTA]**

**UserProfile** (1:1 com User): `userId` (PK/FK), `displayName VarChar(24)`, `avatarConfig Json` (validado por schema Zod: somente chaves e valores da lista permitida), `avatarSchemaVersion Int`, `themePreference (LIGHT|DARK|SYSTEM)`, `collagePreference (OFF|SUBTLE|PRESENT|FULL)`, `sidebarCollapsed Boolean`, `version`, `updatedAt`.

**PetState** (1:1 com User por workspace): `userId`, `workspaceId`, `name VarChar(16)`, `visible Boolean`, `cherries Int ≥ 0`, `xp Int ≥ 0`, `pettedToday Int`, `pettedOn Date`, `dailyGoal Int (padrão 3)`, `updatedAt`.
- Energia e humor **não são armazenados**: são calculados na leitura a partir de `Task` (concluídas hoje, atrasadas), como as demais métricas.
- `cherries` muda em transação com a conclusão/reabertura de tarefa (+1/−1 no mesmo dia), evitando cereja infinita ao marcar e desmarcar.

### 7.1 Atualização (D-25): alimentação do pet

- `PetState` ganha: `satiety Int (0–100)`, `satietyUpdatedAt DateTime` (a saciedade atual é calculada na leitura pelo decaimento desde essa data), `streakDays Int`, `lastFedOn Date`. O campo `cherries` sai e é substituído pelo inventário abaixo.
- **PetFoodItem**: `userId`, `workspaceId`, `food (CHERRY|CUPCAKE|PIE|CAKE|MILKSHAKE)`, `quantity Int ≥ 0`. Único `(userId, workspaceId, food)`.
- **PetFoodGrant** (registro imutável): `id`, `userId`, `workspaceId`, `food`, `sourceType (TASK_COMPLETED|IDEA_CREATED|MILESTONE_COMPLETED|PROJECT_COMPLETED|FEEDING_STREAK)`, `sourceId`, `grantedAt`, `revokedAt?`. **Único `(userId, sourceType, sourceId)`**, para que o mesmo evento não gere duas comidas.
- **PetMeal**: `id`, `userId`, `food`, `satietyBefore`, `satietyAfter`, `xpGained`, `eatenAt`.
- A concessão acontece na mesma transação do evento de origem (concluir tarefa, criar ideia etc.), via serviço `PetRewardsService`.
