# 04 — Design System: Cherry Atelier

> Status: rascunho para revisão · Fase 0 · 10/11/2026
> Direção: **Cherry Atelier — Premium Editorial SaaS** **[DIRETRIZ]**

> **Revisão em andamento (10/11/2026).** Depois da primeira prévia, a owner pediu mudanças que **substituem** partes deste documento (D-16 a D-18 no registro de decisões):
> - **Cor:** o acento principal passa a ser um **bordô** (`#7E1414` no claro; texto de acento `#FF8F96` no escuro), no lugar do Cherry `#A63850`. A owner achou a paleta anterior difícil de visualizar. O tom exato ainda depende de confirmação (Q22).
> - **Glass:** cards, barra superior e barra lateral passam a usar **vidro fosco** (`backdrop-filter: blur(18px)`, fundo 58–62% opaco) para deixar a colagem aparecer por trás. Isso substitui a regra "evitar glass" de §1 **somente para as telas com colagem**.
> - **Tipografia:** saem Cormorant Garamond e Manrope. Entra uma mistura: grotesca pesada e apertada (ref. "coture studio") para títulos e números, script floreado (ref. "Cherry Bomb") ou script de tinta (ref. "Onehart") para o logo e o nome, e Space Mono para rótulos. Na prévia usamos substitutos do Google Fonts (Archivo 900, Monsieur La Doulaise, Yesteryear). A fonte definitiva pode ser licenciada (Q23).
> - **Colagem:** adesivos maiores, mais numerosos (14) e mais opacos, cobrindo a tela inteira.
>
> Prévia viva: [design/dashboard-colagem.html](../design/dashboard-colagem.html). As seções abaixo serão reescritas quando a direção for aprovada.

## 1. Princípios visuais

1. **Editorial, não decorativo.** A sofisticação vem da tipografia, do espaço e da hierarquia, não de enfeites.
2. **Cereja como acento, não como tema.** O Cherry aparece em ações primárias, estados ativos e pequenos detalhes. A maior parte da tela é creme, espresso e neutros quentes. Regra prática: **acentos cereja/rosa em no máximo ~10% da área visível**. **[PROPOSTA]**
3. **Densidade calma.** Funciona com centenas de projetos: tabelas legíveis, cards compactos, sem ruído.
4. **Consistência por tokens.** Nenhuma cor, tamanho ou sombra fixada diretamente em componente; tudo vem de tokens. **[DIRETRIZ]**
5. **Simbolismo sutil.** O motivo da cereja aparece no monograma, no indicador de item ativo (um pequeno ponto cereja) e em ilustrações de linha fina nos estados vazios. Nunca como padrão de fundo ou ícone em toda parte. **[PROPOSTA]**

**Evitar** **[DIRETRIZ]**: excesso de rosa, gradientes e glassmorphism, animações gratuitas, gráficos decorativos, painéis lotados, contraste baixo.

## 2. Cores

### 2.1 Paleta da marca **[DIRETRIZ]**

| Token de marca | HEX | Uso |
|---|---|---|
| `wine-900` Deep Wine | `#4C1829` | Barra lateral, superfícies de marca, elementos escuros principais |
| `cherry-600` Cherry | `#A63850` | Ações primárias, acentos, estados ativos |
| `berry-400` Muted Berry | `#B97183` | Acentos secundários |
| `blush-100` Soft Blush | `#F1D5DC` | Fundos suaves, tags, destaques sutis |
| `cream-50` Warm Cream | `#FAF5F1` | Fundo principal no tema claro |
| `espresso-900` Espresso | `#342329` | Texto principal e contraste |

### 2.2 Contraste verificado (WCAG 2.x, calculado)

| Combinação | Razão aprox. | Resultado |
|---|---|---|
| Espresso sobre Warm Cream | 13,7 : 1 | AAA |
| Cherry sobre Warm Cream | 5,9 : 1 | AA texto normal |
| Branco sobre Cherry (botão primário) | 6,4 : 1 | AA texto normal |
| Cherry sobre Soft Blush (tag) | 4,6 : 1 | AA texto normal (limite — usar peso ≥ 500) |
| Espresso sobre Soft Blush | 10,8 : 1 | AAA |
| Warm Cream sobre Deep Wine (barra lateral) | 13,2 : 1 | AAA |
| **Muted Berry sobre Warm Cream** | **3,4 : 1** | **Somente texto grande (≥ 24 px) ou elementos gráficos/bordas. Nunca texto de corpo.** |

