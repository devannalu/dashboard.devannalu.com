import { z } from 'zod';
import { prioritySchema, projectCategorySchema, projectStatusSchema, taskStatusSchema } from './enums.js';

/**
 * Contratos dos módulos do MVP (D-35): entradas validadas na API e tipos das respostas.
 * Campos opcionais aceitam `null` para limpar o valor; texto vazio vira `null`.
 */
const blankToNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);
const optText = (max: number) => z.preprocess(blankToNull, z.string().trim().max(max).nullable().optional());
const reqText = (max: number, msg = 'Campo obrigatório.') => z.string().trim().min(1, msg).max(max);
/** Data sem hora: `aaaa-mm-dd`. */
export const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.');
const optDate = z.preprocess(blankToNull, dateOnlySchema.nullable().optional());
const optId = z.preprocess(blankToNull, z.string().min(1).max(32).nullable().optional());
const isoDateTime = z.iso.datetime({ offset: true, message: 'Data e hora inválidas.' });

export const ideaStatusSchema = z.enum(['NEW', 'EXPLORING', 'VALIDATED', 'DISCARDED', 'CONVERTED']);
export type IdeaStatus = z.infer<typeof ideaStatusSchema>;
export const ideaStatusLabel: Record<IdeaStatus, string> = {
  NEW: 'Nova',
  EXPLORING: 'Explorando',
  VALIDATED: 'Validada',
  DISCARDED: 'Descartada',
  CONVERTED: 'Virou projeto',
};

// ---------- Clientes ----------
export const clientInputSchema = z.object({
  name: reqText(160, 'Informe o nome.'),
  company: optText(160),
  email: z.preprocess(blankToNull, z.email('E-mail inválido.').max(254).nullable().optional()),
  phone: optText(40),
  notes: optText(20_000),
});
export const clientUpdateSchema = clientInputSchema.partial();

// ---------- Projetos ----------
export const projectInputSchema = z.object({
  name: reqText(160, 'Informe o nome do projeto.'),
  description: optText(20_000),
  category: projectCategorySchema.default('PERSONAL'),
  status: projectStatusSchema.default('PLANNING'),
  priority: prioritySchema.default('MEDIUM'),
  startDate: optDate,
  dueDate: optDate,
  clientId: optId,
});
export const projectUpdateSchema = z.object({
  name: reqText(160, 'Informe o nome do projeto.').optional(),
  description: optText(20_000),
  category: projectCategorySchema.optional(),
  status: projectStatusSchema.optional(),
  priority: prioritySchema.optional(),
  startDate: optDate,
  dueDate: optDate,
  clientId: optId,
});

// ---------- Marcos ----------
export const milestoneInputSchema = z.object({
  projectId: z.string().min(1).max(32),
  title: reqText(200, 'Informe o título do marco.'),
  dueDate: optDate,
  isDelivery: z.boolean().default(false),
  completed: z.boolean().optional(),
});
export const milestoneUpdateSchema = milestoneInputSchema.omit({ projectId: true }).partial().extend({ isDelivery: z.boolean().optional() });

// ---------- Tarefas ----------
export const taskInputSchema = z.object({
  title: reqText(300, 'Informe o título da tarefa.'),
  description: optText(20_000),
  status: taskStatusSchema.default('TODO'),
  priority: prioritySchema.default('MEDIUM'),
  dueDate: optDate,
  projectId: optId,
  milestoneId: optId,
  position: z.number().finite().optional(),
});
export const taskUpdateSchema = z.object({
  title: reqText(300, 'Informe o título da tarefa.').optional(),
  description: optText(20_000),
  status: taskStatusSchema.optional(),
  priority: prioritySchema.optional(),
  dueDate: optDate,
  projectId: optId,
  milestoneId: optId,
  position: z.number().finite().optional(),
});

// ---------- Eventos ----------
export const eventInputSchema = z
  .object({
    title: reqText(200, 'Informe o título do evento.'),
    startsAt: isoDateTime,
    endsAt: z.preprocess(blankToNull, isoDateTime.nullable().optional()),
    allDay: z.boolean().default(false),
    location: optText(200),
    notes: optText(20_000),
    projectId: optId,
  })
  .refine((e) => !e.endsAt || e.endsAt >= e.startsAt, { message: 'O fim precisa ser depois do início.', path: ['endsAt'] });
