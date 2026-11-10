# 08 — Backlog do MVP

> Status: rascunho para revisão · Fase 0 · 10/11/2026

## Legenda

| Prioridade | Significado |
|---|---|
| **P0** | Indispensável para o lançamento interno do MVP |
| **P1** | Faz parte do MVP, mas pode ser entregue logo após o lançamento interno sem bloquear o uso |
| **P2** | Melhoria; entra se sobrar capacidade ou na sequência |

Tamanho relativo: **P** (até 1 dia), **M** (2–3 dias), **G** (4–6 dias). Estimativas para referência de sequenciamento, não compromisso.

**Definição de pronto (vale para toda história):** código revisado; tipos estritos sem `any` injustificado; testes do nível adequado passando no CI; textos em pt-BR; estados de carregamento, vazio e erro; acessível por teclado; documentação atualizada quando aplicável; nenhum segredo no código.

---

## E0 — Fundação técnica

| ID | História | Pri. | Tam. | Depende de |
|---|---|---|---|---|
| E0-1 | Monorepo pnpm + Turborepo com `apps/web`, `apps/api`, `packages/contracts`, `packages/config` | P0 | M | — |
| E0-2 | TypeScript estrito, ESLint, Prettier, regra de lint contra cores cruas e `any` | P0 | P | E0-1 |
| E0-3 | Docker Compose de desenvolvimento (MySQL 8, MinIO) + `.env.example` | P0 | P | E0-1 |
| E0-4 | Prisma configurado, primeira migração vazia, script de seed só para dev | P0 | P | E0-3 |
| E0-5 | NestJS base: config validada por Zod (falha ao iniciar se faltar variável), logger pino com redação, filtro de erros problem+json, `requestId`, health checks | P0 | M | E0-1 |
| E0-6 | Next.js base: App Router, fontes via `next/font`, cliente HTTP, TanStack Query, formatação pt-BR | P0 | M | E0-1 |
| E0-7 | CI GitHub Actions: lint, typecheck, testes (com MySQL), build, gitleaks, audit | P0 | M | E0-2, E0-4 |
| E0-8 | Infra de testes: Vitest, Supertest, Testcontainers, Playwright | P0 | M | E0-5, E0-6 |
| E0-9 | Fila de jobs em MySQL + processo worker | P0 | M | E0-4, E0-5 |

**Critérios de aceite (épico):**
- [ ] `pnpm install && docker compose up -d && pnpm dev` sobe web e api localmente seguindo o README.
- [ ] CI falha se houver erro de tipo, lint, teste ou segredo detectado.
- [ ] API recusa iniciar com variável de ambiente obrigatória ausente, com mensagem clara.
- [ ] Erro não tratado retorna problem+json com `requestId`, sem stack trace em produção.
- [ ] Job com falha é reexecutado com backoff e vai para `DEAD` após o máximo de tentativas (teste de integração).

---

## E1 — Autenticação e segurança de conta

| ID | História | Pri. | Tam. | Depende de |
|---|---|---|---|---|
| E1-1 | Primeiro acesso: owner define a senha para o e-mail de `OWNER_EMAIL`, com `SETUP_TOKEN` de uso único; cria o workspace | P0 | M | E0-5, E2-1 |
| E1-2 | Login com e-mail/senha (Argon2id), sessão por cookie `__Host-`, logout | P0 | M | E1-1 |
| E1-3 | Proteção CSRF (double-submit + Origin) | P0 | P | E1-2 |
| E1-4 | Limitação de taxa e bloqueio progressivo no login | P0 | P | E1-2 |
| E1-5 | ~~2FA TOTP~~ — movido para o futuro (D-19). No lugar: senha mínima de 12 caracteres + verificação contra senhas vazadas | P0 | P | E1-2 |
| E1-6 | Sessões ativas: listar, encerrar uma, encerrar todas | P1 | P | E1-2 |
| E1-7 | Alterar senha (exige atual; encerra outras sessões) | P1 | P | E1-2 |
| E1-8 | Reautenticação (senha) para ações sensíveis | P1 | P | E1-2 |
| E1-9 | `AuditLog` dos eventos de autenticação | P0 | P | E1-2 |
| E1-10 | Comando CLI de redefinição de senha no servidor | P1 | P | E1-2 |