> Valores calculados pela fórmula de luminância relativa do WCAG. Os tokens derivados abaixo **[PROPOSTA]** devem ser verificados com ferramenta automatizada (teste de contraste no CI) antes da aprovação final.

### 2.3 Neutros quentes derivados **[PROPOSTA]**

| Token | HEX | Uso |
|---|---|---|
| `neutral-0` | `#FFFFFF` | Superfícies elevadas no claro (cards sobre creme) |
| `neutral-50` | `#FAF5F1` | = Warm Cream |
| `neutral-100` | `#F3ECE7` | Fundo de áreas secundárias, hover de linha |
| `neutral-200` | `#E7DDD7` | Bordas sutis |
| `neutral-300` | `#D5C7C0` | Bordas de campos, divisores fortes |
| `neutral-500` | `#8A7A7F` | Ícones inativos (não para texto pequeno) |
| `neutral-600` | `#6E5D63` | Texto secundário (≈ 6 : 1 sobre creme) |
| `neutral-900` | `#342329` | = Espresso |

### 2.4 Cores semânticas **[PROPOSTA]**

O erro precisa ser distinguível do Cherry primário. Por isso, o "perigo" é um **tijolo alaranjado**, não vermelho-cereja, e sempre acompanha ícone e texto.

| Token | Claro (texto / fundo) | Escuro (texto / fundo) | Uso |
|---|---|---|---|
| `success` | `#2F6B4C` / `#E3EFE7` | `#8CC7A5` / `#1E2E25` | Concluído, salvo |
| `warning` | `#8A5A12` / `#F6EAD3` | `#E2B66B` / `#33281A` | Prazo próximo, atenção |
| `danger` | `#9B2F14` / `#F7E1DA` | `#F09A80` / `#3A1E17` | Erro, atrasado, exclusão |
| `info` | `#35546E` / `#E1E9F0` | `#9CB8D1` / `#1D2731` | Informação neutra |

### 2.5 Tokens semânticos (o que os componentes usam)

| Token | Tema claro | Tema escuro **[PROPOSTA]** |
|---|---|---|
| `--bg-app` | `#FAF5F1` | `#1A1114` |
| `--bg-surface` | `#FFFFFF` | `#231A1D` |
| `--bg-surface-muted` | `#F3ECE7` | `#2C2125` |
| `--bg-sidebar` | `#4C1829` | `#140C0F` (com borda `#2C2125`) |
| `--text-primary` | `#342329` | `#F3E9EC` |
| `--text-secondary` | `#6E5D63` | `#BFA9B0` |
| `--text-on-brand` | `#FAF5F1` | `#F3E9EC` |
| `--border-subtle` | `#E7DDD7` | `#3A2C31` |
| `--border-strong` | `#D5C7C0` | `#4A393F` |
| `--accent` (fundo de ação primária) | `#A63850` | `#A63850` |
| `--accent-hover` | `#8E2E44` | `#B8455E` |
| `--accent-text` (links, item ativo) | `#A63850` | `#E39AAB` |
| `--accent-soft` (tag, seleção) | `#F1D5DC` | `#3D2129` |
| `--heat-0…4` (gráfico de contribuições, escala "brasa") | `#E4D9D4` → `#FFC98F` → `#FF7A4D` → `#E0262C` → `#8F1018` | `#2B1D20` → `#8C1424` → `#E0262C` → `#FF6A45` → `#FFC861` |
| `--accent-secondary` | `#B97183` | `#B97183` |
| `--focus-ring` | `#A63850` (2 px) + halo `#F1D5DC` | `#E39AAB` (2 px) |

No tema escuro, o fundo é um vinho quase preto (não cinza neutro), mantendo a temperatura da marca.

## 3. Tipografia **[DIRETRIZ]** (fontes) / **[PROPOSTA]** (escala)

