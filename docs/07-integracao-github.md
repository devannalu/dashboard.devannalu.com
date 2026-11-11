# 07 — Arquitetura da Integração GitHub (Fase 1.1)

> Status: rascunho para revisão · Fase 0 · 10/11/2026
> Nada desta integração foi implementado ou validado contra a API do GitHub ainda. Os detalhes de endpoints e eventos devem ser conferidos na documentação oficial durante a implementação.

> **Antecipado em 11/11/2026 (D-37):** o gráfico de contribuições do Início já lê o calendário do perfil via GraphQL com um token pessoal somente leitura (`GITHUB_TOKEN`). Também antecipada (D-39): **importar repositórios como projetos** (Projetos → Importar do GitHub), com `GITHUB_TOKEN` para os repositórios pessoais e `GITHUB_ORG_TOKENS` para organizações (ex.: Florence). O restante deste documento (GitHub App, PRs, issues, webhooks) continua como Fase 1.1.

## 1. Objetivos e limites

| | |
|---|---|
| **Objetivo** | Trazer a atividade de desenvolvimento para dentro do projeto sem digitação manual |
| **Tipo** | **GitHub App** **[DIRETRIZ]** |
| **Acesso** | **Somente leitura** **[DIRETRIZ]**. Qualquer escrita no GitHub exige nova decisão de produto e nova autorização |
| **Fonte da verdade** | GitHub é dono de repositórios, commits, branches, PRs, issues e releases; o Studio OS guarda um **espelho de leitura** desses dados. O Studio OS é dono de projetos, escopo, tarefas, notas e arquivos **[DIRETRIZ]** |
| **Regra de progresso** | Atividade do GitHub **nunca** altera progresso nem status do projeto; PR mesclado não conclui projeto **[DIRETRIZ]** |

## 2. Por que GitHub App (e não OAuth App ou token pessoal)

- Permissões granulares por repositório, escolhidas pela usuária na instalação.
- Tokens de instalação de curta duração (cerca de 1 h), gerados sob demanda: não há token de longa duração para vazar.
- Webhooks configurados no próprio App, para todos os repositórios autorizados.
- Pronto para o futuro multiusuário/SaaS (cada workspace instala o App na sua conta/organização).

## 3. Permissões **[PROPOSTA]**

| Permissão (repositório) | Nível | Para quê |
|---|---|---|
| Metadata | Leitura (obrigatória) | Nome, visibilidade, branch padrão, linguagem |
| Contents | Leitura | Commits, branches, releases, tags |
| Issues | Leitura | Issues e vínculo com tarefas |
| Pull requests | Leitura | PRs e seu estado |

Sem permissões de conta ou organização. Sem acesso de escrita.

**Eventos de webhook assinados:** `installation`, `installation_repositories`, `repository`, `push`, `pull_request`, `issues`, `release`.

## 4. Conexão (instalação) e associação

### 4.1 Fluxo de conexão

```
Owner                 Studio OS (api)                 GitHub
  │ "Conectar GitHub"       │                            │
  ├────────────────────────▶│ gera state (nonce assinado,│
  │                         │ ligado à sessão, 10 min)   │
  │◀── redirect ────────────┤                            │
  │ github.com/apps/<app>/installations/new?state=…      │
  ├─────────────────────────────────────────────────────▶│ escolhe conta e repositórios
  │◀──────────── redirect para Setup URL ────────────────┤ ?installation_id=…&setup_action=install&code=…&state=…
  ├────────────────────────▶│ 1. valida state + sessão   │
  │                         │ 2. troca code por token    │
  │                         │    de usuário ────────────▶│
  │                         │ 3. GET /user/installations │
  │                         │    confirma que installation_id pertence a quem instalou
  │                         │ 4. descarta token de usuário (não armazena)
  │                         │ 5. grava GithubInstallation (workspace)
  │                         │ 6. job: listar repositórios da instalação
  │◀── "Conectado" ─────────┤                            │
```

**Por que o passo 3 é obrigatório:** o `installation_id` chega pela URL e pode ser forjado. Sem verificar a posse com o token do usuário, alguém poderia associar a instalação de outra pessoa ao próprio workspace. Para isso, o App precisa ter "Request user authorization (OAuth) during installation" habilitado.

### 4.2 Associação repositório ↔ projeto
- Em **Projeto → Configurações → GitHub** (ou na aba GitHub vazia): escolher entre os repositórios autorizados.
- Um projeto pode ter **vários repositórios** (ex.: front e back), com um marcado como principal. Um repositório pode estar em mais de um projeto (raro, permitido). **[PROPOSTA]**
- Projetos `PROFESSIONAL_WORK` exigem confirmação explícita antes do vínculo (classificação `EMPLOYER`). **[PROPOSTA]**
- Ao vincular, um job de **importação inicial** é criado.

