# 03 — Especificação de Telas

> Status: rascunho para revisão · Fase 0 · 10/11/2026
> Todas as estruturas abaixo são **[PROPOSTA]** e precisam de aprovação visual antes da implementação (regra de aprovação do Master Prompt, §14). Os wireframes em texto indicam hierarquia e disposição, não estética final.

Convenções comuns a todas as telas:
- **Carregando:** skeletons com a forma do conteúdo final (nunca spinner de página inteira após o primeiro carregamento).
- **Erro:** mensagem em linguagem simples, ação "Tentar novamente" e, quando útil, código de suporte (`requestId`). Erros não apagam o que a usuária digitou.
- **Vazio:** explica o que a seção mostra, por que está vazia e oferece a ação principal.
- **Feedback de ação:** toasts discretos para ações concluídas, com "Desfazer" quando reversível (concluir tarefa, arquivar, excluir).
- **Datas:** `10/11/2026`; relativas quando mais claras ("hoje", "amanhã", "há 2 dias"), sempre com data absoluta no tooltip.

---

## 1. Dashboard

**Objetivo da usuária:** em menos de 10 segundos, saber o que exige atenção hoje e o estado geral do trabalho.

### Estrutura (desktop ≥ 1280 px)

```
┌───────────────────────────────────────────────────────────────────────────┐
│ Boa tarde, Annalu.                               terça-feira, 10/11/2026  │  ← Cormorant, grande
│ 4 tarefas para hoje · 2 atrasadas · próxima entrega em 3 dias             │  ← resumo em uma linha
├───────────────────────────────────────────────┬───────────────────────────┤
│ HOJE                                          │ AGENDA (próximos 7 dias)  │
│ ☐ Ajustar layout do checkout   Cliente X  ⚑A │ Hoje  14:00 Reunião Y     │
│ ☐ Revisar PR de autenticação   Studio OS  ⚑M │ Qua   Entrega: Site Z     │
│ ATRASADAS (2)                                 │ Sex   Marco: Beta         │
│ ☐ Enviar proposta…  venceu há 2 dias          │ [Abrir calendário →]      │
├───────────────────────────────────────────────┼───────────────────────────┤
│ PROJETOS ATIVOS                     [Ver todos]│ CAPTURA RÁPIDA            │
│ ┌────────┐ ┌────────┐ ┌────────┐               │ [Escreva algo…         ]  │
│ │Capa    │ │Capa    │ │Capa    │               │ Inbox: 3 notas  [Abrir →] │
│ │Nome    │ │Nome    │ │Nome    │               ├───────────────────────────┤
│ │▓▓▓░ 62%│ │Sem tar.│ │▓░░ 20% │               │ INDICADORES (7 dias)      │
│ └────────┘ └────────┘ └────────┘               │ 12 concluídas (+3)        │
├───────────────────────────────────────────────┤ 86% no prazo (30 dias)    │
│ ATIVIDADE RECENTE                              │ 2 atrasadas               │
│ · Tarefa concluída em Studio OS — há 1 h       ├───────────────────────────┤
│ · Escopo revisado em Site Z (rev. 4) — ontem   │ GITHUB (Fase 1.1)         │
│                                                │ · PR #42 mesclado — 2 h   │
└───────────────────────────────────────────────┴───────────────────────────┘
```

### Informações e cálculos