| Papel | Família | Observação |
|---|---|---|
| Títulos editoriais | **Cormorant Garamond** (500/600) | Somente ≥ 24 px — em tamanhos pequenos a fonte fica fina demais para legibilidade |
| Interface | **Manrope** (400/500/600/700) | Todo texto funcional, rótulos, tabelas, botões |
| Código e dados técnicos | **JetBrains Mono** (400/500) **[PROPOSTA]** | SHAs, códigos `RF-001`, blocos de código |

Carregamento via `next/font` (auto-hospedado, sem requisição ao Google em tempo de execução, `font-display: swap`).

### Escala

| Token | Família | Tamanho / altura de linha | Peso | Uso |
|---|---|---|---|---|
| `display` | Cormorant | 40 / 48 | 500 | Saudação do Dashboard |
| `h1` | Cormorant | 32 / 40 | 600 | Título de página |
| `h2` | Cormorant | 24 / 32 | 600 | Título de seção principal |
| `h3` | Manrope | 18 / 26 | 600 | Título de card / bloco |
| `h4` | Manrope | 15 / 22 | 600 | Subtítulos, cabeçalhos de coluna Kanban |
| `body` | Manrope | 15 / 24 | 400 | Texto padrão, editor de notas |
| `body-sm` | Manrope | 14 / 20 | 400 | Tabelas, listas, formulários |
| `caption` | Manrope | 12 / 16 | 500 | Metadados, datas, contadores |
| `overline` | Manrope | 11 / 16, `letter-spacing: 0.08em`, maiúsculas | 600 | Rótulos de seção ("HOJE", "AGENDA") |
| `mono` | JetBrains Mono | 13 / 20 | 400 | Código |

Números em tabelas e indicadores usam `font-variant-numeric: tabular-nums`.

## 4. Espaçamento, grid e forma **[PROPOSTA]**

- **Base 4 px.** Escala: `0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80`.
- **Layout:** barra lateral 248 px (recolhida 64 px); conteúdo com padding 32 px (desktop), 24 px (tablet), 16 px (celular); largura máxima de leitura 1440 px para páginas de dados, 760 px para texto (notas, escopo).
- **Raios:** `sm 6 px` (campos, tags), `md 10 px` (cards, botões), `lg 14 px` (painéis, diálogos), `full` (avatares, indicadores).
- **Bordas:** 1 px `--border-subtle` é o separador padrão; sombras só para camadas flutuantes.
- **Elevação:**
  - `shadow-1`: `0 1px 2px rgba(52,35,41,.06)` — cards em hover.
  - `shadow-2`: `0 8px 24px rgba(52,35,41,.10)` — dropdowns, popovers.
  - `shadow-3`: `0 16px 48px rgba(52,35,41,.16)` — painéis laterais, diálogos.
- **Movimento:** 150 ms (hover/estado) e 200 ms (painéis), `cubic-bezier(.2,.0,.0,1)`. Com `prefers-reduced-motion`, transições viram instantâneas. Nada de animação em loop.

## 5. Ícones
- **Lucide** **[DIRETRIZ]**, traço 1,5 px, tamanhos 16 / 20 / 24.
- Ícone sozinho sempre com `aria-label` e tooltip.

## 6. Componentes

Base: **shadcn/ui** (Radix UI) **[DIRETRIZ]**, estilizada exclusivamente pelos tokens. Componentes ficam em `apps/web/src/components/ui` (primitivos) e `apps/web/src/components/<domínio>` (compostos).

