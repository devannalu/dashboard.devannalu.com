# Registro de Decisões

> Atualizado em 10/11/2026 · Fase 0
> Formato: decisões com status explícito. Quando uma proposta é aprovada, mudar para **APROVADO em dd/mm/aaaa** e registrar quem aprovou.

## 1. Diretrizes do owner (definidas no Master Prompt)

Tratadas como aprovadas. Mudanças exigem decisão explícita da owner.

| ID | Diretriz |
|---|---|
| D-01 | Toda comunicação, documentação, comentários de código e interface em pt-BR; datas no formato brasileiro; suporte a BRL |
| D-02 | Identidade visual Cherry Atelier: paleta oficial (Deep Wine, Cherry, Muted Berry, Soft Blush, Warm Cream, Espresso), Cormorant Garamond + Manrope, ícones Lucide, temas claro e escuro |
| D-03 | Stack baseline: Next.js, React, TypeScript, Tailwind, shadcn/ui, NestJS, REST, MySQL, Prisma, Docker (sujeita a validação — validada no doc 05, sem alterações) |
| D-04 | Arquitetura em monólito modular; sem microsserviços prematuros |
| D-05 | Usuária única no MVP, com modelo de dados preparado para workspaces, membros e papéis; sem UI multi-tenant no MVP |
| D-06 | Integração GitHub via GitHub App, inicialmente somente leitura, na Fase 1.1 |
| D-07 | Commits nunca determinam progresso; PR mesclado não conclui projeto |
| D-08 | Arquivos em storage privado compatível com S3; metadados no MySQL; URLs assinadas |
| D-09 | Nenhum dado fictício apresentado como real |
| D-10 | Categorias de projeto (Pessoal, Produto Próprio, Cliente, Trabalho Profissional), status de projeto (6) e de tarefa (5) conforme Master Prompt |
| D-11 | Fases do roadmap (0, 1, 1.1, 2, 3) |
| D-12 | Financeiro, propostas, contratos e controle de tempo fora do MVP |
| D-13 | (10/11/2026) Camada de colagem com adesivos translúcidos no fundo do Dashboard, estética it girl / anos 2000 alternativa, usando as referências enviadas pela owner. As regras de uso (doc 04 §11) ainda são proposta |
| D-14 | (10/11/2026) Nome oficial: **Annalu Studio OS**, empresa **Dev Annalu** (com dois "n") |
| ~~D-15~~ | ~~Domínio dashboard.devannalu.com~~ — **substituída por D-30** |
| D-16 | (10/11/2026) Acento principal em **bordô** no lugar do Cherry. A paleta anterior foi considerada ruim de visualizar |
| D-17 | (10/11/2026) **Efeito glass** nos cards e barras para deixar a colagem visível (substitui "evitar glass" nas telas com colagem) |
| D-18 | (10/11/2026) Cormorant Garamond e Manrope foram **reprovadas**. Nova tipografia mistura grotesca pesada, script e mono (referências: Onehart, coture studio, Cherry Bomb) |
| D-20 | (10/11/2026) **Tipografia aprovada:** grotesca pesada e apertada (títulos e números) + **script floreado para detalhes** (logo, nome, destaques) + mono (rótulos). Na prévia: Archivo 900 + Monsieur La Doulaise + Space Mono |
| D-21 | (10/11/2026) **Menu lateral bordô sólido e recolhível** (abre e fecha; vira gaveta no celular). Logo: cereja 8-ball + "Annalu" floreado + "studio os" |
| D-22 | (10/11/2026) **Tema claro/escuro e intensidade da colagem são escolhas da usuária**, acessíveis na barra superior e salvas no perfil |
| D-23 | (10/11/2026) **Check de tarefa em forma de cereja** |
| D-24 | (10/11/2026) **Perfil personalizável com criador de avatar.** O avatar vira a foto de perfil e o **pet do Dashboard**, no estilo tamagotchi. Mecânica do pet ainda é proposta (doc 03 §9) |
| D-25 | (10/11/2026) **Pet 3D estilo tamagotchi** que precisa ser alimentado diariamente. As comidas são ganhas com ações reais: tarefa concluída, ideia nova, marco de projeto, projeto concluído e sequência de dias alimentando |
| D-26 | (10/11/2026) **Avatar ampliado:** formato do corpo (ampulheta, triângulo, triângulo invertido, retângulo, oval) e silhueta (magra, média, gordinha); mais cabelos (incluindo cacheado longo e black power), franjas e mechas; roupas com cor escolhível; meias, sapatos e joias em prata ou dourado |
| D-27 | (10/11/2026) **Pet sem comer:** com saciedade em 0, fica "fraquinha" e dormindo. **Nunca morre e nunca perde nível, XP, comidas ou personalização.** Uma refeição qualquer a acorda e ela volta ao normal. A sequência de dias alimentando zera, como em qualquer sequência |
| D-28 | (10/11/2026) **Pet 3D refeito no Blender** (script `design/blender/boneca.py`, renders em `design/blender/saida/`). Rodada 8 concluída; **pausado a pedido da owner** para priorizar a aplicação. Retomar antes do épico E19 |
| D-29 | (10/11/2026) **Versões adotadas no M1** (validação da stack, D-03): Next.js 16.4, React 19.3, NestJS 12 (ESM, validação nativa com Zod), Prisma 7.10 com adaptador `@prisma/adapter-mariadb` (MySQL), TypeScript 6, Zod 4, pnpm 12, Turborepo 2, Vitest 4. O Prisma 8 (release candidate) foi evitado por não ser estável |
| D-30 | (10/11/2026) **Domínio de produção: annalustudio.devannalu.com** (decisão da owner no deploy). Hospedagem: VPS própria com Coolify (responde à Q3) |
| D-19 | (10/11/2026) **Login só com e-mail e senha**, sem 2FA no MVP. A conta da owner é pré-configurada pelo e-mail (variável `OWNER_EMAIL`, fora do repositório) e a senha é definida no primeiro acesso. Substitui ADR-014 |