| Bloco | Conteúdo | Regra de cálculo |
|---|---|---|
| Saudação | "Bom dia/Boa tarde/Boa noite, {primeiro nome}." | Hora local no fuso da usuária: 05–12 h, 12–18 h, 18–05 h |
| Resumo | Contagens em linguagem natural | Mesmas regras dos blocos abaixo |
| Hoje | Tarefas não concluídas com vencimento hoje | `dueDate = hoje` (fuso da usuária), status ≠ Concluída, não arquivada/excluída. Ordem: prioridade desc., hora asc. |
| Atrasadas | Tarefas vencidas não concluídas | `dueDate < hoje`, status ≠ Concluída. Ordem: mais antiga primeiro. Máx. 5 + "Ver todas (n)" |
| Agenda | Próximos 7 dias | Projeção do calendário: tarefas com hora, eventos, marcos, entregas. Máx. 6 itens |
| Projetos ativos | Cards com capa, nome, categoria, progresso, próximo prazo | Status ∈ {Planejamento, Em andamento}. Ordem: fixados primeiro, depois `updatedAt` desc. Máx. 6. Projetos `EMPLOYER` com "ocultar do Dashboard" não aparecem |
| Atualizados recentemente | Incorporado à ordenação dos projetos ativos e à atividade recente (evita repetição) | — |
| Captura rápida | Campo inline + contador da Inbox | Notas sem projeto e sem ideia, não arquivadas |
| Indicadores | Concluídas em 7 dias (variação vs. 7 dias anteriores); % no prazo; atrasadas | **Concluídas:** tarefas com `completedAt` nos últimos 7 dias. **No prazo (30 dias):** entre tarefas concluídas nos últimos 30 dias *que tinham vencimento*, % com `completedAt ≤ fim do dia de dueDate`. Se < 5 tarefas na amostra, mostrar "Dados insuficientes" |
| Atividade recente | Últimos 8 eventos relevantes | `ActivityEvent` filtrado (exclui eventos triviais como "renomeou") |
| GitHub | Últimos 5 eventos dos repositórios vinculados | Fase 1.1. Seção oculta se não houver integração |

### Interações
- Marcar tarefa como concluída no próprio Dashboard (checkbox) → toast com "Desfazer".
- Clicar em tarefa → painel lateral de detalhe.
- Captura rápida inline: `Enter` salva, campo limpa, contador atualiza.
- Nenhum bloco é configurável no MVP (YAGNI); a ordem é fixa e pensada. **[PROPOSTA]**

### Estados vazios
- **Primeiro acesso (sem nada):** bloco único de boas-vindas com 3 ações: "Criar primeiro projeto", "Capturar uma ideia", "Registrar uma nota". Sem cards vazios espalhados.
- **Hoje vazio:** "Nada vence hoje. Que tal adiantar algo da semana?" + link para próximos prazos.
- **Indicadores sem dados:** "Os indicadores aparecem depois das primeiras tarefas concluídas."

### Responsivo
- `< 1024 px`: coluna única, ordem: Resumo → Hoje/Atrasadas → Agenda → Captura → Projetos → Indicadores → Atividade.

### Critérios de aceite
- [ ] Todos os números conferem com consultas diretas ao banco em testes de integração com dados de fixture.
- [ ] Mudar o vencimento de uma tarefa para hoje faz ela aparecer em "Hoje" sem recarregar a página (invalidação de cache).
- [ ] Nenhum dado fictício ou de exemplo aparece para um workspace vazio.
- [ ] Dashboard carrega em < 1,5 s com 500 projetos e 20.000 tarefas (teste de carga).

---

## 2. Projetos (lista)

**Objetivo:** encontrar e comparar projetos rapidamente, mesmo com centenas deles.

### Estrutura

```
Projetos                                                    [+ Novo projeto]
[Todos 42] [Pessoal 8] [Produto Próprio 5] [Cliente 21] [Trabalho 8]   ← abas por categoria
Status: [Ativos ▾]  Prioridade: [Todas ▾]  Cliente: [▾]  Tags: [▾]  🔍 [Filtrar…]   [▦ Grade | ☰ Tabela]

Grade:   cards com capa (16:9), logo sobreposto, nome, cliente, status, progresso, próximo prazo
Tabela:  Nome · Categoria · Cliente · Status · Prioridade · Progresso · Entrega · Atualizado
```

### Detalhes
- Filtro padrão: **Ativos** (Planejamento + Em andamento). Arquivados só aparecem com filtro explícito.
- Visão Tabela recomendada a partir de muitos projetos; ordenação por qualquer coluna; preferência de visão lembrada por usuária.
- Filtros refletidos na URL (link compartilhável e botão Voltar funcionam).
- Paginação por cursor na tabela (50 por página); grade com carregamento incremental.
- Ações em massa na tabela: alterar status, arquivar, adicionar tag. **[PROPOSTA — P2]**