export const eventUpdateSchema = z.object({
  title: reqText(200).optional(),
  startsAt: isoDateTime.optional(),
  endsAt: z.preprocess(blankToNull, isoDateTime.nullable().optional()),
  allDay: z.boolean().optional(),
  location: optText(200),
  notes: optText(20_000),
  projectId: optId,
});

// ---------- Notas ----------
export const noteInputSchema = z.object({
  title: z.string().trim().max(200).default(''),
  content: z.string().max(1_000_000).default(''),
  projectId: optId,
  ideaId: optId,
  pinned: z.boolean().default(false),
});
export const noteUpdateSchema = z.object({
  title: z.string().trim().max(200).optional(),
  content: z.string().max(1_000_000).optional(),
  projectId: optId,
  ideaId: optId,
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
  /** Versão que a interface tinha; se o banco estiver em outra, responde 409. */
  version: z.number().int().min(1).optional(),
});

// ---------- Ideias ----------
export const ideaInputSchema = z.object({
  title: reqText(200, 'Dê um título para a ideia.'),
  description: optText(20_000),
  status: ideaStatusSchema.exclude(['CONVERTED']).default('NEW'),
});
export const ideaUpdateSchema = z.object({
  title: reqText(200).optional(),
  description: optText(20_000),
  status: ideaStatusSchema.exclude(['CONVERTED']).optional(),
});
export const ideaConvertSchema = z.object({
  name: reqText(160).optional(),
  category: projectCategorySchema.default('OWNED_PRODUCT'),
});

// ---------- Tipos de resposta ----------
type Ref = { id: string; name: string } | null;
export interface ClientDto { id: string; name: string; company: string | null; email: string | null; phone: string | null; notes: string | null; createdAt: string; updatedAt: string; _count?: { projects: number } }
export interface ProjectDto {
  id: string; name: string; description: string | null;
  category: z.infer<typeof projectCategorySchema>; status: z.infer<typeof projectStatusSchema>; priority: z.infer<typeof prioritySchema>;
  startDate: string | null; dueDate: string | null; clientId: string | null; client?: Ref;
  createdAt: string; updatedAt: string;
  /** Progresso por tarefas (ADR-009): concluídas / total; `null` = sem tarefas. */
  progress?: { done: number; total: number; percent: number | null };
}
export interface MilestoneDto { id: string; projectId: string; title: string; dueDate: string | null; isDelivery: boolean; completedAt: string | null; project?: { id: string; name: string } }
export interface TaskDto {
  id: string; title: string; description: string | null; status: z.infer<typeof taskStatusSchema>; priority: z.infer<typeof prioritySchema>;
  dueDate: string | null; projectId: string | null; milestoneId: string | null; position: number; completedAt: string | null;
  project?: { id: string; name: string } | null; createdAt: string; updatedAt: string;
}
export interface EventDto { id: string; title: string; startsAt: string; endsAt: string | null; allDay: boolean; location: string | null; notes: string | null; projectId: string | null; project?: { id: string; name: string } | null }
export interface NoteDto { id: string; title: string; content: string; projectId: string | null; ideaId: string | null; pinned: boolean; archivedAt: string | null; version: number; createdAt: string; updatedAt: string; project?: { id: string; name: string } | null; idea?: { id: string; title: string } | null }
export interface IdeaDto { id: string; title: string; description: string | null; status: IdeaStatus; convertedProjectId: string | null; createdAt: string; updatedAt: string; _count?: { notes: number } }
export interface FileDto { id: string; name: string; mimeType: string; size: number; projectId: string | null; createdAt: string; project?: { id: string; name: string } | null }

export interface CalendarItem {
  kind: 'task' | 'milestone' | 'event' | 'project';
  id: string;
  title: string;
  /** `aaaa-mm-dd` para tarefas/marcos/projetos; ISO com hora para eventos. */
  date: string;
  allDay: boolean;
  done: boolean;
  isDelivery?: boolean;
  /** Só em `project`: início ou prazo de entrega do projeto. */
  edge?: 'start' | 'due';
  project?: { id: string; name: string } | null;
}