## 2. Propostas aguardando aprovação (ADRs resumidos)

| ID | Decisão proposta | Alternativas consideradas | Motivo | Doc |
|---|---|---|---|---|
| ADR-001 | Monorepo pnpm + Turborepo com `packages/contracts` (Zod compartilhado) | Repositórios separados; Nx | Contratos tipados de ponta a ponta com baixa complexidade | 05 §3 |
| ADR-002 | Web e API na mesma origem via proxy (`/api/*` → Nest) | Subdomínio `api.` com CORS | Cookie `__Host-`, CSRF mais simples, sem CORS | 05 §2 |
| ADR-003 | Sessão por cookie opaco com hash no banco (não JWT) | JWT em cookie; Auth.js/NextAuth | Revogação imediata, menos superfície; backend é dono da autenticação | 05 §8 |
| ADR-004 | Fila de jobs no MySQL (`SKIP LOCKED`), sem Redis no MVP | BullMQ + Redis | Um serviço a menos para operar; volume baixo | 05 §9 |
| ADR-005 | Upload passando pela API (streaming), não direto ao S3 | URLs pré-assinadas de PUT | Validação síncrona do conteúdo antes de aceitar | 05 §7 |
| ADR-006 | Editor Tiptap com conteúdo em JSON + `plainText` extraído | Markdown puro; HTML sanitizado; BlockNote | Estrutura segura (sem HTML bruto), busca, migração de formato | 05 §4, 06 |
| ADR-007 | IDs `cuid()` + slug apenas em projetos | Autoincremento; UUID v7 | Não enumeráveis, suporte nativo no Prisma | 06 §1 |
| ADR-008 | `workspaceId` explícito na URL da API | Workspace ativo na sessão | Sem ambiguidade entre abas; pronto para multi-workspace | 05 §5 |
| ADR-009 | Modelo de progresso por tarefas de nível superior; "Sem tarefas" quando vazio | Ponderado por marcos; manual | Automático, sem manutenção de pesos | 01 §9 |
| ADR-010 | Revisões de escopo a cada salvamento explícito, imutáveis | Revisão por autosave; revisão só ao "publicar" | Rastreabilidade sem ruído | 03 §3 |
| ADR-011 | Vínculos de arquivo com FKs explícitas + `CHECK` (não polimórfico) | `entityType/entityId` | Integridade referencial real | 06 §3.9 |
| ADR-012 | Erro semântico "perigo" em tijolo alaranjado `#9B2F14`, distinto do Cherry | Vermelho padrão | Não confundir erro com ação primária | 04 §2.4 |
| ADR-013 | Hospedagem em VPS com Docker Compose + Caddy; storage R2/B2 | Vercel + banco gerenciado; Kubernetes | Custo baixo, controle, simplicidade | 05 §12 |
| ~~ADR-014~~ | ~~2FA TOTP desde o MVP~~. **Substituída por D-19** (só e-mail e senha). TOTP ou passkey ficam como opção futura | — | — | 05 §8 |
| ADR-015 | Calendário como projeção (consulta unificada), sem copiar datas para tabela de eventos | Tabela única de eventos sincronizada | Elimina duplicação e inconsistência | 02 §5 |
| ADR-016 | Testes com Vitest (front e back), Testcontainers MySQL, Playwright | Jest no Nest | Uma ferramenta só; testes de integração com banco real | 05 §13 |