**Critérios de aceite:**
- [ ] Setup não pode ser executado de novo após existir uma usuária (teste).
- [ ] Senha nunca é registrada em log nem retornada pela API (teste sobre logs).
- [ ] Banco armazena só hash do token de sessão.
- [ ] 10 tentativas erradas em sequência resultam em bloqueio temporário e evento de auditoria.
- [ ] Requisição de mutação sem token CSRF ou de outra origem recebe 403.
- [ ] Primeiro acesso recusa e-mail diferente de `OWNER_EMAIL` e token inválido; depois de criada a senha, a rota retorna 404.
- [ ] Senha com menos de 12 caracteres ou presente na lista de senhas vazadas é recusada com mensagem clara.

---

## E2 — Workspace e autorização

| ID | História | Pri. | Tam. | Depende de |
|---|---|---|---|---|
| E2-1 | Modelos `Workspace`, `WorkspaceMember`, `User`; enum de papéis | P0 | P | E0-4 |
| E2-2 | `SessionGuard` + `WorkspaceMemberGuard` + contexto de requisição | P0 | M | E1-2 |
| E2-3 | Padrão de repositório escopado por workspace (base reutilizável) | P0 | M | E2-2 |
| E2-4 | Suíte de testes de autorização cruzada (helper que cria 2 workspaces) | P0 | M | E2-3 |

**Critérios de aceite:**
- [ ] Toda rota de negócio retorna 404 para recurso de outro workspace (suíte E2-4 aplicada a cada novo módulo).
- [ ] Não existe nenhum ID de usuário ou workspace fixo no código.

---

## E3 — Shell da aplicação e design system

| ID | História | Pri. | Tam. | Depende de |
|---|---|---|---|---|
| E3-1 | Tokens CSS (claro/escuro) + integração Tailwind v4 | P0 | M | E0-6 |
| E3-2 | Primitivos shadcn adaptados: Button, Input, Select, Combobox, DatePicker pt-BR, Dialog, Sheet, Tabs, Toast, Badge, Tag, Card, Table, Skeleton, EmptyState, Progress | P0 | G | E3-1 |
| E3-3 | Layout: barra lateral (recolhível, gaveta no celular), barra superior, breadcrumb, "pular para o conteúdo" | P0 | M | E3-2 |
| E3-4 | Alternância de tema sem "piscar" + preferência salva | P0 | P | E3-1 |
| E3-5 | Páginas de login/2FA/setup no padrão visual | P0 | M | E3-2, E1-2 |
| E3-6 | Página interna `/_design` (somente dev) com todos os componentes nos dois temas | P1 | M | E3-2 |
| E3-7 | Testes automatizados de contraste e axe nos componentes | P0 | P | E3-2 |
| E3-8 | **Aprovação visual da owner**: Dashboard e Detalhe do Projeto em alta fidelidade antes de E4/E15 | P0 | M | E3-2 |

**Critérios de aceite:**
- [ ] Nenhuma cor/tamanho cru em componentes (lint).
- [ ] Todos os componentes passam axe sem violações sérias nos dois temas.
- [ ] Navegação inteira operável só com teclado, com foco visível.
- [ ] Direção visual aprovada pela owner registrada no registro de decisões.

---

## E4 — Projetos

| ID | História | Pri. | Tam. | Depende de |
|---|---|---|---|---|
| E4-1 | API CRUD de projetos (categorias, status, prioridade, datas, slug, classificação derivada, `version`) | P0 | M | E2-3 |
| E4-2 | Lista de projetos: abas por categoria, filtros na URL, grade e tabela, paginação | P0 | G | E4-1, E3-3 |
| E4-3 | Criar/editar projeto (página), com cliente obrigatório para categoria Cliente e aviso para Trabalho Profissional | P0 | M | E4-1, E12-1 |
| E4-4 | Detalhe do projeto: cabeçalho, abas, Visão geral com checklist de primeiros passos | P0 | G | E4-1 |
| E4-5 | Progresso calculado (regra pura + endpoint agregado) | P0 | P | E6-1 |
| E4-6 | Arquivar, excluir para lixeira, restaurar | P0 | M | E4-1 |
| E4-7 | Fixar projeto na barra lateral | P1 | P | E4-1 |
| E4-8 | Tags (módulo Tag compartilhado + uso em projetos) | P0 | M | E2-3 |
| E4-9 | Ações em massa na tabela | P2 | M | E4-2 |

