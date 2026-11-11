# Annalu Studio OS — Instruções para o agente

Centro de comando digital da **Dev Annalu** (gestão de projetos, escopo, tarefas, calendário, notas, ideias, arquivos, clientes e GitHub). Usuária única no MVP, com arquitetura pronta para workspaces.

## Regras obrigatórias
- **Idioma:** toda comunicação, documentação, comentários de código, textos de interface e relatórios em **pt-BR**. Identificadores de código, bibliotecas e APIs no original (inglês). Datas `dd/mm/aaaa`; moeda BRL.
- **Fonte da verdade é `docs/`.** Leia o documento do módulo antes de implementar. Atualize-o no mesmo PR quando algo mudar. Decisões importantes vão para `docs/decisoes/registro-de-decisoes.md`.
- **Não inventar aprovações.** Itens marcados [PROPOSTA] não estão aprovados. Use os rótulos [DIRETRIZ] / [PROPOSTA] / [PREMISSA] / [QUESTÃO ABERTA] / [FUTURO].
- **Nunca dados fictícios apresentados como reais**; seed só em desenvolvimento.
- **Commits do GitHub nunca determinam progresso** de projeto.
- **Toda consulta de negócio filtra por `workspaceId`**; recurso de outro workspace → 404. Nenhum usuário/workspace fixo no código.
- **Regras de negócio no backend (NestJS).** O Next.js não acessa o banco.
- **Design:** usar somente tokens (Cherry Atelier, `docs/04-design-system.md`); sem cores cruas, sem excesso de rosa, gradientes ou modais.
- Nunca afirmar que testes passaram sem executá-los; nunca afirmar que uma integração funciona sem validá-la.
- Nada destrutivo em dados/banco de produção sem autorização explícita. Telas novas significativas precisam de aprovação visual antes da implementação.

## Relatório ao final de cada entrega (pt-BR)
1. O que foi implementado · 2. Arquivos e módulos alterados · 3. Mudanças no banco · 4. Testes executados e resultado real · 5. Considerações de segurança · 6. Limitações conhecidas · 7. Próximo passo sugerido.

## Estado atual (11/11/2026)
- Fase 0 documentada; protótipo visual aprovado em partes (`design/dashboard-colagem.html` + `design/app.js`).
- **M1 — Fundação:** épico E0 concluído (monorepo, API base, web com tokens, Prisma 7 com migração inicial, fila de jobs + worker, Docker Compose com MySQL na porta 3307, CI). Branch `feat/m1-fundacao`.
- E3-2/E3-3 entregues (componentes em `apps/web/src/components/ui`, layout em `components/shell`, catálogo em `/design` só em dev).
- Produção: Coolify na VPS da owner — `annalustudio.devannalu.com` (web), `studio-api` (alias interno), MySQL privado. Arquivos: Garage `studio-files` (guia em `docs/infra/armazenamento.md`).
- Testes: `pnpm turbo run build typecheck test lint` (sem banco) e `pnpm --filter @studio/api test:int` (MySQL real, banco `studio_test`).
- **MVP funcional (branch `feat/m2-autenticacao`, D-33/D-34/D-35):** login e primeiro acesso; todas as seções (Início, Projetos, Tarefas, Calendário, Notas, Idea Lab, Arquivos, Clientes, Relatórios, busca, captura rápida). Sem bloqueio de login (D-34). Toda rota exige sessão salvo `@Public()`; recursos novos via `crudController` em `apps/api/src/modules/` (sempre `WorkspaceScope`); testes de novo módulo usam `createTwoWorkspaces()`. Web: `useSession().ws(path)`, `useList`/`useData`, componentes em `components/app/`.
- Pet 3D no Blender pausado (D-28).

## Ferramentas e versões (ver D-29)
Next.js 16 e NestJS 12 são mais novos que o conhecimento padrão: **leia `apps/web/node_modules/next/dist/docs/` e `apps/api/AGENTS.md` antes de usar APIs**. NestJS é ESM (imports relativos terminam em `.js`). Prisma 7 gera o cliente em `apps/api/src/generated/` (fora do Git). Comandos: `pnpm turbo run build typecheck test lint`.
