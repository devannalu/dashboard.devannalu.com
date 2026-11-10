# 01 — Visão do Produto & PRD

> Status: rascunho para revisão · Fase 0 · 10/11/2026

## 1. Resumo

**Annalu Studio OS** é o centro de comando digital da **Dev Annalu**: uma aplicação web privada para gerenciar projetos, escopo, tarefas, prazos, notas, ideias, arquivos, clientes e atividade de desenvolvimento (GitHub) em um único lugar, com o mínimo de digitação duplicada.

| Item | Definição |
|---|---|
| Produto | Annalu Studio OS **[DIRETRIZ]** |
| Empresa | Dev Annalu **[DIRETRIZ]** |
| Tipo | Aplicação web de gestão de negócio e projetos **[DIRETRIZ]** |
| Público inicial | Uma única pessoa: a owner **[DIRETRIZ]** |
| Público futuro | Equipes, colaboradores e clientes **[FUTURO]** |
| Mercado | Software interno proprietário; possível SaaS no longo prazo **[DIRETRIZ]** |
| Idioma | Interface e documentação em pt-BR; datas `dd/mm/aaaa`; valores em BRL **[DIRETRIZ]** |

## 2. Problema

Hoje, a informação de trabalho de uma profissional independente de tecnologia e criação fica espalhada:

- Projetos e tarefas em uma ferramenta, prazos em outra, notas em uma terceira.
- Arquivos de marca, referências e documentos soltos em pastas locais e na nuvem.
- Atividade de código no GitHub desconectada do planejamento.
- Ideias de produto anotadas em lugares diferentes, sem caminho claro até virarem projeto.
- Status e progresso atualizados manualmente, em vários lugares, o que leva a dados desatualizados.

**Consequência:** tempo gasto em manutenção administrativa, prazos perdidos de vista, contexto perdido entre projetos e falta de uma visão confiável de "o que precisa da minha atenção hoje".

## 3. Princípios do produto

1. **O sistema trabalha para a owner.** Nada de fluxos de entrada de dados desnecessários. **[DIRETRIZ]**
2. **Uma informação, um lugar.** Datas de tarefas aparecem no calendário por projeção, não por cópia. Arquivos são vinculados, não duplicados.
3. **Três fontes de dados**, cada uma com seu papel **[DIRETRIZ]**:
   - *Manual:* decisões, contexto, escopo, criação.
   - *Calculado:* progresso, atrasos, indicadores, derivados dos dados internos.
   - *Integrado:* GitHub (Fase 1.1); Google Calendar (Fase 2).
4. **Dados reais ou nenhum dado.** Nenhuma métrica fictícia; estados vazios são úteis e acionáveis. **[DIRETRIZ]**
5. **Nunca perder conteúdo.** Notas e escopo nunca são sobrescritos silenciosamente. **[DIRETRIZ]**
6. **Preparado para crescer, sem complexidade antecipada.** Workspaces existem no modelo desde o início; gestão de equipe não existe na interface do MVP. **[DIRETRIZ]**

## 4. Persona

### Owner — Annalu (única usuária do MVP)

- Desenvolvedora e profissional criativa, dona da Dev Annalu.
- Trabalha simultaneamente em projetos pessoais, produtos próprios, projetos de clientes e acompanhamento pessoal de trabalho profissional.
- Usa o GitHub diariamente.
- Precisa: ver prioridades do dia em segundos, capturar ideias sem fricção, manter escopo de clientes rastreável e encontrar qualquer arquivo ou nota rapidamente.
- Uso principal em desktop; consultas rápidas no celular. **[PREMISSA]**

### Personas futuras **[FUTURO]**
- **Colaborador(a):** executa tarefas em projetos compartilhados.
- **Cliente:** acompanha progresso, entregas e aprova mudanças de escopo em um portal.

## 5. Objetivos e métricas de sucesso

Como é um produto de uso pessoal, o sucesso é medido por adoção real e confiabilidade, não por métricas de mercado.