**Critérios de aceite:**
- [ ] Criar projeto exige só nome e categoria; slug único gerado automaticamente.
- [ ] Projeto `CLIENT` sem cliente é recusado (400) com mensagem clara.
- [ ] Progresso: testes unitários cobrem 0 tarefas ("Sem tarefas"), subtarefas ignoradas, arquivadas ignoradas, 100%.
- [ ] Projeto excluído some das listas, aparece na lixeira e é restaurável por 30 dias.
- [ ] Edição concorrente gera 409 e a interface oferece recarregar sem perder o que foi digitado.

---

## E5 — Escopo

| ID | História | Pri. | Tam. | Depende de |
|---|---|---|---|---|
| E5-1 | Modelo e API de escopo (seções de texto + itens com códigos) | P0 | M | E4-1 |
| E5-2 | Tela de escopo: seções, índice lateral, edição in-place, reordenação de itens | P0 | G | E5-1, E9-2 |
| E5-3 | Revisões: criação a cada salvamento com resumo opcional; listagem | P0 | M | E5-1 |
| E5-4 | Comparação entre revisões e restauração (gera nova revisão) | P1 | M | E5-3 |
| E5-5 | Proteção de alterações não salvas + rascunho local | P0 | P | E5-2 |

**Critérios de aceite:**
- [ ] Códigos `RF-001…` sequenciais por tipo e nunca reutilizados após exclusão.
- [ ] Toda alteração salva gera exatamente uma revisão imutável com autor e data.
- [ ] Restaurar a revisão 3 quando a atual é 7 cria a revisão 8 com o conteúdo da 3.
- [ ] Sair da página com alterações não salvas exibe aviso.

---

## E6 — Tarefas, subtarefas, checklists e Kanban

| ID | História | Pri. | Tam. | Depende de |
|---|---|---|---|---|
| E6-1 | API de tarefas: CRUD, status, `completedAt`, posição fracionária, `version`, filtros | P0 | G | E4-1 |
| E6-2 | Kanban por projeto com arrastar e soltar (dnd-kit), atualização otimista e reversão em erro | P0 | G | E6-1, E3-2 |
| E6-3 | Visão Lista com agrupamento e edição inline | P0 | M | E6-1 |
| E6-4 | Painel lateral de detalhe da tarefa (com URL própria) | P0 | G | E6-1, E9-2 |
| E6-5 | Subtarefas (1 nível) e checklist | P0 | M | E6-4 |
| E6-6 | Tela global "Tarefas" (todos os projetos) com filtros | P0 | M | E6-3 |
| E6-7 | Mover por teclado / menu "Mover para…" (alternativa ao arrastar) | P0 | M | E6-2 |
| E6-8 | Atividade por tarefa | P1 | P | E14-1 |
| E6-9 | Criação rápida inline (`T`) | P1 | P | E6-2 |

**Critérios de aceite:**
- [ ] Mover para Concluída define `completedAt`; sair de Concluída limpa.
- [ ] Subtarefa de subtarefa é recusada; subtarefa sempre no mesmo projeto do pai.
- [ ] Ordem do Kanban persiste após recarregar; falha de rede devolve o card à posição original com aviso.
- [ ] Kanban totalmente operável por teclado, com anúncios para leitor de tela.
- [ ] Kanban fluido com 500 tarefas no projeto.

---

## E7 — Marcos

| ID | História | Pri. | Tam. | Depende de |
|---|---|---|---|---|
| E7-1 | API e tela de marcos (linha do tempo, flag Entrega, progresso) | P0 | M | E6-1 |
| E7-2 | Associar tarefa a marco (mesmo projeto) | P0 | P | E7-1 |
| E7-3 | Sugestão de concluir marco quando todas as tarefas estiverem concluídas | P1 | P | E7-1 |

**Critérios de aceite:**
- [ ] Tarefa não pode ser associada a marco de outro projeto (400).
- [ ] Progresso do marco segue a mesma regra do projeto e está coberto por teste.

---

## E8 — Calendário e lembretes