## 3. Premissas

| ID | Premissa |
|---|---|
| P-01 | Uso principal em desktop; celular para consultas e captura rápida |
| P-02 | Volume de referência: até 500 projetos, 20.000 tarefas, 5.000 notas, 50 GB de arquivos |
| P-03 | Fuso horário padrão America/Sao_Paulo |
| P-04 | A owner tem acesso de administrador às contas GitHub cujos repositórios serão conectados |
| P-05 | Não há exigência legal de manter dados em território brasileiro |
| P-06 | Não existe hoje um logo oficial da Dev Annalu em formato vetorial (a confirmar em Q14) |

## Questões abertas

Prioridade: 🔴 bloqueia o início do desenvolvimento · 🟡 bloqueia um marco específico · ⚪ pode esperar.

| ID | Pri. | Questão | Proposta do agente |
|---|---|---|---|
| ~~Q1~~ | ✅ | Nome oficial | **Respondida em 10/11/2026:** "Annalu" (Annalu Studio OS / Dev Annalu) → D-14 |
| ~~Q2~~ | ✅ | Domínio de produção | **Respondida em 10/11/2026:** `annalustudio.devannalu.com` → D-30 |
| Q3 | 🟡 M10 | Preferência de hospedagem e orçamento mensal? Dados devem ficar no Brasil? | VPS com Docker (aprox. R$ 30–100/mês) + R2/B2 |
| Q4 | 🟡 M7 | Provedor de storage: Cloudflare R2, Backblaze B2, AWS S3 ou outro? | Cloudflare R2 |
| ~~Q5~~ | ✅ | Método de login | **Respondida em 10/11/2026:** só e-mail e senha → D-19 |
| Q6 | 🟡 M3 | Projetos de Trabalho Profissional: há restrições do empregador sobre o que pode ser registrado? Devem ficar ocultos do Dashboard por padrão? | Aviso permanente, ocultação opcional, sem GitHub por padrão |
| Q7 | 🟡 M3 | O modelo de progresso (ADR-009) atende? | Sim |
| Q8 | 🟡 M3 | Escopo: salvar explicitamente com revisão (proposto) ou salvamento automático como nas notas? | Salvamento explícito |
| Q9 | 🟡 M7 | Tamanho máximo e tipos de arquivo (vídeos são necessários?) | Tabela do doc 05 §7; sem vídeo no MVP |
| Q10 | ⚪ | Ao desconectar o GitHub, manter ou apagar os dados espelhados? | Manter marcados como "desconectado", com botão para apagar |
| Q11 | ⚪ | Issue fechada no GitHub: só sugerir ou concluir a tarefa automaticamente? | Só sugerir |
| Q12 | 🟡 M5 | Lembretes só dentro do app no MVP? Precisa de e-mail ou notificação do navegador? | Dentro do app + notificação do navegador (P2) |
| Q13 | ⚪ | Tema padrão: seguir o sistema operacional? | Sim |
| Q14 | 🟡 M2 | Existe logo/monograma da Dev Annalu? | Se não, criar monograma "A" com talo de cereja |
| Q15 | ⚪ | Colocar em produção mais cedo (fim do M4) para uso real antecipado? | Sim, recomendado |
| Q16 | 🟡 M11 | Os repositórios ficam em conta pessoal, organização ou ambos? | Instalação suportando ambos |
| Q17 | 🟡 M4 | Permitir tarefas avulsas, sem projeto (ex.: tarefas administrativas da empresa)? | Sim |
| Q18 | ⚪ | Status "Ideia" em projetos coexiste com o Idea Lab. Manter os dois? | Manter (diretriz), orientando o Idea Lab para ideias ainda não estruturadas |
| Q19 | ⚪ | Início da semana no calendário: domingo ou segunda? | Domingo, configurável |
| Q20 | ⚪ | Algumas imagens da colagem parecem ser de terceiros (designer toy, arte do leopardo, kanji estilizado). Manter só para uso pessoal? | Sim no uso privado; trocar por arte própria ou licenciada antes de qualquer uso comercial |
| ~~Q24~~ | ✅ | Mecânica do pet | **Respondida em 10/11/2026:** tamagotchi com **alimentação diária**; as comidas são liberadas por tarefas concluídas, ideias novas e avanço de projetos → D-25 |
| ~~Q26~~ | ✅ | Pet sem comer por dias | **Respondida em 10/11/2026:** aprovada a proposta → D-27 |
| Q27 | ⚪ | O nível do pet deve liberar roupas e acessórios novos para o avatar? | Sim, na Fase 3 (liga com a Q25) |
| Q25 | ⚪ | O avatar deve ter só o rosto e o corpo atuais, ou crescer depois com roupas e itens desbloqueáveis por nível? | Itens desbloqueáveis por nível na Fase 3 |
| Q28 | 🟡 M7 | A imagem pública do MinIO foi descontinuada. Qual armazenamento S3 usar em desenvolvimento local? | SeaweedFS ou Garage (compatíveis com S3, código aberto). Decidir no épico de arquivos (E11). Em produção segue a Q4 (R2/B2) |
| Q22 | 🟡 M2 | Qual é o tom exato de bordô? A imagem de referência enviada chegou vazia (arquivo transparente). | Usando `#7E1414`, tirado das estrelas da colagem, até a owner reenviar |
| Q23 | ⚪ | Licenciar fontes pagas (Onehart ou similar) ou ficar com as gratuitas do Google Fonts? | Decidir depois de aprovar a mistura na prévia |
| Q21 | 🟡 M9 | A colagem aparece só no Dashboard e nas telas de respiro, ou também em outras telas? | Só Dashboard, estados vazios e login |