| Objetivo | Indicador | Meta inicial **[PROPOSTA]** | Como medir |
|---|---|---|---|
| Centralizar o trabalho | Projetos ativos cadastrados no sistema vs. projetos ativos reais | 100% em 30 dias após o lançamento interno | Revisão da owner |
| Substituir ferramentas paralelas | Ferramentas de tarefas/notas abandonadas | Pelo menos 1 em 60 dias | Revisão da owner |
| Reduzir trabalho manual | Atualizações manuais de progresso | Zero (progresso 100% calculado) | Por construção |
| Visão diária confiável | Tempo para responder "o que faço hoje?" | Menos de 10 segundos a partir do Dashboard | Teste de uso |
| Captura sem fricção | Tempo para registrar uma nota rápida | Menos de 5 segundos (atalho de teclado → salvar) | Teste de uso |
| Confiabilidade | Perda de dados de notas/escopo | Zero incidentes | Monitoramento + testes de integridade |
| Desempenho | Navegação entre telas principais | p95 < 1 s em rede comum | Monitoramento |

## 6. Escopo por fase **[DIRETRIZ]**

| Fase | Conteúdo |
|---|---|
| **Fase 0** | Descoberta, PRD, arquitetura, modelo de dados, design system, backlog (este conjunto de documentos) |
| **Fase 1 — MVP** | Autenticação, workspace, Dashboard, projetos e categorias, escopo, tarefas e Kanban, marcos, calendário interno, notas e captura rápida, Idea Lab, conversão ideia→projeto, arquivos e ativos, clientes básicos, relatórios básicos |
| **Fase 1.1** | Integração GitHub (somente leitura) |
| **Fase 2** | Clientes avançado, propostas e contratos, financeiro, controle de tempo, relatórios avançados, Google Calendar |
| **Fase 3** | Automações, organização assistida por IA, colaboração em equipe, papéis e permissões, portal do cliente, possível SaaS |

### Fora do MVP (explicitamente)
- Financeiro, propostas, contratos, cobrança. **[DIRETRIZ]**
- Controle de tempo. **[DIRETRIZ]** (Fase 2)
- Escrita no GitHub (criar issues, comentar, fechar). **[DIRETRIZ]**
- Convite de membros, papéis além de Owner, portal do cliente. **[DIRETRIZ]**
- Edição colaborativa em tempo real de notas. **[PROPOSTA]**
- Aplicativo móvel nativo. **[PROPOSTA]** (interface responsiva atende ao MVP)
- Notificações por e-mail/push. **[PROPOSTA]** (lembretes no MVP são dentro do app; ver questão aberta Q12)

## 7. Requisitos funcionais (MVP)

Cada requisito tem um identificador estável para rastreio no backlog ([08-backlog-mvp.md](08-backlog-mvp.md)).

### 7.1 Autenticação e conta
- **RF-AUT-01** Login com e-mail e senha. **[DIRETRIZ — D-19]** A conta da owner é pré-configurada pelo e-mail e a senha é criada no primeiro acesso.
- **RF-AUT-02** Autenticação em dois fatores (TOTP ou passkey), opcional. **[FUTURO]**
- **RF-AUT-03** Sessão segura com expiração por inatividade e encerramento de todas as sessões.
- **RF-AUT-04** Proteção contra força bruta (limite de tentativas).

### 7.2 Workspace
- **RF-WS-01** Todo dado de negócio pertence a um workspace. **[DIRETRIZ]**
- **RF-WS-02** No MVP, um workspace criado no setup inicial, com a owner como membro `OWNER`.
- **RF-WS-03** Toda autorização é verificada no backend com base na associação usuário↔workspace. **[DIRETRIZ]**

### 7.3 Projetos
- **RF-PRJ-01** CRUD de projetos com os campos: nome, descrição, categoria, subtipo, objetivo, status, prioridade, data de início, data-alvo de entrega, capa, logo, tags, cliente (opcional), repositório GitHub (Fase 1.1). **[DIRETRIZ]**
- **RF-PRJ-02** Categorias: Pessoal, Produto Próprio, Cliente, Trabalho Profissional. **[DIRETRIZ]**
- **RF-PRJ-03** Status: Ideia, Planejamento, Em andamento, Pausado, Concluído, Arquivado. **[DIRETRIZ]**
- **RF-PRJ-04** Prioridade: Baixa, Média, Alta, Urgente. **[PROPOSTA]**
- **RF-PRJ-05** Cada projeto tem um espaço próprio com abas: Visão geral, Escopo, Tarefas, Marcos, Notas, Arquivos, Atividade (e GitHub na Fase 1.1). **[DIRETRIZ]**
- **RF-PRJ-06** Progresso calculado automaticamente (ver §9). **[DIRETRIZ]**
- **RF-PRJ-07** Projetos de categoria Cliente exigem vínculo com um cliente. **[PROPOSTA]**
- **RF-PRJ-08** Projetos de Trabalho Profissional recebem marcação de confidencialidade e aviso de uso (ver §10). **[DIRETRIZ]**
- **RF-PRJ-09** Arquivar e excluir (com lixeira de 30 dias) projetos. **[PROPOSTA]**

