# 02 — Arquitetura de Informação

> Status: rascunho para revisão · Fase 0 · 10/11/2026

## 1. Estrutura de navegação **[PROPOSTA]**

```
┌──────────────────────┐
│  ◆ Annalu Studio OS  │   ← marca (monograma + nome)
├──────────────────────┤
│  Início              │   /
│  Projetos            │   /projetos
│  Tarefas             │   /tarefas
│  Calendário          │   /calendario
│  Notas          (3)  │   /notas            ← contador = notas na Inbox
│  Idea Lab            │   /ideias
│  Arquivos            │   /arquivos
│  Clientes            │   /clientes
│  Relatórios          │   /relatorios
├──────────────────────┤
│  Projetos fixados    │   ← até 5 atalhos fixados pela owner
│   · Projeto A        │
│   · Projeto B        │
├──────────────────────┤
│  Configurações       │   /configuracoes
│  [avatar] Annalu  ▾  │   ← menu: perfil, tema, sair
└──────────────────────┘
```

**Barra superior (global):**
`[☰ recolher]  [breadcrumb]  ·······  [🔍 Buscar…  Ctrl K]  [+ Capturar]  [🔔 Lembretes]`

Racional:
- Ordem segue frequência de uso: visão do dia → trabalho estruturado → tempo → conhecimento → acervo → relacionamento → análise.
- "Tarefas" global existe porque a owner precisa ver tarefas de todos os projetos juntas; a aba de tarefas do projeto continua sendo a visão principal dentro do projeto.
- Notas é um único módulo com três abas (Inbox, Projetos, Ideias) para não fragmentar a navegação.
- Projetos fixados dão acesso de um clique aos projetos em foco sem poluir a navegação principal.

## 2. Mapa de rotas **[PROPOSTA]**

Rotas da interface em pt-BR (texto voltado à usuária); identificadores de código em inglês.

| Rota | Tela | Observações |
|---|---|---|
| `/entrar` | Login | Pública |
| `/entrar/2fa` | Verificação TOTP | Pública, requer etapa 1 |
| `/configuracao-inicial` | Setup do primeiro acesso | Só disponível se não houver usuário |
| `/` | Dashboard | |
| `/projetos` | Lista de projetos | Filtros na query string (`?categoria=cliente&status=em-andamento`) |
| `/projetos/novo` | Criar projeto | Página dedicada (formulário longo) |
| `/projetos/[slug]` | Projeto — Visão geral | |
| `/projetos/[slug]/escopo` | Escopo | `?revisao=12` para ver revisão |
| `/projetos/[slug]/escopo/historico` | Histórico/comparação de revisões | |
| `/projetos/[slug]/tarefas` | Tarefas do projeto | `?visao=kanban\|lista` |
| `/projetos/[slug]/marcos` | Marcos | |
| `/projetos/[slug]/notas` | Notas do projeto | |
| `/projetos/[slug]/arquivos` | Arquivos do projeto | |
| `/projetos/[slug]/atividade` | Linha do tempo de atividade | |
| `/projetos/[slug]/github` | Atividade GitHub | Fase 1.1 |
| `/projetos/[slug]/configuracoes` | Dados do projeto, arquivar, excluir | |
| `/tarefas` | Todas as tarefas | `?visao=`, filtros por projeto/status/prazo |
| `/tarefas/[id]` | Detalhe da tarefa (página) | Também abre como painel lateral sobre a lista |
| `/calendario` | Calendário | `?visao=mes\|semana\|agenda&data=2026-11-10` |
| `/notas` | Notas — Inbox | |
| `/notas/projetos` | Notas de todos os projetos | |
| `/notas/ideias` | Notas de ideias | |
| `/notas/[id]` | Editor de nota | |
| `/ideias` | Idea Lab | |
| `/ideias/[id]` | Detalhe da ideia | |
| `/arquivos` | Biblioteca de arquivos | Filtros na query string |
| `/arquivos/[id]` | Detalhe/pré-visualização do arquivo | Também como painel lateral |
| `/clientes` | Lista de clientes | |
| `/clientes/[id]` | Detalhe do cliente | |
| `/relatorios` | Relatórios | `?periodo=30d` |
| `/lixeira` | Itens excluídos | Acessível por Configurações |
| `/configuracoes/perfil` | Nome, avatar, fuso, idioma | |
| `/configuracoes/seguranca` | Senha, 2FA, sessões ativas | |
| `/configuracoes/aparencia` | Tema claro/escuro/sistema, densidade | |
| `/configuracoes/workspace` | Nome do workspace, tags, categorias | |
| `/configuracoes/integracoes` | GitHub (Fase 1.1) | |
| `/configuracoes/dados` | Exportação de dados, lixeira | |

**Padrão de detalhe:** tarefas e arquivos abrem em **painel lateral** sobre a lista (mantém o contexto, evita modais) e têm URL própria para link direto. Projetos, notas e ideias abrem em página inteira (conteúdo extenso).