| ID | História | Pri. | Tam. | Depende de |
|---|---|---|---|---|
| E8-1 | Endpoint de calendário por intervalo, unindo tarefas, marcos, entregas e eventos (sem cópia) | P0 | M | E6-1, E7-1 |
| E8-2 | CRUD de eventos próprios | P0 | M | E2-3 |
| E8-3 | Visão Mensal | P0 | G | E8-1 |
| E8-4 | Visão Semanal com grade horária | P0 | G | E8-1 |
| E8-5 | Visão Agenda | P0 | M | E8-1 |
| E8-6 | Arrastar item para mudar data (tarefa/marco/evento) | P1 | M | E8-3 |
| E8-7 | Lembretes (tarefa e evento) + notificações dentro do app (sino) via job | P1 | M | E0-9, E8-2 |
| E8-8 | Fuso horário e início da semana configuráveis | P0 | P | E1-2 |
| E8-9 | Eventos recorrentes | P2 | G | E8-2 |

**Critérios de aceite:**
- [ ] Alterar `dueDate` de tarefa reflete no calendário na próxima consulta (sem dados duplicados).
- [ ] Marco com flag Entrega aparece uma única vez.
- [ ] Tarefa com vencimento em `10/11/2026` aparece em 10/11 independentemente do fuso do navegador.
- [ ] Lembrete dispara notificação no horário (tolerância de 1 min) e não dispara duas vezes.

---

## E9 — Notas e captura rápida

| ID | História | Pri. | Tam. | Depende de |
|---|---|---|---|---|
| E9-1 | API de notas: CRUD, contextos (Inbox/projeto/ideia), `version`, extração de `plainText`, idempotência | P0 | M | E2-3 |
| E9-2 | Componente de editor Tiptap reutilizável (notas, escopo, tarefa) com esquema fechado | P0 | G | E3-2 |
| E9-3 | Salvamento automático + indicador + rascunho local (IndexedDB) | P0 | M | E9-1, E9-2 |
| E9-4 | Resolução de conflito de versão (comparação e escolha) | P0 | M | E9-3 |
| E9-5 | Tela Notas (Inbox, Projetos, Ideias, Arquivadas) + aba Notas do projeto | P0 | M | E9-1 |
| E9-6 | Captura rápida global (atalho + botão) | P0 | M | E9-1 |
| E9-7 | Ações da Inbox: atribuir a projeto, converter em tarefa, vincular a ideia, tags, arquivar | P0 | M | E9-5, E6-1 |
| E9-8 | Histórico de versões da nota e restauração | P1 | M | E9-3 |
| E9-9 | Anexos e imagens no editor | P1 | M | E9-2, E11-1 |

**Critérios de aceite:**
- [ ] Fechar a aba no meio da digitação e reabrir recupera o conteúdo não enviado.
- [ ] Duas abas editando a mesma nota: a segunda a salvar recebe conflito e escolhe explicitamente; nada é sobrescrito sem escolha.
- [ ] Conteúdo malicioso (`<img onerror>`, `javascript:`) não executa (teste E2E de XSS).
- [ ] Captura rápida: do atalho ao "salvo" em < 5 s; reenvio por falha de rede não duplica a nota.
- [ ] Converter nota em tarefa cria a tarefa e deixa a nota arquivada com link.

---

## E10 — Idea Lab e conversão

| ID | História | Pri. | Tam. | Depende de |
|---|---|---|---|---|
| E10-1 | API de ideias + referências | P0 | M | E2-3 |
| E10-2 | Tela Idea Lab (mural/lista, filtros por status/tag) | P0 | M | E10-1 |
| E10-3 | Detalhe da ideia com seções progressivas, referências, notas e arquivos | P0 | G | E10-1, E9-5 |
| E10-4 | Conversão ideia → projeto (transação única, escopo inicial, revinculação de notas/arquivos, somente leitura) | P0 | G | E10-3, E4-1, E5-1, E11-1 |

**Critérios de aceite:**
- [ ] Criar ideia exige apenas título.
- [ ] Conversão atômica: falha injetada no meio não deixa projeto nem vínculos parciais.
- [ ] Após conversão: zero objetos duplicados no storage; notas visíveis no projeto; ideia somente leitura com link; nova conversão recusada (409).

---

## E11 — Arquivos e ativos