### 7.4 Escopo
- **RF-ESC-01** Escopo estruturado por projeto: declaração do problema, objetivos de negócio, descrição, entregáveis, requisitos funcionais, requisitos não funcionais, restrições, premissas, itens fora do escopo, critérios de aceite, considerações técnicas. **[DIRETRIZ]**
- **RF-ESC-02** Itens de lista (entregáveis, requisitos etc.) recebem código sequencial legível (ex.: `RF-003`). **[PROPOSTA]**
- **RF-ESC-03** Toda alteração salva gera uma revisão com autor, data e resumo opcional; revisões podem ser comparadas. **[DIRETRIZ]** (rastreabilidade) / **[PROPOSTA]** (mecanismo)
- **RF-ESC-04** Arquitetura preparada para solicitações de mudança com aprovação do cliente. **[FUTURO]**

### 7.5 Tarefas
- **RF-TAR-01** Tarefas com título, descrição (rich text), status, prioridade, data de vencimento (com hora opcional), tags, projeto, marco, anexos. **[DIRETRIZ]**
- **RF-TAR-02** Status: Backlog, A fazer, Em andamento, Em revisão, Concluída. **[DIRETRIZ]**
- **RF-TAR-03** Subtarefas (um nível) e checklists simples. **[DIRETRIZ]** / um nível: **[PROPOSTA]**
- **RF-TAR-04** Visões Kanban e Lista, por projeto e global ("Todas as tarefas"). **[DIRETRIZ]** / global: **[PROPOSTA]**
- **RF-TAR-05** Reordenação por arrastar e soltar no Kanban, com alternativa por teclado. **[PROPOSTA]**
- **RF-TAR-06** Tarefas podem ser tarefas avulsas (sem projeto)? → **[QUESTÃO ABERTA Q17]**. Proposta: sim, para tarefas administrativas da empresa.
- **RF-TAR-07** Data de conclusão registrada automaticamente ao mover para Concluída.
- **RF-TAR-08** Histórico de atividade por tarefa. **[DIRETRIZ]**
- **RF-TAR-09** Vínculo com issues do GitHub (Fase 1.1). **[DIRETRIZ]**

### 7.6 Marcos
- **RF-MAR-01** Marcos por projeto com nome, descrição, data-alvo, status (Aberto, Concluído). **[PROPOSTA]**
- **RF-MAR-02** Tarefas podem pertencer a um marco; o marco exibe progresso calculado.
- **RF-MAR-03** Marcos podem ser marcados como "Entrega" (aparecem no calendário como entrega). **[PROPOSTA]**

### 7.7 Calendário
- **RF-CAL-01** Visões Mensal, Semanal e Agenda. **[DIRETRIZ]**
- **RF-CAL-02** Exibe, por projeção (sem cópia): vencimentos de tarefas, marcos, entregas e data-alvo de projetos. **[DIRETRIZ]**
- **RF-CAL-03** Eventos próprios: reuniões, planejamento pessoal, lembretes. **[DIRETRIZ]**
- **RF-CAL-04** Alterar a data de uma tarefa reflete imediatamente no calendário; arrastar uma tarefa no calendário altera a data da tarefa. **[DIRETRIZ]** / arrastar: **[PROPOSTA]**
- **RF-CAL-05** Lembretes com notificação dentro do app. **[PROPOSTA]**
- **RF-CAL-06** Fuso horário: America/Sao_Paulo por padrão, configurável. **[PROPOSTA]**