### Criar projeto (`/projetos/novo`)
- Campos obrigatórios: **nome** e **categoria**. Todo o resto opcional e editável depois.
- Categoria Cliente → campo Cliente obrigatório, com "Criar cliente" inline.
- Categoria Trabalho Profissional → exibe aviso de confidencialidade e opção "Ocultar do Dashboard e relatórios".
- Slug gerado do nome, editável, único no workspace.
- Após criar → vai para Visão geral do projeto com estado vazio guiado.

### Estados vazios
- Sem projetos: ilustração discreta (linha fina de cereja) + "Seus projetos vão morar aqui." + [Criar projeto] + [Começar pelo Idea Lab].
- Filtro sem resultados: "Nenhum projeto com esses filtros." + [Limpar filtros].

### Critérios de aceite
- [ ] Filtros combinados retornam resultado correto e persistem na URL.
- [ ] Projetos de outro workspace nunca aparecem (teste de autorização).
- [ ] Tabela permanece fluida com 500 projetos.

---

## 3. Detalhe do Projeto

**Objetivo:** espaço de trabalho completo e independente para cada projeto.

### Cabeçalho (comum a todas as abas)

```
┌───────────────────────────────────────────────────────────────────────┐
│ [capa — faixa baixa 160 px, opcional]                                  │
│ [logo]  Nome do Projeto                         [Em andamento ▾] [⋯]  │
│         Cliente X · Cliente · Prioridade Alta · Entrega 15/12/2026     │
│         ▓▓▓▓▓▓░░░░ 62% (18 de 29 tarefas)                              │
├───────────────────────────────────────────────────────────────────────┤
│ Visão geral · Escopo · Tarefas · Marcos · Notas · Arquivos · Atividade │
└───────────────────────────────────────────────────────────────────────┘
```

- Status alterável direto no cabeçalho (dropdown).
- Menu `⋯`: Editar dados, Fixar na barra lateral, Arquivar, Excluir.
- Sem capa definida: cabeçalho compacto sem faixa (nunca imagem genérica).

### Aba Visão geral
- **Coluna principal:** objetivo e descrição; próximos prazos do projeto (tarefas + marcos, 14 dias); marcos com barra de progresso; notas fixadas.
- **Coluna lateral:** dados do projeto (categoria, subtipo, datas, cliente, tags, repositório na 1.1); arquivos fixados; atividade recente (5 eventos).
- Estado vazio guiado (projeto recém-criado): checklist de primeiros passos — "Definir escopo", "Criar primeiras tarefas", "Adicionar capa", que some quando concluído ou dispensado.

### Aba Escopo
- Documento estruturado por seções; cada seção editável in-place.
- Seções de texto (Problema, Objetivos, Descrição, Considerações técnicas): rich text.
- Seções de lista (Entregáveis, RF, RNF, Restrições, Premissas, Fora do escopo, Critérios de aceite): itens com código automático (`ENT-001`, `RF-001`, `RNF-001`…), reordenáveis.
- Índice lateral fixo com as seções e contagem de itens.
- Cabeçalho da aba: "Revisão 7 · editada em 08/11/2026 por Annalu" + [Histórico].
- Salvamento: botão **"Salvar alterações"** com campo opcional "Resumo da mudança" (escopo é documento formal; salvar explicitamente gera revisões significativas). Rascunho local protegido contra perda; aviso ao sair com alterações não salvas. **[PROPOSTA — ver Q8]**
- Histórico: lista de revisões; comparação lado a lado entre quaisquer duas (adições em verde suave, remoções riscadas); "Restaurar esta revisão" cria uma nova revisão (nunca apaga histórico).