| ID | História | Pri. | Tam. | Depende de |
|---|---|---|---|---|
| E11-1 | Serviço de storage S3 (MinIO local) + upload via API com validação de tamanho, extensão e assinatura de bytes, SHA-256 | P0 | G | E0-3, E2-3 |
| E11-2 | Download autorizado por URL assinada (5 min), `Content-Disposition` seguro | P0 | M | E11-1 |
| E11-3 | Vínculos (`FileAttachment`) com projeto, ideia, nota e tarefa | P0 | M | E11-1 |
| E11-4 | Biblioteca central: grade/lista, filtros, busca, painel de detalhe | P0 | G | E11-3 |
| E11-5 | Renomear, importante, fixar, tags, coleções | P0 | M | E11-4 |
| E11-6 | Substituir arquivo com histórico de versões e restauração | P0 | M | E11-1 |
| E11-7 | Definir capa e logo do projeto | P0 | P | E11-3, E4-4 |
| E11-8 | Miniaturas via job (sharp) com remoção de EXIF | P1 | M | E0-9, E11-1 |
| E11-9 | Pré-visualização de PDF | P1 | M | E11-2 |
| E11-10 | Limpeza de objetos órfãos e purga da lixeira | P1 | M | E0-9 |

**Critérios de aceite:**
- [ ] Executável renomeado para `.png` é rejeitado; arquivo acima do limite é rejeitado com mensagem específica.
- [ ] Chave de storage não contém nome original nem qualquer entrada do usuário (teste com `../../etc/passwd` como nome).
- [ ] URL de download expira e não é gerada para outro workspace.
- [ ] SVG baixado sempre como anexo, nunca renderizado inline.
- [ ] Substituir preserva versões antigas baixáveis.

---

## E12 — Clientes

| ID | História | Pri. | Tam. | Depende de |
|---|---|---|---|---|
| E12-1 | API e telas de clientes e contatos (lista, detalhe, projetos associados, notas) | P0 | M | E2-3 |
| E12-2 | Histórico do cliente (projetos e atividade) | P1 | P | E12-1, E14-1 |

**Critérios de aceite:**
- [ ] Purga definitiva do cliente remove contatos (LGPD) e é bloqueada se houver projetos ativos vinculados (mensagem explica).

---

## E13 — Busca global

| ID | História | Pri. | Tam. | Depende de |
|---|---|---|---|---|
| E13-1 | Endpoint de busca unificada (FULLTEXT) com resultados agrupados e escopo por workspace | P0 | M | E4, E6, E9, E10, E11, E12 |
| E13-2 | Paleta de comandos `Ctrl/⌘ K` com navegação e ações rápidas | P0 | M | E13-1 |

**Critérios de aceite:**
- [ ] Busca ignora acentos e maiúsculas ("reuniao" encontra "Reunião").
- [ ] Nenhum resultado de outro workspace ou da lixeira.
- [ ] Resposta p95 < 300 ms com o volume de referência (RNF-07).

---

## E14 — Atividade e auditoria

| ID | História | Pri. | Tam. | Depende de |
|---|---|---|---|---|
| E14-1 | Serviço de `ActivityEvent` gravado na mesma transação das mudanças | P0 | M | E2-3 |
| E14-2 | Aba Atividade do projeto (linha do tempo, filtros) | P1 | M | E14-1 |
| E14-3 | Visualização do log de auditoria em Configurações → Segurança | P2 | P | E1-9 |

**Critérios de aceite:**
- [ ] Mudança revertida por erro de transação não deixa evento órfão.
- [ ] Metadados de eventos não contêm conteúdo de notas nem dados pessoais.

---

## E15 — Dashboard

| ID | História | Pri. | Tam. | Depende de |
|---|---|---|---|---|
| E15-1 | Endpoint agregado do Dashboard (uma chamada, consultas otimizadas) | P0 | M | E6, E7, E8, E9, E14 |
| E15-2 | Tela Dashboard conforme especificação aprovada (E3-8) | P0 | G | E15-1, E3-8 |
| E15-3 | Estados vazios e primeiro acesso | P0 | P | E15-2 |

**Critérios de aceite:**
- [ ] Cada número confere com a fórmula documentada (testes de integração com fixture conhecida).
- [ ] Workspace vazio não exibe nenhum número inventado.
- [ ] Carregamento < 1,5 s no volume de referência.

---

## E16 — Relatórios básicos

| ID | História | Pri. | Tam. | Depende de |
|---|---|---|---|---|
| E16-1 | Endpoints de relatórios (status, categoria, concluídas por semana, atrasadas, marcos, entrega no prazo) | P1 | M | E6, E7 |
| E16-2 | Tela de relatórios com seletor de período e "Como calculamos" | P1 | M | E16-1 |

