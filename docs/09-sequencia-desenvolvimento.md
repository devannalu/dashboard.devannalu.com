# 09 — Sequência de Desenvolvimento

> Status: rascunho para revisão · Fase 0 · 10/11/2026

## Princípios da sequência

1. **Fundações que todo mundo usa vêm primeiro:** autorização por workspace, design tokens, editor rich text, fila de jobs e storage. Mudar essas peças depois força retrabalho em todos os módulos.
2. **Dados antes de agregações:** o Dashboard e os relatórios só são construídos depois que as entidades que eles resumem existem e estão testadas. Antes disso, a tela inicial mostra apenas um estado vazio honesto.
3. **Marcos utilizáveis:** a partir do M3, cada marco entrega algo que a owner já pode usar no dia a dia (feedback real cedo).
4. **Aprovação visual antes de telas grandes:** a direção visual é validada uma vez (E3-8) antes de construir as telas principais.
5. **Segurança contínua, não no final:** os testes de autorização entram com cada módulo; a revisão pré-lançamento só confirma.

## Marcos

| Marco | Conteúdo | Épicos | Resultado utilizável | Duração indicativa* |
|---|---|---|---|---|
| **M0 — Aprovação do planejamento** | Revisão destes documentos, respostas às questões abertas | — | Decisões registradas | 1 semana |
| **M1 — Fundação** | Monorepo, CI, Docker, Prisma, base Nest/Next, fila de jobs, tokens e primitivos de UI | E0, E3-1…E3-4, E3-7 | Ambiente de desenvolvimento completo | 2 semanas |
| **M2 — Identidade e casca** | Setup, login, 2FA, sessões, workspace e guards, layout autenticado, **aprovação visual (E3-8)** | E1, E2, E3-5, E3-8 | Entrar no sistema com segurança | 1,5 semana |
| **M3 — Projetos e clientes** | Clientes, tags, projetos (lista, criação, detalhe), atividade base, escopo | E12-1, E4, E14-1, E5 | Cadastrar todos os projetos reais e seus escopos | 3 semanas |
| **M4 — Execução** | Editor Tiptap (base compartilhada), tarefas, Kanban, lista, subtarefas, checklists, marcos, tela global de tarefas | E9-2, E6, E7 | Gerenciar o trabalho diário no sistema | 3 semanas |
| **M5 — Tempo** | Calendário (3 visões), eventos, fuso, lembretes | E8 | Planejar a semana no sistema | 2 semanas |
| **M6 — Conhecimento** | Notas, salvamento seguro, conflitos, captura rápida, Inbox, Idea Lab (sem conversão) | E9, E10-1…E10-3 | Substituir app de notas/ideias | 2,5 semanas |
| **M7 — Arquivos** | Storage, upload seguro, biblioteca, versões, vínculos, capa/logo, miniaturas | E11 | Centralizar arquivos dos projetos | 2,5 semanas |
| **M8 — Conexões** | Conversão ideia → projeto, anexos no editor, busca global | E10-4, E9-9, E13 | Encontrar qualquer coisa; promover ideias | 1,5 semana |
| **M9 — Visão geral** | Dashboard, relatórios básicos, atividade por projeto | E15, E16, E14-2 | Centro de comando completo | 2 semanas |
| **M10 — Lançamento interno** | Produção, backups, monitoramento, exportação, lixeira, revisão de segurança e acessibilidade | E17 | **MVP em produção** | 2 semanas |
| **M11 — GitHub (Fase 1.1)** | GitHub App, instalação, sincronização, webhooks, aba GitHub, vínculo issue↔tarefa | E18 | Atividade de código conectada | 3 semanas |

\* Durações para uma pessoa desenvolvendo com apoio do agente, em ritmo sustentável. São estimativas de ordem de grandeza para planejamento, não prazos comprometidos. Total até o MVP: ~23 semanas; até a Fase 1.1: ~26 semanas.

## Justificativas de ordem (decisões que evitam retrabalho)

| Decisão | Por quê |
|---|---|
| Workspace e guards (M2) antes de qualquer módulo | Adicionar escopo por workspace depois exigiria reescrever todas as consultas e testes |
| Clientes antes de projetos (M3) | Projetos de cliente exigem o vínculo desde a criação |
| Escopo junto com projetos (M3) | É o primeiro documento formal; valida o padrão de revisões imutáveis que as notas reaproveitam |
| Editor Tiptap no início do M4 | Usado por tarefas, escopo, notas e ideias; construí-lo uma vez evita três editores diferentes. O escopo do M3 usa texto simples temporariamente se o editor não estiver pronto **ou** o editor é antecipado — decidir no início do M3 |
| Calendário depois de tarefas e marcos (M5) | É projeção dessas entidades; não faz sentido construí-lo com dados falsos |
| Arquivos (M7) antes da conversão de ideias (M8) | A conversão precisa revincular arquivos |
| Busca (M8) depois de todos os módulos de conteúdo | Um único endpoint unificado, construído uma vez |
| Dashboard por último no MVP (M9) | Agrega tudo; construir antes geraria dados fictícios ou retrabalho a cada novo módulo |
| Produção (M10) depois das funcionalidades, mas **infra de deploy pode começar em paralelo a partir do M3** | Permite usar o sistema em produção mais cedo se a owner preferir (ver abaixo) |
| GitHub depois do MVP (M11) | **[DIRETRIZ]** Fase 1.1; depende de projetos, tarefas e fila de jobs estáveis |

## Opção: uso real antecipado **[PROPOSTA]**

Em vez de esperar o M10, colocar o sistema em produção ao final do **M4** (com E17-1…E17-5 antecipados), já com backups ativos. Vantagem: feedback real de uso semanas antes. Custo: cerca de 1 semana a mais de esforço no M4 e cuidado com migrações compatíveis desde cedo. → Q15.

## Portões de qualidade por marco

Um marco só é considerado concluído quando:
- [ ] Critérios de aceite das histórias P0 do marco verificados.
- [ ] CI verde (lint, tipos, testes unitários/integração/E2E do marco, gitleaks, audit).
- [ ] Testes de autorização cruzada cobrindo os novos endpoints.
- [ ] Documentação atualizada (modelo de dados, decisões, módulos).
- [ ] Relatório de entrega em pt-BR: o que foi feito, arquivos, mudanças no banco, testes executados com resultado real, segurança, limitações, próximo passo.

## Próximos passos imediatos

1. **Owner:** revisar os documentos e responder às questões abertas prioritárias (Q1–Q6, Q8, Q9).
2. **Agente:** com as respostas, produzir a **direção visual em alta fidelidade** do Dashboard e do Detalhe do Projeto (protótipo HTML com os tokens reais) para aprovação.
3. **Agente:** iniciar o M1 (fundação técnica) — pode começar em paralelo à aprovação visual, pois não depende dela.