### Aba Tarefas
- Alternância **Kanban | Lista** (preferência lembrada por projeto).
- **Kanban:** colunas = 5 status; cards com título, prioridade (ícone + texto acessível), vencimento, tags (máx. 2 + "+n"), contagem de subtarefas/checklist, ícone de anexos; arrastar entre colunas e reordenar; "+ Adicionar" no topo de cada coluna cria inline. Concluída mostra só os últimos 14 dias + "Ver todas".
- **Lista:** agrupável por status, marco ou prioridade; colunas configuráveis; edição inline de status, prioridade e data.
- Filtros: marco, prioridade, tag, vencimento (atrasadas, hoje, esta semana, sem data).
- **Painel de detalhe da tarefa** (lateral, 480 px): título editável, status, prioridade, vencimento (data + hora opcional), marco, tags, descrição rich text, subtarefas, checklist, anexos, issues vinculadas (1.1), atividade. Salvamento automático por campo com controle de versão.

### Aba Marcos
- Linha do tempo vertical ordenada por data; cada marco com data-alvo, progresso calculado, contagem de tarefas, flag "Entrega".
- Marcar marco como concluído é ação manual; sugerido quando todas as tarefas do marco são concluídas.

### Aba Notas
- Lista à esquerda (fixadas primeiro, depois por atualização), editor à direita. Mesmo editor do módulo Notas (ver §4).

### Aba Arquivos
- Mesmo componente da biblioteca (§6), pré-filtrado pelo projeto; upload por arrastar e soltar.

### Aba Atividade
- Linha do tempo agrupada por dia; filtros por tipo (tarefas, escopo, arquivos, notas, GitHub).

### Critérios de aceite
- [ ] Progresso exibido = fórmula do PRD §9, coberta por testes unitários (incluindo "Sem tarefas").
- [ ] Mover tarefa no Kanban persiste ordem e status; falha de rede reverte a posição e mostra erro.
- [ ] Kanban operável por teclado (selecionar card, mover entre colunas com atalhos), com anúncio para leitor de tela.
- [ ] Salvar escopo cria revisão; restaurar revisão cria nova revisão; nenhuma revisão é apagada.
- [ ] Edição concorrente (duas abas) de escopo ou tarefa gera aviso de conflito, sem sobrescrita silenciosa.

---

## 4. Notas

**Objetivo:** capturar e organizar conhecimento sem fricção e sem risco de perda.

### Estrutura

```
Notas                                                         [+ Nova nota]
[Inbox 3] [Projetos] [Ideias] [Arquivadas]        🔍 [Buscar nas notas…]  Tags [▾]
┌─────────────────────────┬─────────────────────────────────────────────────┐
│ Lista                    │ Editor                                          │
│ ▸ Ideia de onboarding    │ Título da nota                                  │
│   há 5 min · Inbox       │ Studio OS · #arquitetura      Salvo às 14:32 ✓ │
│ ▸ Reunião com cliente X  │ ─────────────────────────────────────────────── │
│   ontem · Site Z         │ [B I H1 H2 • 1. ☐ 🔗 ❝ </> 📎]                  │
│                          │ Conteúdo…                                       │
└─────────────────────────┴─────────────────────────────────────────────────┘
```

### Inbox — ações por nota (barra contextual + atalhos)
| Ação | Resultado |
|---|---|
| Atribuir a projeto | Define `projectId`; sai da Inbox |
| Converter em tarefa | Cria tarefa (título = título/primeira linha da nota; descrição = conteúdo); a nota é arquivada com link para a tarefa (sem duplicar conteúdo editável — a nota vira somente leitura com referência). **[PROPOSTA]** |
| Vincular a ideia | Define `ideaId`; sai da Inbox |
| Tags | Adiciona tags |
| Arquivar | Sai da Inbox, vai para Arquivadas |