**Critérios de aceite:**
- [ ] Toda métrica exibe sua definição; amostras pequenas mostram "Dados insuficientes".
- [ ] Projetos com `hideFromOverview` excluídos quando a opção estiver ativa.

---

## E17 — Operação e lançamento interno

| ID | História | Pri. | Tam. | Depende de |
|---|---|---|---|---|
| E17-1 | Imagens Docker de produção (web, api, worker) | P0 | M | E0 |
| E17-2 | Servidor de produção: Caddy, HTTPS, cabeçalhos de segurança, firewall | P0 | M | E17-1, Q3 |
| E17-3 | Pipeline de deploy com migração e smoke test | P0 | M | E17-2 |
| E17-4 | Backup diário criptografado + teste de restauração automatizado | P0 | M | E17-2 |
| E17-5 | Monitoramento de erros (Sentry) e disponibilidade | P0 | P | E17-2 |
| E17-6 | Exportação completa de dados | P1 | M | E11, E9 |
| E17-7 | Lixeira unificada | P1 | M | módulos |
| E17-8 | Revisão de segurança pré-lançamento (checklist OWASP ASVS nível 1 + testes) | P0 | M | tudo |
| E17-9 | Auditoria de acessibilidade (axe + NVDA) | P0 | M | tudo |

**Critérios de aceite:**
- [ ] Restauração do backup verificada em ambiente isolado com contagens idênticas.
- [ ] Nenhum segredo no repositório nem nas imagens Docker (varredura).
- [ ] Relatório da revisão de segurança anexado ao registro de decisões, com pendências explícitas.

---

## E18 — Integração GitHub (Fase 1.1)

| ID | História | Pri. | Tam. | Depende de |
|---|---|---|---|---|
| E18-1 | Registrar GitHub App (dev e produção) com permissões mínimas | P0 | P | Q16 |
| E18-2 | Fluxo de instalação com verificação de posse (state + `/user/installations`) | P0 | M | E18-1, E1 |
| E18-3 | Listagem de repositórios e vínculo com projetos | P0 | M | E18-2, E4 |
| E18-4 | Importação inicial (commits, PRs, issues, releases) | P0 | G | E18-3, E0-9 |
| E18-5 | Endpoint de webhook com verificação de assinatura, idempotência e fila | P0 | M | E18-1, E0-9 |
| E18-6 | Processadores de eventos (push, pull_request, issues, release, installation*) | P0 | G | E18-5 |
| E18-7 | Reconciliação periódica + "Sincronizar agora" | P0 | M | E18-4 |
| E18-8 | Aba GitHub do projeto + widget do Dashboard + estado de sincronização | P0 | G | E18-4 |
| E18-9 | Vínculo issue ↔ tarefa e "criar tarefa a partir da issue" | P1 | M | E18-6, E6-4 |
| E18-10 | Sugestão de concluir tarefa quando a issue vinculada fecha | P2 | P | E18-9 |

Critérios de aceite: ver [07-integracao-github.md §9](07-integracao-github.md#9-critérios-de-aceite-da-integração).

---

## E19 — Perfil, avatar e pet (D-24)

| ID | História | Pri. | Tam. | Depende de |
|---|---|---|---|---|
| E19-1 | Modelo `UserProfile` (nome de exibição, `avatarConfig` JSON validado, nome do pet, preferências de tema/colagem/menu) + API | P1 | M | E1, E2 |
| E19-2 | Renderizador de avatar SVG em camadas (componente React compartilhado: foto de perfil + corpo inteiro + humores) | P1 | G | E3 |
| E19-3 | Tela Perfil com criador de avatar | P1 | G | E19-1, E19-2 |
| E19-4 | Card do pet no Dashboard com indicadores calculados de dados reais | P1 | M | E19-2, E15-1 |
| E19-5 | Cerejas e XP do pet (`PetState`, eventos ao concluir tarefa) | P1 | M | E19-4, E6-1 |
| E19-6 | Itens desbloqueáveis por nível | P2 | G | E19-5, Q25 |

**Critérios de aceite:** ver [03-especificacao-telas.md §9](03-especificacao-telas.md#9-perfil-avatar-e-pet-d-24).