export interface SearchResult { kind: 'project' | 'task' | 'note' | 'idea' | 'client' | 'file'; id: string; title: string; subtitle?: string }

export interface DashboardDto {
  today: string;
  counts: { activeProjects: number; openTasks: number; overdueTasks: number; dueToday: number; ideas: number; inboxNotes: number };
  last7Days: { tasksCompleted: number; tasksCreated: number; notesWritten: number; ideasCaptured: number };
  todayTasks: TaskDto[];
  overdueTasks: TaskDto[];
  upcoming: CalendarItem[];
  activeProjects: ProjectDto[];
  recentNotes: NoteDto[];
}

export interface ReportsDto {
  projectsByStatus: Record<string, number>;
  projectsByCategory: Record<string, number>;
  tasksByStatus: Record<string, number>;
  completedPerWeek: { weekStart: string; count: number }[];
  overdueTasks: number;
  milestones: { total: number; completed: number; overdue: number };
  /** Entregas concluídas no prazo / entregas concluídas com data. `null` = dados insuficientes. */
  onTimeDelivery: { onTime: number; total: number; percent: number | null };
}

// ---------- Início personalizável (widgets) ----------
export const widgetIdSchema = z.enum(['hoje', 'atividade', 'calendario', 'projetos', 'kpi7', 'agora', 'captura', 'notas']);
export type WidgetId = z.infer<typeof widgetIdSchema>;
export const widgetSizeSchema = z.enum(['sm', 'md', 'lg', 'full']);
export type WidgetSize = z.infer<typeof widgetSizeSchema>;

/** Tipos de atividade que o gráfico estilo GitHub pode contar. */
export const activityKindSchema = z.enum(['tasksCompleted', 'tasksCreated', 'notesCreated', 'ideasCreated', 'projectsCreated', 'milestonesCompleted', 'eventsCreated']);
export type ActivityKind = z.infer<typeof activityKindSchema>;
export const activityKindLabel: Record<ActivityKind, string> = {
  tasksCompleted: 'Tarefas concluídas',
  tasksCreated: 'Tarefas criadas',
  notesCreated: 'Notas escritas',
  ideasCreated: 'Ideias capturadas',
  projectsCreated: 'Projetos criados',
  milestonesCompleted: 'Marcos concluídos',
  eventsCreated: 'Eventos criados',
};

export const widgetConfigSchema = z
  .object({
    /** Gráfico de atividade: o que entra na contagem e quantos meses mostrar. */
    /** De onde vêm os quadradinhos: contribuições do GitHub (padrão) ou atividade no Studio. */
    source: z.enum(['github', 'studio']).optional(),
    kinds: z.array(activityKindSchema).min(1).max(7).optional(),
    months: z.union([z.literal(3), z.literal(6), z.literal(12)]).optional(),
  })
  .strict();

export const dashboardLayoutSchema = z.object({
  widgets: z
    .array(z.object({ id: widgetIdSchema, size: widgetSizeSchema, hidden: z.boolean(), config: widgetConfigSchema.optional() }))
    .max(20)
    .refine((w) => new Set(w.map((x) => x.id)).size === w.length, 'Widget repetido.'),
});
export type DashboardLayout = z.infer<typeof dashboardLayoutSchema>;

export interface ActivityDto {
  from: string;
  to: string;
  /** Só dias com alguma atividade: `{ date: 'aaaa-mm-dd', tasksCompleted: 2, ... }`. */
  days: ({ date: string } & Partial<Record<ActivityKind, number>>)[];
}

/** Calendário de contribuições do GitHub (o mesmo do perfil), para o gráfico do Início (D-37). */
export interface GithubContributionsDto {
  /** `false` quando o servidor ainda não tem GITHUB_TOKEN. */
  configured: boolean;
  login?: string;
  profileUrl?: string;
  total?: number;
  from?: string;
  to?: string;
  days?: { date: string; count: number }[];
}