### Editor **[PROPOSTA]**
- Tiptap (ProseMirror): parágrafo, H1–H3, negrito, itálico, sublinhado, tachado, listas, checklist, citação, código inline e em bloco, links, divisor, imagens e anexos (vinculados ao módulo Arquivos).
- Atalhos Markdown (`# `, `- `, `[] `, ` ``` `).
- **Salvamento:** automático 1,5 s após parar de digitar e ao sair do campo; indicador de status sempre visível.
- **Proteção contra perda:** cópia local (IndexedDB) do rascunho até o servidor confirmar; se o servidor recusar por conflito de versão, abre comparação "Sua versão × Versão salva" com opções "Manter a minha (salvar como nova versão)", "Manter a salva", "Salvar a minha como nova nota".
- **Versões:** snapshot no máximo a cada 10 minutos de edição e ao fechar a nota; painel "Histórico" permite visualizar e restaurar.
- Links colados: somente `http`, `https`, `mailto`.

### Estados vazios
- Inbox vazia: "Inbox zerada. Use Ctrl+Shift+N para capturar algo de qualquer lugar."

### Critérios de aceite
- [ ] Fechar a aba durante a digitação não perde o conteúdo (restaurado do rascunho local ao reabrir).
- [ ] Conflito entre duas abas é detectado e resolvido apenas por escolha explícita.
- [ ] Conteúdo com `<script>` ou `javascript:` não é executado em nenhuma visualização (teste de XSS).
- [ ] Busca encontra notas pelo texto do conteúdo, não só pelo título.

---

## 5. Idea Lab

**Objetivo:** cultivar ideias aos poucos, sem a burocracia de um projeto.

### Estrutura
```
Idea Lab                                                       [+ Nova ideia]
[Todas] [Semente] [Explorando] [Validando] [Em espera] [Descartadas] [Convertidas]
Visão: [▦ Mural | ☰ Lista]    Tags [▾]   🔍

Mural: cards com imagem de referência (se houver), título, resumo (3 linhas), tags, status, atualizado em
```

### Detalhe da ideia (`/ideias/[id]`)
- **Cabeçalho:** título editável, status, tags, datas de criação/atualização, ação principal **"Converter em projeto"**.
- **Seções progressivas** (todas opcionais, aparecem como convite quando vazias — "Qual problema isso resolve?"): Resumo · Problema · Público-alvo · Solução potencial.
- **Referências:** lista de links com título e prévia (título/domínio; sem buscar conteúdo de terceiros no servidor no MVP para evitar SSRF). **[PROPOSTA]**
- **Imagens e anexos:** galeria (módulo Arquivos).
- **Notas da ideia:** lista + editor compartilhado.
- **Ideia convertida:** faixa no topo "Convertida em projeto «Nome» em 10/11/2026 → Abrir projeto"; tudo em somente leitura.

### Fluxo de conversão
Ver PRD §8.3. Painel lateral com pré-visualização do que será levado ("3 notas, 5 arquivos, 4 referências serão vinculados ao novo projeto").

### Critérios de aceite
- [ ] Criar ideia exige apenas o título.
- [ ] Conversão é atômica (teste de falha simulada no meio da transação não deixa dados parciais).
- [ ] Após conversão: nenhum arquivo é duplicado no storage; notas aparecem no projeto e na ideia (somente leitura); segunda conversão é bloqueada.

---

## 6. Arquivos & Ativos

**Objetivo:** biblioteca única e segura de todos os arquivos, vinculados aos contextos onde são usados.

### Estrutura
```
Arquivos                                         [⬆ Enviar arquivos]
🔍 [Buscar por nome ou tag…]
Tipo [Imagens|PDFs|Documentos|Apresentações|Outros]  Contexto [Projeto ▾ | Ideia ▾]  Tags [▾]
[★ Importantes] [📌 Fixados]   Ordenar: [Recentes ▾]   Visão: [▦ Grade | ☰ Lista]

Grade: miniaturas (imagens) / ícone por tipo; nome; tamanho; contexto(s)
```

### Painel de detalhe do arquivo
- Pré-visualização: imagens (miniatura otimizada + abrir em tamanho real), PDF (visualizador embutido). Outros tipos: ícone + metadados + Download.
- Metadados: nome (editável), tipo, tamanho, dimensões (imagens), enviado em/por, versão atual.
- Vínculos: lista de projetos/ideias/notas/tarefas onde está anexado; adicionar/remover vínculo.
- Ações: Download, Substituir (nova versão), Marcar como importante, Fixar, Definir como capa / logo (quando em contexto de projeto e for imagem), Mover para coleção, Excluir.
- Versões: lista com data, tamanho, download de versão anterior, "Restaurar como atual" (cria nova versão).

### Upload
- Arrastar e soltar em qualquer área de arquivos ou no editor de notas; múltiplos arquivos; barra de progresso por arquivo; cancelar.
- Rejeição clara e específica: "Tipo de arquivo não permitido (.exe)", "Arquivo maior que 50 MB".

### Regras
- Excluir arquivo vinculado a vários contextos pergunta: "Remover só deste projeto" ou "Excluir arquivo (vai para a lixeira)". Desvincular nunca apaga o arquivo.
- Coleções: um nível de agrupamento por projeto (ex.: "Marca", "Referências"). Sem pastas aninhadas no MVP. **[PROPOSTA]**

### Critérios de aceite
- [ ] Arquivo com extensão `.png` mas conteúdo executável é rejeitado (validação por assinatura).
- [ ] URL de download expira (ex.: 5 min) e não funciona sem sessão válida para gerar nova.
- [ ] SVG e HTML nunca são renderizados inline no domínio da aplicação.
- [ ] Substituir arquivo preserva todas as versões anteriores e baixáveis.

---

## 7. Calendário

**Objetivo:** visão temporal única de tudo que tem data, sem eventos duplicados.

### Estrutura
```
Calendário        [‹ Hoje ›]  Novembro de 2026          [Mês | Semana | Agenda]  [+ Evento]
Mostrar: [✓ Tarefas] [✓ Marcos] [✓ Entregas] [✓ Eventos]   Projeto [▾]
```

- **Mês:** grade com até 3 itens por dia + "+n mais"; semana começa no domingo ou segunda (configurável; padrão domingo, comum no Brasil). **[PROPOSTA]**
- **Semana:** grade horária 06–23 h (rolável para 24 h); faixa superior "dia inteiro" para tarefas sem hora, marcos e entregas.
- **Agenda:** lista cronológica agrupada por dia, próximos 30 dias, com rolagem contínua.

### Tipos de item (diferenciação não depende só de cor)
| Tipo | Origem | Marcador | Editável no calendário |
|---|---|---|---|
| Tarefa | `Task.dueDate` | Ícone de checkbox | Arrastar muda `dueDate`; clicar abre painel da tarefa |
| Marco | `Milestone.dueDate` | Ícone de bandeira | Arrastar muda data do marco |
| Entrega | `Project.targetDate` ou marco com flag Entrega | Ícone de pacote | Abre projeto |
| Evento | `CalendarEvent` | Ícone de calendário; tipo (Reunião, Pessoal, Lembrete) | Criar/editar/arrastar/redimensionar |

### Eventos próprios
- Campos: título, tipo, início/fim (ou dia inteiro), local/link, projeto (opcional), notas, lembretes (ex.: 10 min, 1 h, 1 dia antes).
- Recorrência simples (diária, semanal, mensal) **[PROPOSTA — P2]**; no MVP, eventos únicos.

### Lembretes
- Disparam notificação dentro do app (sino + toast se a aplicação estiver aberta). Notificação do navegador opcional (Web Notifications) **[PROPOSTA — P2]**.

### Critérios de aceite
- [ ] Alterar vencimento da tarefa em qualquer tela reflete no calendário (mesma fonte de dados, sem tabela de eventos copiada).
- [ ] Um item nunca aparece duplicado (ex.: marco com flag Entrega aparece uma vez, como Entrega).
- [ ] Datas sem hora não mudam de dia ao trocar fuso (armazenadas como `DATE`).
- [ ] Navegação completa por teclado nas três visões.

---

## 8. Configurações

**Objetivo:** controlar conta, segurança, aparência e integrações.

### Seções (navegação lateral secundária)

| Seção | Conteúdo |
|---|---|
| Perfil | Nome, nome de exibição, avatar, e-mail, fuso horário, início da semana |
| Segurança | Alterar senha (exige senha atual), 2FA (ativar/desativar, novos códigos de recuperação), sessões ativas (dispositivo, IP aproximado, último uso, encerrar), histórico recente de acessos |
| Aparência | Tema: Claro / Escuro / Sistema; densidade: Confortável / Compacta **[PROPOSTA — P2 para densidade]** |
| Workspace | Nome do workspace, gerenciamento de tags (renomear, mesclar, cor), subtipos de projeto por categoria |
| Integrações | GitHub (Fase 1.1): estado da conexão, conta/organização, repositórios autorizados, última sincronização, erros, "Sincronizar agora", "Desconectar" |
| Dados | Exportar todos os dados (JSON + arquivos, assíncrono, link de download expira), Lixeira |

### Regras
- Ações sensíveis (desativar 2FA, alterar e-mail, exportar dados, desconectar GitHub) exigem reautenticação recente (senha ou TOTP nos últimos 10 min). **[PROPOSTA]**
- Formulários com aviso de alterações não salvas.

### Critérios de aceite
- [ ] Tema e intensidade da colagem também podem ser trocados pela barra superior, e a escolha fica salva no perfil (D-22).
- [ ] Encerrar uma sessão invalida-a imediatamente no servidor.
- [ ] Tema escolhido persiste e é aplicado antes da primeira pintura (sem "piscar" de tema).
- [ ] Exportação contém todos os dados do workspace e nenhum dado de outro workspace.

---

## 9. Perfil, Avatar e Pet (D-24)

**Objetivo:** tornar o Studio OS pessoal e divertido de abrir todo dia, sem adicionar trabalho. Prévia: [design/dashboard-colagem.html#perfil](../design/dashboard-colagem.html).

### Perfil (`/perfil`)
- Nome de exibição, nome do pet e opção "Mostrar o pet no Dashboard".
- **Criador de avatar** com pré-visualização ao vivo e opções em chips:
  - **Cabelo:** comprido, chanel, tranças, coquinhos.
  - **Franja:** reta ou repartida.
  - **Cores:** cabelo, pele e olhos.
  - **Rosto:** blush e sardas.
  - **Olhos:** coração, gatinho, piscadinha, sonolento.
  - **Sobrancelha e boca:** sobrancelha bravinha ou suave; boca em biquinho, sorriso ou emburrada.
  - **Roupa:** vestido de gola branca, conjunto vermelho, moletom bordô.
  - **Pernas:** arrastão, polainas de pelúcia, meias.
  - **Acessórios:** presilhas, laço, piercing, argolas, chifrinhos.
  - Botões "Surpreenda-me" e "Salvar perfil".
- O avatar é **um SVG em camadas gerado a partir de uma configuração** (JSON), sem upload de imagem. O mesmo desenho vira:
  - a **foto de perfil** (recorte do rosto) no menu lateral e na barra superior;
  - o **pet do Dashboard** (corpo inteiro, com expressões de humor).
- Estilo visual: designer toy (cabeça grande, olhos expressivos), **arte original**, sem reproduzir personagens comerciais das referências.

### Pet no Dashboard **[PROPOSTA — Q24]**
Princípio: o pet **reage aos dados reais** e **nunca exige manutenção**. Ele não morre, não passa fome e não cobra cuidado.

| Indicador | Regra de cálculo |
|---|---|
| **Energia** | `tarefas concluídas hoje ÷ meta diária` (meta padrão 3, configurável), máx. 100 |
| **Humor** | Base 70; −20 por tarefa atrasada; +8 por tarefa concluída hoje; +3 por carinho (máx. 5 por dia); limitado entre 0 e 100 |
| **Cerejas** | +1 por tarefa concluída (−1 se a conclusão for desfeita no mesmo dia) |
| **Nível** | Cada cereja dada ao pet vale 1 XP; sobe um nível a cada 5 XP |
| **Expressão** | Sonolenta (23 h–6 h) › Preocupada (há atrasos e humor < 60) › Feliz (humor ≥ 80) › Tranquila |

Interações:
- Clicar no pet ou em "Fazer carinho" faz surgir corações.
- "Dar cereja" fica disponível depois de concluir tarefas.
- Ao concluir uma tarefa, o pet dá um pulinho e comenta.

Animações leves (respirar, pular) são desativadas com `prefers-reduced-motion`.

### Critérios de aceite
- [ ] Alterar o avatar atualiza a foto de perfil e o pet sem recarregar a página.
- [ ] A configuração do avatar é validada no backend (só valores da lista permitida, nunca SVG enviado pela usuária).
- [ ] Os indicadores do pet batem com as fórmulas acima em testes com dados de fixture.
- [ ] Esconder o pet remove o card do Dashboard sem perder o progresso.
- [ ] O pet tem descrição acessível (nome + humor) e as ações funcionam por teclado.

### 9.1 Atualização de 10/11/2026: pet 3D e alimentação diária (D-25, D-26)

Esta subseção **substitui** a tabela de indicadores da §9.

**Renderização:** pet 3D com Three.js.
- O avatar é montado a partir da mesma configuração JSON do perfil, com acabamento de vinil brilhante (designer toy).
- O rosto é uma textura gerada do SVG do avatar, com expressões trocadas por humor e piscadas automáticas.
- Gira com o arraste; com toque ou clique, faz carinho.
- A foto de perfil é um retrato renderizado do próprio boneco.
- Sem WebGL, usa o avatar 2D de reserva.
- Com `prefers-reduced-motion`, fica parado.

**Comidas (lancheira):**

| Comida | Como ganha | Saciedade | XP |
|---|---|---|---|
| Cereja | Concluir uma tarefa (se a conclusão for desfeita, a cereja não usada é removida) | +10 | 1 |
| Cupcake | Criar uma ideia no Idea Lab | +20 | 2 |
| Torta de cereja | Concluir um marco de projeto | +45 | 5 |
| Bolo de cereja | Concluir um projeto | +100 | 15 |
| Milkshake | Alimentar o pet 3 dias seguidos (a cada múltiplo de 3) | +30 | 3 |

**Indicadores:**

| Indicador | Regra **[PROPOSTA]** |
|---|---|
| Saciedade | 0–100. Cai cerca de 4 pontos por hora (de cheia a vazia em ~25 h); comer soma o valor da comida, até 100 |
| Sequência | Dias seguidos com pelo menos uma refeição |
| Humor | Base 60; −15 por tarefa atrasada; +8 por tarefa concluída hoje; +3 por carinho (máx. 5 por dia); +15 se saciedade ≥ 60; −20 se < 30 |
| Nível | Sobe a cada 10 XP |
| Expressão | Fraquinha (saciedade 0) › Sonolenta (23 h–6 h) › Faminta (saciedade < 30) › Preocupada (atrasos e humor < 55) › Feliz (humor ≥ 80) › Tranquila |

**Regras de integridade:**
- Cada comida é concedida **uma vez por evento de origem** (registro com `sourceType` + `sourceId` único), para evitar ganhar várias comidas marcando e desmarcando a mesma tarefa.
- Comida já comida não é retirada se a conclusão for desfeita depois.
- **Sem comer (D-27):** com saciedade 0, o pet fica "fraquinha" e dormindo (expressão sonolenta). Nunca morre e nunca perde nível, XP, comidas ou personalização. Uma refeição o acorda ("Acordei! Obrigada por cuidar de mim"). Só a sequência de dias zera.

**Avatar (D-26):**
- **Corpo:** formato (5 tipos) e silhueta (magra, média, gordinha) ajustam o tronco, os braços e as pernas.
- **Cabelo:** 8 estilos, 5 franjas, mechas com cor própria.
- **Roupas:** 7 modelos com cor escolhível; 6 tipos de meia e 3 sapatos.
- **Joias:** prata ou dourado.
- **Acessórios:** 13 opções.