### 7.8 Notas
- **RF-NOT-01** Três contextos: notas de projeto, notas rápidas (Inbox), notas de ideia. **[DIRETRIZ]**
- **RF-NOT-02** Editor rich text: títulos, listas, checklists, links, citações, blocos de código, anexos. **[DIRETRIZ]**
- **RF-NOT-03** Salvamento automático com indicação clara de status ("Salvando…", "Salvo às 14:32", "Sem conexão — alterações guardadas neste dispositivo"). **[PROPOSTA]**
- **RF-NOT-04** Controle de concorrência: conflitos geram aviso e escolha explícita, nunca sobrescrita silenciosa. **[DIRETRIZ]**
- **RF-NOT-05** Histórico de versões da nota com restauração. **[PROPOSTA]**
- **RF-NOT-06** Nota rápida pode ser: atribuída a projeto, convertida em tarefa, vinculada a ideia, marcada com tags, arquivada. **[DIRETRIZ]**
- **RF-NOT-07** Captura rápida acessível de qualquer tela por atalho de teclado. **[DIRETRIZ]**
- **RF-NOT-08** Notas podem ser fixadas no projeto. **[PROPOSTA]**

### 7.9 Idea Lab
- **RF-IDE-01** Ideias com: título, resumo, problema, público-alvo, solução potencial, referências (links), tags, notas, imagens, anexos, status, datas. **[DIRETRIZ]**
- **RF-IDE-02** Status: Semente, Explorando, Validando, Em espera, Descartada, Convertida. **[PROPOSTA]**
- **RF-IDE-03** Nenhum campo obrigatório além do título. **[DIRETRIZ]** (desenvolvimento gradual)
- **RF-IDE-04** Converter ideia em projeto, preservando notas, arquivos, referências e histórico, sem duplicação. **[DIRETRIZ]** (fluxo em §8.3)

### 7.10 Arquivos e ativos
- **RF-ARQ-01** Upload de arquivos para projeto, ideia, nota ou tarefa; um mesmo arquivo pode estar vinculado a vários contextos sem cópia. **[DIRETRIZ]** / multi-vínculo: **[PROPOSTA]**
- **RF-ARQ-02** Pré-visualização de imagens e PDFs; demais tipos por ícone e metadados. **[PROPOSTA]**
- **RF-ARQ-03** Renomear, organizar por coleções simples, tags, marcar como importante, fixar. **[DIRETRIZ]**
- **RF-ARQ-04** Definir capa e logo do projeto a partir de um arquivo de imagem. **[DIRETRIZ]**
- **RF-ARQ-05** Substituir arquivo preservando versões anteriores. **[DIRETRIZ]**
- **RF-ARQ-06** Biblioteca central com filtros (tipo, projeto, ideia, tag, importante, data) e busca. **[DIRETRIZ]**
- **RF-ARQ-07** Download somente autorizado, via URL assinada de curta duração. **[DIRETRIZ]**
- **RF-ARQ-08** Limites de tamanho e tipos permitidos (ver Q9). **[DIRETRIZ]**

### 7.11 Clientes
- **RF-CLI-01** Cadastro básico: nome, empresa, contatos (nome, e-mail, telefone, cargo), notas, projetos associados, histórico. **[DIRETRIZ]**
- **RF-CLI-02** Coleta mínima de dados pessoais (LGPD): sem CPF/RG no MVP. **[PROPOSTA]**

### 7.12 Busca global
- **RF-BUS-01** Paleta de comando (`Ctrl/⌘ + K`) que busca projetos, tarefas, notas, ideias, arquivos e clientes, e executa ações rápidas ("Nova tarefa", "Ir para Calendário"). **[DIRETRIZ]** (busca global) / paleta: **[PROPOSTA]**

