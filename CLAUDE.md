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

## Estado atual (10/11/2026)
- Fase 0 documentada; protótipo visual aprovado em partes (`design/dashboard-colagem.html` + `design/app.js`).
- **M1 — Fundação em andamento:** monorepo pnpm + Turborepo (`apps/web`, `apps/api`, `packages/contracts`), API com config validada, erros problem+json, logs seguros e health check; web com tokens do design system; Prisma 7 com schema inicial; Docker Compose; CI.
- Pendente no M1: primeira migração e fila de jobs (exigem Docker Desktop ligado), primitivos de UI (E3-2).
- Pet 3D no Blender pausado (D-28).

## Ferramentas e versões (ver D-29)
Next.js 16 e NestJS 12 são mais novos que o conhecimento padrão: **leia `apps/web/node_modules/next/dist/docs/` e `apps/api/AGENTS.md` antes de usar APIs**. NestJS é ESM (imports relativos terminam em `.js`). Prisma 7 gera o cliente em `apps/api/src/generated/` (fora do Git). Comandos: `pnpm turbo run build typecheck test lint`.