### 4.3 Vínculo issue ↔ tarefa **[PROPOSTA]**
- No painel da tarefa: "Vincular issue" (busca nas issues espelhadas dos repositórios do projeto).
- Na aba GitHub do projeto: "Criar tarefa a partir da issue" → cria tarefa interna com título e link (nada é escrito no GitHub).
- O chip da issue na tarefa mostra estado (aberta/fechada) e link.
- **Quando a issue fecha:** o sistema **sugere** concluir a tarefa (notificação + ação em um clique). Não conclui automaticamente. → Q11.

## 5. Sincronização

### 5.1 Importação inicial (ao vincular um repositório) **[PROPOSTA]**
| Dado | Escopo inicial |
|---|---|
| Metadados do repositório | Completo |
| Commits | Branch padrão, últimos 90 dias, máx. 500 |
| Pull requests | Abertos + atualizados nos últimos 90 dias |
| Issues | Abertas + atualizadas nos últimos 90 dias (excluindo PRs, que a API de issues também retorna) |
| Releases | Últimas 20 |

Paginação respeitando limites; progresso visível ("Importando… 120 commits").

### 5.2 Atualização por eventos (webhooks)

```
GitHub ──POST──▶ /api/v1/integrations/github/webhooks
                   │ 1. lê corpo bruto (rawBody)
                   │ 2. verifica X-Hub-Signature-256 (HMAC-SHA256, comparação em tempo constante)
                   │    inválida → 401, registra auditoria, descarta
                   │ 3. INSERT GithubWebhookDelivery (deliveryId = X-GitHub-Delivery, único)
                   │    duplicado → 200 (já recebido), nada mais
                   │ 4. cria Job(type="github.process_delivery", dedupeKey=deliveryId)
                   │ 5. responde 202 em poucos ms
                   ▼
Worker ── processa Job ──▶ upsert por ID do GitHub ──▶ ActivityEvent (quando relevante)
```

Regras de processamento:
- **Idempotência:** chave única em `deliveryId` + upserts por ID do GitHub. Processar o mesmo evento duas vezes produz o mesmo estado.
- **Ordem fora de sequência:** cada registro guarda `githubUpdatedAt`; um evento mais antigo que o estado salvo é ignorado.
- **Eventos de repositórios não vinculados:** metadados atualizados, conteúdo ignorado (economia).
- **`push`:** grava commits do payload; se o payload vier truncado ou for um force-push, agenda reconciliação daquele branch via API.
- **`installation` (deleted/suspend):** marca a instalação como removida/suspensa e para a sincronização; dados espelhados ficam marcados como "desconectado" (com opção de apagar). → Q10.
- **`installation_repositories` (removed):** marca o repositório como sem acesso; vínculos com projetos permanecem visíveis com aviso.

### 5.3 Reconciliação (rede de segurança)
O GitHub **não reenvia automaticamente** webhooks que falharam, e a aplicação pode ficar fora do ar. Por isso:
- Job a cada 6 h por repositório vinculado: busca incremental (`since` = última sincronização), com requisições condicionais (`ETag`/`If-None-Match`) que não consomem cota quando nada mudou.
- Botão **"Sincronizar agora"** na aba GitHub e em Configurações → Integrações.
- **[PROPOSTA — P2]** Job que lista entregas com falha pela API de webhooks do App e solicita reenvio.

### 5.4 Limites de taxa e erros
- Ler `X-RateLimit-Remaining`/`X-RateLimit-Reset`; abaixo de 10% da cota, adiar jobs não urgentes.
- `403/429` com `Retry-After` (limite secundário) → reagendar após o tempo indicado.
- Erros 5xx/rede → backoff exponencial com jitter, máx. 6 tentativas, depois `DEAD` com erro visível na interface.
- `401` com token de instalação → renovar token uma vez; se persistir, marcar instalação com erro e avisar a owner.
- Cliente HTTP: `@octokit/app` + `@octokit/plugin-throttling` + `@octokit/plugin-retry`. **[PROPOSTA]**

### 5.5 Estado de sincronização visível
Por repositório: `Sincronizado há 5 min` · `Sincronizando…` · `Erro: sem permissão para Issues — revise a instalação` · `Desconectado`. Nunca falhar em silêncio.

## 6. Modelo de dados