## 4. Histórico

| Data | Evento |
|---|---|
| 10/11/2026 | Criação da documentação da Fase 0 (docs 01–09 e este registro). Nenhuma proposta aprovada ainda. |
| 10/11/2026 | Owner confirmou o nome "Annalu" (D-14) e o domínio dashboard.devannalu.com (D-15). |
| 10/11/2026 | Owner reprovou cor, fonte e fundo da prévia v1. Decidiu: bordô (D-16), glass (D-17), nova tipografia (D-18), login só com e-mail e senha (D-19). Prévia v3 publicada com 14 adesivos. |
| 10/11/2026 | Owner aprovou a mistura de fontes com floreado (D-20); pediu menu bordô recolhível (D-21), tema e colagem escolhíveis (D-22), check de cereja (D-23) e perfil com avatar e pet (D-24). Prévia v4 publicada com as telas Início e Perfil. |
| 10/11/2026 | Owner respondeu a Q24 (alimentação diária) e pediu pet 3D, mais opções de avatar e tipos de corpo (D-25, D-26). Prévia v5 publicada: pet em Three.js, lancheira com 5 comidas e olho sonolento e tranças corrigidos. |
| 10/11/2026 | Owner aprovou o estado "fraquinha" para pet sem comer (D-27); estado incluído na prévia. |
| 10/11/2026 | Pet 3D migrado para o Blender e pausado (D-28). Início do M1: monorepo, web, API, contratos, Prisma, Docker Compose e CI (D-29). |
| 10/11/2026 | Deploy no Coolify (VPS própria): MySQL 8.4 e API no ar com migração aplicada. Domínio trocado para annalustudio.devannalu.com (D-30). |
| 10/11/2026 | Épico E0 concluído: migração inicial aplicada, fila de jobs com testes de integração em MySQL real, worker, CI com MySQL. MySQL local na porta 3307 (3306 e 3310 ocupadas por outros projetos). MinIO removido do compose (Q28). |
| 10/11/2026 | Owner pediu a camada de colagem (D-13). Adesivos gerados e prévia do Dashboard publicada para aprovação visual. |
