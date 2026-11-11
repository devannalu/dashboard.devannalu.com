import {
  clientInputSchema,
  clientUpdateSchema,
  eventInputSchema,
  eventUpdateSchema,
  ideaInputSchema,
  ideaUpdateSchema,
  milestoneInputSchema,
  milestoneUpdateSchema,
  noteInputSchema,
  noteUpdateSchema,
  projectInputSchema,
  projectUpdateSchema,
  taskInputSchema,
  taskUpdateSchema,
} from '@studio/contracts';
import type { PrismaService } from '../database/prisma.service.js';
import type { WorkspaceScope } from '../workspaces/workspace-scope.js';
import { AppException } from '../common/problem.filter.js';
import { crudController, type Row } from './crud.js';

const projectRef = { select: { id: true, name: true } } as const;

/** Progresso por tarefas (ADR-009): concluídas / total. Sem tarefas → `percent: null` ("Sem tarefas"). */
export async function withProgress(prisma: PrismaService, scope: WorkspaceScope, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return rows;
  const groups = await prisma.db.task.groupBy({
    by: ['projectId', 'status'],
    where: { workspaceId: scope.workspaceId, projectId: { in: rows.map((r) => r.id) } },
    _count: { _all: true },
  });
  return rows.map((r) => {
    const mine = groups.filter((g) => g.projectId === r.id);
    const total = mine.reduce((s, g) => s + g._count._all, 0);
    const done = mine.filter((g) => g.status === 'DONE').reduce((s, g) => s + g._count._all, 0);
    return { ...r, progress: { done, total, percent: total === 0 ? null : Math.round((done / total) * 100) } };
  });
}

export const ClientsController = crudController({
  path: 'clients',
  model: 'client',
  label: 'Cliente',
  create: clientInputSchema,
  update: clientUpdateSchema,
  search: ['name', 'company', 'email'],
  orderBy: { name: 'asc' },
  include: { _count: { select: { projects: true } } },
});

export const ProjectsController = crudController({
  path: 'projects',
  model: 'project',
  label: 'Projeto',
  create: projectInputSchema,
  update: projectUpdateSchema,
  filters: ['status', 'category', 'clientId', 'priority'],
  search: ['name', 'description'],
  orderBy: [{ updatedAt: 'desc' }],
  include: { client: projectRef },
  refs: { clientId: 'client' },
  dateFields: ['startDate', 'dueDate'],
  decorate: withProgress,
});

export const MilestonesController = crudController({
  path: 'milestones',
  model: 'milestone',
  label: 'Marco',
  create: milestoneInputSchema,
  update: milestoneUpdateSchema,
  filters: ['projectId'],
  search: ['title'],
  orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
  include: { project: projectRef },
  refs: { projectId: 'project' },
  dateFields: ['dueDate'],
  transform: ({ completed, ...data }, current) => {
    if (completed === true) data.completedAt = current?.completedAt ?? new Date();
    if (completed === false) data.completedAt = null;
    return data;
  },
});

export const TasksController = crudController({
  path: 'tasks',
  model: 'task',
  label: 'Tarefa',
  create: taskInputSchema,
  update: taskUpdateSchema,
  filters: ['status', 'projectId', 'milestoneId', 'priority'],
  search: ['title', 'description'],
  orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
  include: { project: projectRef },
  refs: { projectId: 'project', milestoneId: 'milestone' },
  dateFields: ['dueDate'],
  where: (q) => (q.open === 'true' ? { status: { not: 'DONE' } } : {}),
  transform: (data, current) => {
    // `completedAt` acompanha o status: entra ao concluir, sai ao reabrir.
    if (data.status === 'DONE') data.completedAt = current?.completedAt ?? new Date();
    else if (typeof data.status === 'string') data.completedAt = null;
    if (data.position === undefined && !current) data.position = Date.now() / 1000;
    return data;
  },
});

export const EventsController = crudController({
  path: 'events',
  model: 'event',
  label: 'Evento',
  create: eventInputSchema,
  update: eventUpdateSchema,
  filters: ['projectId'],
  search: ['title', 'location'],
  orderBy: { startsAt: 'asc' },
  include: { project: projectRef },
  refs: { projectId: 'project' },
  dateTimeFields: ['startsAt', 'endsAt'],
});

export const NotesController = crudController({
  path: 'notes',
  model: 'note',
  label: 'Nota',
  create: noteInputSchema,
  update: noteUpdateSchema,
  filters: ['projectId', 'ideaId'],
  search: ['title', 'content'],
  orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
  include: { project: projectRef, idea: { select: { id: true, title: true } } },
  refs: { projectId: 'project', ideaId: 'idea' },
  versioned: true,
  where: (q) => {
    const w: Record<string, unknown> = { archivedAt: q.archived === 'true' ? { not: null } : null };
    if (q.inbox === 'true') Object.assign(w, { projectId: null, ideaId: null });
    return w;
  },
  transform: ({ archived, ...data }) => {
    if (archived === true) data.archivedAt = new Date();
    if (archived === false) data.archivedAt = null;
    return data;
  },
});

export const IdeasController = crudController({
  path: 'ideas',
  model: 'idea',
  label: 'Ideia',
  create: ideaInputSchema,
  update: ideaUpdateSchema,
  filters: ['status'],
  search: ['title', 'description'],
  orderBy: { updatedAt: 'desc' },
  include: { _count: { select: { notes: true } } },
  transform: (data, current) => {
    if (current?.status === 'CONVERTED') throw new AppException(409, 'IDEA_ALREADY_CONVERTED', 'Esta ideia virou projeto e agora é somente leitura.');
    return data;
  },
});