| Componente | Variantes / notas |
|---|---|
| **Button** | `primary` (Cherry, texto creme), `secondary` (borda, texto espresso), `ghost`, `danger`, `link`; tamanhos `sm 32`, `md 36`, `lg 44` px. Estado de carregamento mantém largura |
| **IconButton** | Mesmas variantes; área de toque mínima 40 × 40 (44 no celular) |
| **Input / Textarea / Select / Combobox** | Rótulo sempre visível (sem placeholder como rótulo); mensagem de erro abaixo, ligada por `aria-describedby` |
| **DatePicker** | Formato `dd/mm/aaaa`, digitação livre + calendário; atalhos "Hoje", "Amanhã", "Próxima segunda" |
| **Badge de status** | Discreto: ponto colorido + texto, fundo neutro. Cores por status abaixo |
| **Tag** | Fundo `--accent-soft` ou cor escolhida (paleta restrita de 8 tons dessaturados) |
| **Card** | Superfície branca, borda sutil, raio md, padding 20; hover eleva para `shadow-1` só se clicável |
| **Table** | Cabeçalho `caption` maiúsculo em `--text-secondary`; linhas 44 px (confortável) / 36 px (compacta); hover `--bg-surface-muted`; cabeçalho fixo; ordenação acessível (`aria-sort`) |
| **Kanban** | Colunas com fundo `--bg-surface-muted`, cards brancos; arrastar via `dnd-kit` com sensores de teclado |
| **Sheet (painel lateral)** | Padrão para detalhes de tarefa/arquivo; 480 px; foco preso enquanto aberto; `Esc` fecha |
| **Dialog** | Só para confirmações destrutivas ou decisões bloqueantes. **[DIRETRIZ]** evitar excesso de modais |
| **Toast** | Canto inferior direito; com "Desfazer" quando aplicável; anunciado via `aria-live="polite"` |
| **Command palette** | `cmdk`; resultados agrupados por tipo |
| **Tabs** | Sublinhado Cherry 2 px no item ativo |
| **Progress** | Barra fina (4 px), trilho `--border-subtle`, preenchimento Cherry; sempre com texto ("62%") |
| **EmptyState** | Ilustração de linha (opcional), título Cormorant 24, texto, 1 ação primária + 1 secundária |
| **Skeleton** | Blocos `--bg-surface-muted`, pulso suave (desativado em movimento reduzido) |
| **Sidebar** | Fundo Deep Wine; item ativo: texto creme, fundo `rgba(250,245,241,.08)`, ponto Cherry à esquerda |
| **Editor (Tiptap)** | Barra flutuante na seleção + barra fixa mínima; tipografia `body` |

### Cores de status **[PROPOSTA]**

| Projeto | Cor do ponto | Tarefa | Cor do ponto |
|---|---|---|---|
| Ideia | `neutral-500` | Backlog | `neutral-500` |
| Planejamento | `info` | A fazer | `berry-400` |
| Em andamento | `cherry-600` | Em andamento | `cherry-600` |
| Pausado | `warning` | Em revisão | `info` |
| Concluído | `success` | Concluída | `success` |
| Arquivado | `neutral-300` | — | — |

Prioridade: ícone + texto ("Urgente", "Alta", "Média", "Baixa"); só Urgente usa cor (`danger`).

## 7. Estados de interação

| Estado | Tratamento |
|---|---|
| Hover | Mudança sutil de fundo (`--bg-surface-muted`) ou `--accent-hover` |
| Focus (teclado) | Anel 2 px `--focus-ring` com offset 2 px, sempre visível em `:focus-visible` (WCAG 2.4.11/2.4.13) |
| Active/pressionado | Escurece 4% |
| Desabilitado | Opacidade 50%, cursor `not-allowed`, nunca a única forma de explicar por que algo não está disponível (tooltip com motivo) |
| Selecionado | Fundo `--accent-soft`, borda `--accent` |
| Erro | Borda `danger`, ícone, mensagem de texto |
| Carregando | Skeleton (conteúdo) ou spinner inline (botão) |

## 8. Responsividade **[PROPOSTA]**

| Breakpoint | Largura | Comportamento |
|---|---|---|
| `sm` | ≥ 640 px | — |
| `md` | ≥ 768 px | Tabelas mostram mais colunas |
| `lg` | ≥ 1024 px | Barra lateral fixa visível; painéis laterais sobrepõem o conteúdo |
| `xl` | ≥ 1280 px | Layout do Dashboard em duas colunas; painéis laterais podem empurrar o conteúdo |
| `2xl` | ≥ 1536 px | Largura máxima aplicada |

- `< 1024 px`: barra lateral vira gaveta (menu ☰); captura rápida e busca permanecem na barra superior.
- `< 768 px`: tabelas viram listas de cards; Kanban rola horizontalmente com uma coluna por tela (snap); Calendário abre em Agenda por padrão; painéis laterais ocupam tela inteira.
- Áreas de toque ≥ 44 px no celular.

## 9. Acessibilidade (WCAG 2.2 AA) **[DIRETRIZ]**