### 7.13 Dashboard
- **RF-DSH-01** Boas-vindas personalizada, prioridades de hoje, tarefas atrasadas, próximos prazos, projetos ativos, projetos atualizados recentemente, prévia do calendário, notas rápidas, atividade recente, atividade GitHub (Fase 1.1), indicadores de produtividade. **[DIRETRIZ]**
- **RF-DSH-02** Toda métrica tem fórmula documentada (ver [03-especificacao-telas.md](03-especificacao-telas.md#1-dashboard)). **[DIRETRIZ]**

### 7.14 Relatórios
- **RF-REL-01** Projetos ativos vs. concluídos; distribuição por status e categoria; tarefas concluídas ao longo do tempo; prazos próximos; tarefas atrasadas; conclusão de marcos; taxa de entrega no prazo. **[DIRETRIZ]**
- **RF-REL-02** Cada gráfico mostra a definição do cálculo ao lado (tooltip "Como calculamos"). **[PROPOSTA]**

### 7.15 Atividade e auditoria
- **RF-ATV-01** Registro de atividade por entidade (criou, alterou status, moveu, anexou etc.). **[DIRETRIZ]**
- **RF-ATV-02** Log de auditoria de segurança separado (logins, 2FA, integrações, exclusões). **[PROPOSTA]**

### 7.16 Lixeira
- **RF-LIX-01** Itens excluídos (projetos, tarefas, notas, ideias, arquivos, clientes) vão para a lixeira por 30 dias e podem ser restaurados. **[PROPOSTA]**

## 8. Fluxos principais

### 8.1 "O que faço hoje?"
1. Login → Dashboard.
2. Seção "Hoje" mostra tarefas com vencimento hoje e atrasadas, ordenadas por prioridade.
3. Marcar tarefa como concluída direto no Dashboard (sem abrir modal).

### 8.2 Captura rápida
1. Em qualquer tela: `Ctrl/⌘ + Shift + N` (atalho final a validar) ou botão "Capturar" na barra superior.
2. Campo de texto aparece em painel leve; `Enter` salva na Inbox; `Esc` fecha.
3. Depois, na Inbox: atribuir a projeto, converter em tarefa, vincular a ideia ou arquivar.

### 8.3 Converter ideia em projeto **[PROPOSTA]**
1. Na ideia: "Converter em projeto".
2. Painel lateral (não modal bloqueante) pré-preenchido: nome = título; descrição = resumo; categoria e status (padrão: Planejamento) a escolher.
3. Ao confirmar, **em uma única transação**:
   - Cria o projeto com `sourceIdeaId` apontando para a ideia (relação 1:1, única).
   - Cria o escopo inicial: problema ← "Problema"; objetivos ← "Solução potencial" e "Público-alvo"; revisão nº 1 com resumo "Criado a partir da ideia «título»".
   - Notas da ideia passam a pertencer também ao projeto (o vínculo com a ideia é mantido como origem).
   - Arquivos da ideia ganham vínculo com o projeto (sem cópia de arquivo).
   - Tags e referências são copiadas para o projeto (referências viram uma nota "Referências da ideia" com os links).
   - Ideia muda para status **Convertida**, fica somente leitura e exibe link para o projeto.
   - Evento de atividade registrado em ambos.
4. Se qualquer passo falhar, nada é alterado (rollback).
5. Uma ideia só pode ser convertida uma vez (restrição única no banco).

### 8.4 Mudança de escopo em projeto de cliente
1. Editar escopo → salvar → revisão criada automaticamente com diff.
2. Aba "Histórico" do escopo mostra revisões com comparação lado a lado.
3. **[FUTURO]** Revisão marcada como "solicitação de mudança" enviada ao cliente para aprovação.

## 9. Modelo de progresso **[PROPOSTA]**

Regra documentada, sem uso de commits do GitHub. **[DIRETRIZ]**

- **Tarefa contável:** tarefa de nível superior (não é subtarefa), não arquivada e não excluída, pertencente ao projeto.
- **Progresso do projeto** = `tarefas contáveis concluídas ÷ tarefas contáveis`, arredondado para inteiro.
- Se o projeto não tem tarefas contáveis, exibir **"Sem tarefas"**, nunca "0%".
- **Progresso do marco** = mesma fórmula restrita às tarefas do marco.
- **Subtarefas** não entram no percentual do projeto; aparecem como "2 de 5 subtarefas" na tarefa-mãe.
- Status do projeto **não muda automaticamente** com 100% de progresso. O sistema sugere "Todas as tarefas estão concluídas. Marcar projeto como concluído?".
- **Alternativa considerada:** progresso ponderado por marcos (cada marco com peso). Rejeitada no MVP por exigir manutenção manual de pesos. Pode voltar como opção por projeto. **[FUTURO]**

## 10. Classificação de dados e confidencialidade

Distinção explícita entre informação pessoal, de clientes e do empregador. **[DIRETRIZ]**

| Categoria do projeto | Classificação | Regras **[PROPOSTA]** |
|---|---|---|
| Pessoal | `PERSONAL` | Sem restrições adicionais |
| Produto Próprio | `PERSONAL` (propriedade da Dev Annalu) | Sem restrições adicionais |
| Cliente | `CLIENT` | Dados pessoais de contatos limitados ao necessário; exclusão de cliente remove contatos (LGPD) |
| Trabalho Profissional | `EMPLOYER` | Aviso permanente no projeto: "Registre apenas informações que você está autorizada a manter fora dos sistemas do empregador."; opção de ocultar do Dashboard e de relatórios; não permite vínculo com repositório GitHub por padrão |

Ver Q6 sobre o que é permitido registrar em projetos de trabalho profissional.

## 11. Requisitos não funcionais

| ID | Categoria | Requisito |
|---|---|---|
| RNF-01 | Segurança | Autenticação e autorização no backend; nenhuma chave/token no bundle do frontend; segredos fora do Git **[DIRETRIZ]** |
| RNF-02 | Segurança | Senhas com Argon2id; sessão por cookie `HttpOnly`, `Secure`, `SameSite`; proteção CSRF; limitação de taxa **[PROPOSTA]** |
| RNF-03 | Privacidade | Tratamento consciente da LGPD; sem dados sensíveis em logs **[DIRETRIZ]** |
| RNF-04 | Integridade | Nenhuma perda silenciosa de dados; controle de concorrência otimista em notas, escopo e tarefas **[DIRETRIZ]** |
| RNF-05 | Disponibilidade | Backup automático diário do banco, retenção de 30 dias, teste de restauração mensal **[PROPOSTA]** |
| RNF-06 | Desempenho | p95 de resposta da API < 300 ms para leituras comuns; Dashboard carregado em < 1,5 s **[PROPOSTA]** |
| RNF-07 | Escala | Funcionar com folga com 500 projetos, 20.000 tarefas, 5.000 notas e 50 GB de arquivos **[PROPOSTA]** |
| RNF-08 | Acessibilidade | Meta WCAG 2.2 AA: contraste, foco visível, navegação por teclado, leitores de tela **[DIRETRIZ]** |
| RNF-09 | Responsividade | Desktop-first, totalmente utilizável a partir de 360 px de largura **[PROPOSTA]** |
| RNF-10 | Manutenibilidade | TypeScript estrito, monólito modular, testes automatizados, migrações versionadas **[DIRETRIZ]** |
| RNF-11 | Observabilidade | Logs estruturados, rastreamento de erros, health checks **[DIRETRIZ]** |
| RNF-12 | Localização | pt-BR, datas `dd/mm/aaaa`, hora 24 h, moeda BRL (`R$ 1.234,56`) **[DIRETRIZ]** |

## 12. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Escopo do MVP grande para uma pessoa | Atraso, MVP nunca "pronto" | Entregar por marcos utilizáveis (ver doc 09); usar o sistema desde o marco M3 |
| Editor rich text com perda de dados | Alto | Tiptap com JSON versionado, rascunho local, versionamento otimista, testes de integridade |
| Uploads maliciosos | Médio (owner única reduz risco) | Validação por assinatura de arquivo, lista de tipos permitidos, sem renderização inline de SVG/HTML, antivírus antes de habilitar uploads de terceiros |
| Dados confidenciais do empregador | Alto (jurídico) | Classificação `EMPLOYER`, avisos, sem integração GitHub por padrão, Q6 |
| Over-engineering para "SaaS futuro" | Médio | YAGNI: workspace no modelo de dados, nada de UI multi-tenant |
| Dependência de serviços externos (storage, hosting) | Médio | Interfaces finas (S3 API padrão), Docker, backups fora do provedor principal |

## 13. Questões abertas relacionadas

Ver lista completa em [decisoes/registro-de-decisoes.md](decisoes/registro-de-decisoes.md#questões-abertas). As mais importantes para este documento: Q1 (nome), Q5 (autenticação), Q6 (trabalho profissional), Q7 (modelo de progresso), Q12 (lembretes), Q17 (tarefas avulsas).
