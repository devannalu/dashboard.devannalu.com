# Annalu Studio OS — Documentação do Produto

> Fase atual: **Fase 1 — M1 Fundação técnica (em andamento)**
> Última atualização: 10/11/2026
> Status geral: documentação da Fase 0 em revisão contínua; código da fundação em `apps/` e `packages/`.

Esta pasta é a fonte de verdade do produto. Decisões, escopo e arquitetura vivem aqui, não no histórico de conversas.

## Índice

| # | Documento | Conteúdo |
|---|---|---|
| 01 | [Visão do Produto & PRD](01-visao-produto-prd.md) | Problema, usuários, objetivos, requisitos funcionais e não funcionais, métricas de sucesso |
| 02 | [Arquitetura de Informação](02-arquitetura-informacao.md) | Navegação, rotas, módulos e relações entre entidades |
| 03 | [Especificação de Telas](03-especificacao-telas.md) | Dashboard, Projetos, Detalhe do Projeto, Notas, Idea Lab, Arquivos, Calendário, Configurações |
| 04 | [Design System](04-design-system.md) | Tokens, cores, tipografia, espaçamento, componentes, estados, temas, responsividade |
| 05 | [Arquitetura Técnica](05-arquitetura-tecnica.md) | Frontend, backend, banco, storage, autenticação, jobs, deploy, segurança |
| 06 | [Modelo de Dados Inicial](06-modelo-dados.md) | Entidades, campos, relações, restrições e integridade |
| 07 | [Integração GitHub](07-integracao-github.md) | GitHub App, permissões, vínculo de repositórios, sincronização, webhooks |
| 08 | [Backlog do MVP](08-backlog-mvp.md) | Épicos, histórias, prioridades, dependências e critérios de aceite |
| 09 | [Sequência de Desenvolvimento](09-sequencia-desenvolvimento.md) | Ordem de implementação para reduzir retrabalho |
| — | [Registro de Decisões](decisoes/registro-de-decisoes.md) | Log de decisões (diretrizes, propostas, premissas, questões abertas) |

## Legenda de status (usada em todos os documentos)

Para não inventar aprovações, toda decisão relevante é marcada com um destes rótulos:

| Rótulo | Significado |
|---|---|
| **[DIRETRIZ]** | Definido explicitamente pelo owner no Master Prompt. Tratado como aprovado. |
| **[PROPOSTA]** | Recomendação do agente. **Aguarda aprovação** do owner. |
| **[PREMISSA]** | Suposição adotada para avançar o planejamento. Deve ser confirmada. |
| **[QUESTÃO ABERTA]** | Decisão que depende do owner. Listada no registro de decisões. |
| **[FUTURO]** | Fora do MVP. Documentado para não ser bloqueado pela arquitetura. |

## Como manter esta documentação

- Toda mudança de escopo, arquitetura ou modelo de dados atualiza o documento correspondente **no mesmo PR** do código.
- Decisões arquiteturais importantes geram uma entrada em [decisoes/registro-de-decisoes.md](decisoes/registro-de-decisoes.md) (formato ADR resumido).
- Quando uma **[PROPOSTA]** for aprovada, o rótulo muda para **[APROVADO em dd/mm/aaaa]**.