| Entidade | Campos principais | Restrições |
|---|---|---|
| **GithubInstallation** | `id`, `workspaceId`, `installationId BigInt`, `accountLogin`, `accountType (User/Organization)`, `status (ACTIVE/SUSPENDED/REMOVED)`, `connectedById`, `createdAt` | `installationId` único |
| **GithubRepository** | `id`, `workspaceId`, `installationRefId`, `githubId BigInt`, `nodeId`, `fullName`, `defaultBranch`, `isPrivate`, `htmlUrl`, `description?`, `language?`, `pushedAt?`, `accessStatus`, `lastSyncedAt?`, `syncStatus`, `syncError?` | `githubId` único |
| **ProjectRepository** | `projectId`, `repositoryId`, `isPrimary`, `linkedById`, `createdAt` | PK composta |
| **GithubCommit** | `id`, `repositoryId`, `sha Char(40)`, `message Text`, `authorLogin?`, `authorName?`, `committedAt`, `htmlUrl`, `branch?` | único `(repositoryId, sha)` |
| **GithubPullRequest** | `id`, `repositoryId`, `githubId`, `number`, `title`, `state (OPEN/CLOSED/MERGED)`, `isDraft`, `authorLogin`, `headRef`, `baseRef`, `htmlUrl`, `openedAt`, `closedAt?`, `mergedAt?`, `githubUpdatedAt` | único `(repositoryId, number)` |
| **GithubIssue** | `id`, `repositoryId`, `githubId`, `number`, `title`, `state (OPEN/CLOSED)`, `stateReason?`, `authorLogin`, `labels Json`, `htmlUrl`, `openedAt`, `closedAt?`, `githubUpdatedAt` | único `(repositoryId, number)` |
| **GithubRelease** | `id`, `repositoryId`, `githubId`, `tagName`, `name?`, `isPrerelease`, `isDraft`, `publishedAt?`, `htmlUrl` | único `(repositoryId, githubId)` |
| **TaskIssueLink** | `taskId`, `issueId`, `linkedById`, `createdAt` | PK composta |
| **GithubWebhookDelivery** | `deliveryId` (PK), `event`, `action?`, `installationId?`, `payload Json`, `receivedAt`, `status (RECEIVED/PROCESSED/IGNORED/FAILED)`, `error?`, `processedAt?` | payload apagado após 14 dias |

O que **não** é armazenado: diffs, conteúdo de arquivos, corpo completo de issues/PRs (só título e metadados no MVP — reduz risco de guardar informação sensível). **[PROPOSTA]**

## 7. Segurança e credenciais

| Segredo | Onde fica | Regras |
|---|---|---|
| Chave privada do App (PEM) | Variável de ambiente / arquivo montado como segredo no servidor | Nunca no banco, nunca no Git, nunca em log |
| Webhook secret | Variável de ambiente | Rotação documentada |
| Client secret (OAuth do App) | Variável de ambiente | Usado só na verificação da instalação |
| Tokens de instalação | **Memória do processo**, até 5 min antes de expirar | Não persistidos |
| Token de usuário (verificação) | Descartado após `GET /user/installations` | Não persistido |

- Endpoint de webhook sem sessão, mas protegido por assinatura; limite de corpo (ex.: 5 MB); limitação de taxa.
- `AuditLog` para conexão, desconexão, alteração de repositórios autorizados e falhas de assinatura.
- Desenvolvimento local: webhooks via smee.io (ou túnel equivalente) com App de desenvolvimento separado do App de produção.

## 8. Onde os dados aparecem

| Local | Conteúdo |
|---|---|
| Projeto → aba GitHub | Repositórios vinculados, estado de sincronização, PRs abertos, issues abertas, últimos commits, releases, atividade por semana (gráfico simples de commits **como informação**, não progresso) |
| Dashboard → GitHub | Últimos 5 eventos relevantes (PR aberto/mesclado, release publicada, issue vinculada fechada) |
| Tarefa → painel | Chips de issues vinculadas com estado |
| Atividade do projeto | Eventos GitHub com filtro próprio |
| Relatórios | "Atividade de desenvolvimento": commits e PRs mesclados por semana, rotulados como atividade, nunca como progresso |

## 9. Critérios de aceite da integração

- [ ] Webhook com assinatura inválida é rejeitado (401) e auditado; com assinatura válida é aceito em < 500 ms.
- [ ] Reenviar a mesma entrega (mesmo `X-GitHub-Delivery`) não duplica dados.
- [ ] Evento mais antigo processado após um mais novo não regride o estado.
- [ ] `installation_id` de terceiro na Setup URL é recusado.
- [ ] Nenhum segredo ou token aparece em logs (teste automatizado sobre a saída de log).
- [ ] Desinstalar o App no GitHub para a sincronização e mostra "Desconectado" na interface.
- [ ] Progresso do projeto permanece idêntico antes e depois de qualquer evento GitHub.
- [ ] Indisponibilidade simulada de 1 h é recuperada pela reconciliação sem intervenção.

## 10. Futuro **[FUTURO]**
- Escrita no GitHub (criar issue a partir de tarefa, comentar) — exige decisão de produto e permissão `Issues: write`.
- Automação "PR mesclado que referencia a tarefa → mover tarefa para Em revisão/Concluída" — sempre opcional e configurável.
- Deploys/Actions, checks e branches protegidos.