- Contraste mínimo 4,5 : 1 para texto normal, 3 : 1 para texto grande e componentes de interface.
- Cor nunca é o único indicador (status, prioridade, tipo de evento no calendário sempre têm ícone/texto).
- Navegação completa por teclado, incluindo Kanban e calendário; ordem de foco lógica; "Pular para o conteúdo".
- Alvos de toque ≥ 24 × 24 px (2.5.8), preferencialmente 40+.
- Arrastar e soltar sempre com alternativa sem arrastar (2.5.7): menu "Mover para…".
- Formulários: rótulos, erros descritivos, sem perda de dados ao errar (3.3.7 entrada redundante).
- `lang="pt-BR"` no documento; datas legíveis por leitor de tela.
- Testes automatizados com `axe-core` em componentes e E2E; revisão manual com leitor de tela (NVDA) antes do lançamento interno.

## 10. Implementação dos tokens **[PROPOSTA]**

- Tokens como variáveis CSS em `:root` e `[data-theme="dark"]` (tema escolhido) com `@media (prefers-color-scheme: dark)` para o modo "Sistema".
- Tailwind CSS v4 lê as variáveis via `@theme` (ex.: `bg-surface`, `text-primary`, `border-subtle`); classes utilitárias de cor "crua" (`bg-[#A63850]`) bloqueadas por regra de lint.
- Tema aplicado por script inline no `<head>` antes da renderização para evitar troca visível.
- Storybook **[PROPOSTA — P2]** ou página interna `/_design` (somente em desenvolvimento) para revisar componentes nos dois temas.

## 11. Camada de colagem (adesivos de fundo)

Pedido da owner em 10/11/2026: adesivos translúcidos no fundo do Dashboard, numa estética it girl / anos 2000 alternativa. **[DIRETRIZ]** (a camada existir) / **[PROPOSTA]** (regras abaixo). Prévia para aprovação: [design/dashboard-colagem.html](../design/dashboard-colagem.html).

Isso complementa o princípio "editorial, não decorativo" (§1) porque a decoração fica **só no fundo**. Os dados continuam numa camada limpa por cima.

**Regras**
- Os adesivos ficam numa camada fixa **atrás** do conteúdo (`z-index` negativo, `pointer-events: none`, `aria-hidden`). Cards, tabelas e campos continuam **opacos**, então o contraste do texto não muda.
- Recorte com borda branca de adesivo (die-cut) e sombra leve; rotações entre −16° e +12°; posições fixas, sem aleatoriedade (o layout é previsível).
- Token `--sticker-opacity` com três níveis, escolhidos em Configurações → Aparência: **Desligada** (0), **Sutil** (0,22, padrão) e **Presente** (0,5). No tema escuro a opacidade é multiplicada por 0,75.
- **Onde aparece:** Dashboard e telas de "respiro" (estados vazios, login). **Não aparece** em telas densas (Kanban, tabelas, editor de notas, escopo), onde atrapalharia a leitura. **[PROPOSTA]**
- Celular: no máximo 2 a 4 adesivos menores, longe do texto principal.
- Sem animação. A preferência `prefers-reduced-motion` não é afetada porque nada se move.
- Arquivos: originais em `design/stickers/originais/`, adesivos processados em `design/stickers/` (gerados por `design/stickers/gerar_adesivos.py`). Na implementação, vão para `apps/web/public/stickers/` em WebP otimizado.
- Coleção editável no futuro (a owner sobe os próprios adesivos pelo módulo Arquivos). **[FUTURO]**

**Direitos de imagem [QUESTÃO ABERTA Q20]:** algumas referências parecem ser obras de terceiros (o boneco lembra um designer toy comercial; a arte do leopardo e o kanji estilizado podem ter autoria). Para uso pessoal e privado o risco é baixo. Antes de qualquer uso comercial ou SaaS, trocar por arte própria ou licenciada.

## 12. Marca

- **Monograma** **[QUESTÃO ABERTA Q14]**: existe logo da Dev Annalu? Se não, proposta: monograma "A" em Cormorant com um pequeno talo de cereja integrado à haste, em creme sobre Deep Wine.
- Favicon: monograma simplificado.