## 3. Módulos e responsabilidades

| Módulo | Responsabilidade | Entidades principais |
|---|---|---|
| Identidade | Login, 2FA, sessões | User, Session, RecoveryCode |
| Workspace | Isolamento de dados, associação, papéis (só OWNER no MVP) | Workspace, WorkspaceMember |
| Projetos | Ciclo de vida do projeto, categorias, capa/logo, progresso | Project |
| Escopo | Escopo estruturado e revisões | ProjectScope, ScopeItem, ScopeRevision |
| Tarefas | Tarefas, subtarefas, checklists, ordenação | Task, ChecklistItem |
| Marcos | Marcos e entregas | Milestone |
| Calendário | Projeção de prazos + eventos próprios + lembretes | CalendarEvent, Reminder |
| Notas | Notas de projeto, Inbox, notas de ideia, versões | Note, NoteRevision |
| Idea Lab | Ideias, referências, conversão | Idea, IdeaReference |
| Arquivos | Upload, versões, vínculos, coleções | File, FileVersion, FileAttachment, FileCollection |
| Clientes | Clientes e contatos | Client, ClientContact |
| Tags | Tags compartilhadas por todos os módulos | Tag (+ tabelas de junção) |
| Atividade | Linha do tempo do produto | ActivityEvent |
| Auditoria | Eventos de segurança | AuditLog |
| Busca | Busca global unificada | (índices FULLTEXT) |
| Dashboard / Relatórios | Agregações somente leitura | (consultas) |
| GitHub (1.1) | Instalação, repositórios, sincronização | GithubInstallation, GithubRepository, … |

## 4. Relações entre entidades (visão conceitual)

```
Workspace ─┬─< WorkspaceMember >── User
           │
           ├─< Client ─< ClientContact
           │     │
           │     └──< Project (categoria Cliente)
           │
           ├─< Project ─┬── ProjectScope ─< ScopeItem
           │            │        └─< ScopeRevision
           │            ├─< Milestone ─< Task (opcional)
           │            ├─< Task ─┬─< Task (subtarefas, 1 nível)
           │            │         └─< ChecklistItem
           │            ├─< Note
           │            ├─< FileAttachment >── File ─< FileVersion
           │            ├─< ActivityEvent
           │            └─< ProjectRepository >── GithubRepository (1.1)
           │
           ├─< Idea ─┬─< IdeaReference
           │         ├─< Note
           │         ├─< FileAttachment
           │         └── Project (sourceIdeaId, 0..1, após conversão)
           │
           ├─< Note (Inbox: sem projeto e sem ideia)
           ├─< CalendarEvent ─< Reminder
           ├─< Tag >─< (Project, Task, Note, Idea, File, Client)
           └─< GithubInstallation ─< GithubRepository ─< Commit/PR/Issue/Release (1.1)
```

Legenda: `─<` um-para-muitos · `>─<` muitos-para-muitos.

## 5. Como a informação se conecta (sem duplicação)

| Informação | Fonte única | Onde aparece |
|---|---|---|
| Vencimento de tarefa | `Task.dueDate` | Tarefas, Kanban, Calendário, Dashboard (Hoje/Atrasadas/Próximos prazos), Relatórios |
| Data-alvo do marco | `Milestone.dueDate` | Marcos, Calendário, Visão geral do projeto |
| Entrega do projeto | `Project.targetDate` | Projetos, Calendário, Dashboard |
| Progresso | Calculado de `Task` | Card do projeto, Visão geral, Dashboard, Relatórios |
| Arquivo | `File` + `FileVersion` | Biblioteca, aba Arquivos do projeto/ideia, anexos de nota/tarefa, capa/logo |
| Nota de ideia convertida | `Note` (mesma linha, novo vínculo) | Ideia (somente leitura) e projeto |
| Atividade | `ActivityEvent` | Aba Atividade, Dashboard, detalhe da tarefa |
| Dados GitHub | Tabelas `Github*` (espelho do GitHub) | Aba GitHub, Dashboard, chip de issue na tarefa |

## 6. Ações globais

| Ação | Atalho **[PROPOSTA]** | Disponível em |
|---|---|---|
| Busca / paleta de comandos | `Ctrl/⌘ K` | Todas as telas autenticadas |
| Captura rápida | `Ctrl/⌘ Shift N` (a validar conflitos com navegadores) | Todas as telas |
| Nova tarefa no contexto atual | `T` (fora de campos de texto) | Listas de tarefas |
| Alternar Kanban/Lista | `V` | Telas de tarefas |
| Ir para… | `G` depois `I` (Início), `P` (Projetos), `C` (Calendário), `N` (Notas) | Todas |
| Ajuda de atalhos | `?` | Todas |

Atalhos de uma tecla nunca disparam com foco em campos de texto, e todos têm alternativa visível na interface.
