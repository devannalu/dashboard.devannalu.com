import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { activityKindSchema, type ActivityDto, type ActivityKind, type CalendarItem, type DashboardDto, type ReportsDto, type SearchResult } from '@studio/contracts';
import { Scope } from '../auth/decorators.js';
import { AppException } from '../common/problem.filter.js';
import { PrismaService } from '../database/prisma.service.js';
import { WorkspaceMemberGuard } from '../workspaces/workspace-member.guard.js';
import type { WorkspaceScope } from '../workspaces/workspace-scope.js';
import type { Row } from './crud.js';
import { withProgress } from './resources.js';

const DAY = 24 * 60 * 60 * 1000;
const projectRef = { select: { id: true, name: true } } as const;

/** "Hoje" no fuso da usuária (padrão America/Sao_Paulo), como `aaaa-mm-dd`. */
export function todayIn(timezone: string, now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
/** Deslocamento do fuso para o MySQL (`-03:00`), calculado para a data atual. */
export function tzOffset(timezone: string, now = new Date()): string {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'longOffset' }).formatToParts(now).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  const m = /GMT([+-]\d{2}):?(\d{2})?/.exec(name);
  return m ? `${m[1]}:${m[2] ?? '00'}` : '+00:00';
}
const utcDate = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);
const ymd = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Visões agregadas: Dashboard, Calendário, Relatórios e Busca.
 * Só números calculados de dados reais; sem dados, devolve zeros/listas vazias (nunca valores inventados).
 */
@Controller('workspaces/:workspaceId')
@UseGuards(WorkspaceMemberGuard)
export class InsightsController {
  constructor(private readonly prisma: PrismaService) {}

  private async today(scope: WorkspaceScope): Promise<Date> {
    const user = await this.prisma.db.user.findUnique({ where: { id: scope.userId }, select: { timezone: true } });
    return utcDate(todayIn(user?.timezone ?? 'America/Sao_Paulo'));
  }

  @Get('dashboard')
  async dashboard(@Scope() scope: WorkspaceScope): Promise<DashboardDto> {
    const ws = scope.workspaceId;
    const db = this.prisma.db;
    const today = await this.today(scope);
    const weekAgo = new Date(Date.now() - 7 * DAY);
    const open = { not: 'DONE' as const };

    const [activeProjects, openTasks, overdueCount, dueToday, ideas, inboxNotes, completed7, created7, notes7, ideas7, todayTasks, overdueTasks, projects, recentNotes, upcoming] =
      await Promise.all([
        db.project.count({ where: { workspaceId: ws, status: 'IN_PROGRESS' } }),
        db.task.count({ where: { workspaceId: ws, status: open } }),
        db.task.count({ where: { workspaceId: ws, status: open, dueDate: { lt: today } } }),
        db.task.count({ where: { workspaceId: ws, status: open, dueDate: today } }),
        db.idea.count({ where: { workspaceId: ws, status: { notIn: ['CONVERTED', 'DISCARDED'] } } }),
        db.note.count({ where: { workspaceId: ws, projectId: null, ideaId: null, archivedAt: null } }),
        db.task.count({ where: { workspaceId: ws, completedAt: { gte: weekAgo } } }),
        db.task.count({ where: { workspaceId: ws, createdAt: { gte: weekAgo } } }),
        db.note.count({ where: { workspaceId: ws, createdAt: { gte: weekAgo } } }),
        db.idea.count({ where: { workspaceId: ws, createdAt: { gte: weekAgo } } }),
        db.task.findMany({ where: { workspaceId: ws, dueDate: today }, include: { project: projectRef }, orderBy: [{ status: 'asc' }, { priority: 'desc' }], take: 30 }),
        db.task.findMany({ where: { workspaceId: ws, status: open, dueDate: { lt: today } }, include: { project: projectRef }, orderBy: { dueDate: 'asc' }, take: 15 }),
        db.project.findMany({ where: { workspaceId: ws, status: 'IN_PROGRESS' }, include: { client: projectRef }, orderBy: { updatedAt: 'desc' }, take: 6 }),
        db.note.findMany({ where: { workspaceId: ws, archivedAt: null }, include: { project: projectRef, idea: { select: { id: true, title: true } } }, orderBy: { updatedAt: 'desc' }, take: 5 }),
        this.items(scope, new Date(today.getTime() + DAY), new Date(today.getTime() + 15 * DAY), true),
      ]);

    return JSON.parse(
      JSON.stringify({
        today: ymd(today),
        counts: { activeProjects, openTasks, overdueTasks: overdueCount, dueToday, ideas, inboxNotes },
        last7Days: { tasksCompleted: completed7, tasksCreated: created7, notesWritten: notes7, ideasCaptured: ideas7 },
        todayTasks,
        overdueTasks,
        upcoming: upcoming.slice(0, 12),
        activeProjects: await withProgress(this.prisma, scope, projects as unknown as Row[]),
        recentNotes: recentNotes.map((n) => ({ ...n, content: n.content.slice(0, 280) })),
      }),
    ) as DashboardDto;
  }

  /** Itens de calendário no intervalo [from, to): tarefas e marcos com data, e eventos. Projeção, sem cópia (E8-1). */
  private async items(scope: WorkspaceScope, from: Date, to: Date, onlyOpen = false): Promise<CalendarItem[]> {
    const ws = scope.workspaceId;
    const inRange = { gte: from, lt: to };
    const [tasks, milestones, events, projects] = await Promise.all([
      this.prisma.db.task.findMany({ where: { workspaceId: ws, dueDate: { gte: from, lt: to }, ...(onlyOpen ? { status: { not: 'DONE' } } : {}) }, include: { project: projectRef } }),
      this.prisma.db.milestone.findMany({ where: { workspaceId: ws, dueDate: { gte: from, lt: to }, ...(onlyOpen ? { completedAt: null } : {}) }, include: { project: projectRef } }),
      this.prisma.db.event.findMany({ where: { workspaceId: ws, startsAt: { gte: new Date(from.getTime() - DAY), lt: new Date(to.getTime() + DAY) } }, include: { project: projectRef } }),
      // Início e prazo dos projetos (arquivados ficam de fora; em "só abertos", concluídos também).
      this.prisma.db.project.findMany({
        where: {
          workspaceId: ws,
          status: { notIn: onlyOpen ? ['ARCHIVED', 'COMPLETED'] : ['ARCHIVED'] },
          OR: [{ startDate: inRange }, { dueDate: inRange }],
        },
        select: { id: true, name: true, status: true, startDate: true, dueDate: true },
      }),
    ]);
    const inWindow = (d: Date | null): d is Date => !!d && d >= from && d < to;
    const projectItems: CalendarItem[] = projects.flatMap((p) => {
      const base = { kind: 'project' as const, id: p.id, title: p.name, allDay: true, done: p.status === 'COMPLETED', project: { id: p.id, name: p.name } };
      return [
        ...(inWindow(p.startDate) ? [{ ...base, date: ymd(p.startDate), edge: 'start' as const }] : []),
        ...(inWindow(p.dueDate) ? [{ ...base, date: ymd(p.dueDate), edge: 'due' as const }] : []),
      ];
    });
    const list: CalendarItem[] = [
      ...tasks.map((t) => ({ kind: 'task' as const, id: t.id, title: t.title, date: ymd(t.dueDate!), allDay: true, done: t.status === 'DONE', project: t.project })),
      ...milestones.map((m) => ({ kind: 'milestone' as const, id: m.id, title: m.title, date: ymd(m.dueDate!), allDay: true, done: !!m.completedAt, isDelivery: m.isDelivery, project: m.project })),
      ...events.map((e) => ({ kind: 'event' as const, id: e.id, title: e.title, date: e.startsAt.toISOString(), allDay: e.allDay, done: false, project: e.project })),
      ...projectItems,
    ];
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Atividade por dia (gráfico estilo GitHub). Conta só ações registradas no Studio, no fuso da usuária.
   * Atividade não é progresso: o progresso dos projetos continua vindo só das tarefas (ADR-009).
   */
  @Get('activity')
  async activity(@Scope() scope: WorkspaceScope, @Query('days') rawDays?: string): Promise<ActivityDto> {
    const days = Math.min(Math.max(Number(rawDays) || 365, 7), 371);
    const user = await this.prisma.db.user.findUnique({ where: { id: scope.userId }, select: { timezone: true } });
    const tz = user?.timezone ?? 'America/Sao_Paulo';
    const off = tzOffset(tz);
    const to = todayIn(tz);
    const from = ymd(new Date(utcDate(to).getTime() - (days - 1) * DAY));
    const since = new Date(utcDate(from).getTime() - DAY); // margem para o fuso; o filtro final é pela data local
    const ws = scope.workspaceId;
    const rows = await this.prisma.db.$queryRaw<{ d: Date | string; k: string; n: bigint | number }[]>`
      SELECT DATE(CONVERT_TZ(completedAt, '+00:00', ${off})) AS d, 'tasksCompleted' AS k, COUNT(*) AS n FROM Task WHERE workspaceId = ${ws} AND completedAt >= ${since} GROUP BY d
      UNION ALL SELECT DATE(CONVERT_TZ(createdAt, '+00:00', ${off})), 'tasksCreated', COUNT(*) FROM Task WHERE workspaceId = ${ws} AND createdAt >= ${since} GROUP BY 1
      UNION ALL SELECT DATE(CONVERT_TZ(createdAt, '+00:00', ${off})), 'notesCreated', COUNT(*) FROM Note WHERE workspaceId = ${ws} AND createdAt >= ${since} GROUP BY 1
      UNION ALL SELECT DATE(CONVERT_TZ(createdAt, '+00:00', ${off})), 'ideasCreated', COUNT(*) FROM Idea WHERE workspaceId = ${ws} AND createdAt >= ${since} GROUP BY 1
      UNION ALL SELECT DATE(CONVERT_TZ(createdAt, '+00:00', ${off})), 'projectsCreated', COUNT(*) FROM Project WHERE workspaceId = ${ws} AND createdAt >= ${since} GROUP BY 1
      UNION ALL SELECT DATE(CONVERT_TZ(completedAt, '+00:00', ${off})), 'milestonesCompleted', COUNT(*) FROM Milestone WHERE workspaceId = ${ws} AND completedAt >= ${since} GROUP BY 1
      UNION ALL SELECT DATE(CONVERT_TZ(createdAt, '+00:00', ${off})), 'eventsCreated', COUNT(*) FROM Event WHERE workspaceId = ${ws} AND createdAt >= ${since} GROUP BY 1`;
    const byDay = new Map<string, ActivityDto['days'][number]>();
    for (const r of rows) {
      const date = typeof r.d === 'string' ? r.d.slice(0, 10) : ymd(r.d);
      const kind = activityKindSchema.safeParse(r.k);
      if (date < from || date > to || !kind.success) continue;
      const day = byDay.get(date) ?? { date };
      day[kind.data as ActivityKind] = Number(r.n);
      byDay.set(date, day);
    }
    return { from, to, days: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)) };
  }

  @Get('calendar')
  async calendar(@Scope() scope: WorkspaceScope, @Query('from') from?: string, @Query('to') to?: string): Promise<{ data: CalendarItem[] }> {
    const re = /^\d{4}-\d{2}-\d{2}$/;
    if (!from || !to || !re.test(from) || !re.test(to)) throw new AppException(422, 'VALIDATION_FAILED', 'Informe from e to no formato aaaa-mm-dd.');
    const a = utcDate(from);
    const b = utcDate(to);
    if (b <= a || b.getTime() - a.getTime() > 100 * DAY) throw new AppException(422, 'VALIDATION_FAILED', 'Intervalo inválido (máximo de 100 dias).');
    return { data: await this.items(scope, a, b) };
  }

  @Get('reports')
  async reports(@Scope() scope: WorkspaceScope): Promise<ReportsDto> {
    const ws = scope.workspaceId;
    const db = this.prisma.db;
    const today = await this.today(scope);
    // Semanas começando no domingo (Q19), últimas 8.
    const thisWeek = new Date(today.getTime() - today.getUTCDay() * DAY);
    const since = new Date(thisWeek.getTime() - 7 * 7 * DAY);
    const [byStatus, byCategory, tasksByStatus, completed, overdue, milestones, deliveries] = await Promise.all([
      db.project.groupBy({ by: ['status'], where: { workspaceId: ws }, _count: { _all: true } }),
      db.project.groupBy({ by: ['category'], where: { workspaceId: ws }, _count: { _all: true } }),
      db.task.groupBy({ by: ['status'], where: { workspaceId: ws }, _count: { _all: true } }),
      db.task.findMany({ where: { workspaceId: ws, completedAt: { gte: since } }, select: { completedAt: true } }),
      db.task.count({ where: { workspaceId: ws, status: { not: 'DONE' }, dueDate: { lt: today } } }),
      db.milestone.findMany({ where: { workspaceId: ws }, select: { dueDate: true, completedAt: true } }),
      db.milestone.findMany({ where: { workspaceId: ws, isDelivery: true, completedAt: { not: null }, dueDate: { not: null } }, select: { dueDate: true, completedAt: true } }),
    ]);
    const weeks = Array.from({ length: 8 }, (_, i) => ({ weekStart: ymd(new Date(since.getTime() + i * 7 * DAY)), count: 0 }));
    for (const t of completed) {
      const idx = Math.floor((t.completedAt!.getTime() - since.getTime()) / (7 * DAY));
      if (weeks[idx]) weeks[idx].count += 1;
    }
    const onTime = deliveries.filter((d) => d.completedAt!.getTime() < d.dueDate!.getTime() + DAY).length;
    const count = <K extends string>(rows: ({ _count: { _all: number } } & Record<K, string>)[], key: K) => Object.fromEntries(rows.map((r) => [r[key], r._count._all]));
    return {
      projectsByStatus: count(byStatus, 'status'),
      projectsByCategory: count(byCategory, 'category'),
      tasksByStatus: count(tasksByStatus, 'status'),
      completedPerWeek: weeks,
      overdueTasks: overdue,
      milestones: {
        total: milestones.length,
        completed: milestones.filter((m) => m.completedAt).length,
        overdue: milestones.filter((m) => !m.completedAt && m.dueDate && m.dueDate < today).length,
      },
      onTimeDelivery: { onTime, total: deliveries.length, percent: deliveries.length === 0 ? null : Math.round((onTime / deliveries.length) * 100) },
    };
  }

  /** Busca simples em todos os módulos (o collation do MySQL ignora acentos e maiúsculas). */
  @Get('search')
  async search(@Scope() scope: WorkspaceScope, @Query('q') raw?: string): Promise<{ data: SearchResult[] }> {
    const q = (raw ?? '').trim().slice(0, 100);
    if (q.length < 2) return { data: [] };
    const ws = scope.workspaceId;
    const c = { contains: q };
    const take = 6;
    const [projects, tasks, notes, ideas, clients, files] = await Promise.all([
      this.prisma.db.project.findMany({ where: { workspaceId: ws, OR: [{ name: c }, { description: c }] }, select: { id: true, name: true, status: true }, take }),
      this.prisma.db.task.findMany({ where: { workspaceId: ws, OR: [{ title: c }, { description: c }] }, select: { id: true, title: true, project: projectRef }, take }),
      this.prisma.db.note.findMany({ where: { workspaceId: ws, OR: [{ title: c }, { content: c }] }, select: { id: true, title: true }, take }),
      this.prisma.db.idea.findMany({ where: { workspaceId: ws, OR: [{ title: c }, { description: c }] }, select: { id: true, title: true }, take }),
      this.prisma.db.client.findMany({ where: { workspaceId: ws, OR: [{ name: c }, { company: c }] }, select: { id: true, name: true, company: true }, take }),
      this.prisma.db.storedFile.findMany({ where: { workspaceId: ws, name: c }, select: { id: true, name: true }, take }),
    ]);
    return {
      data: [
        ...projects.map((p) => ({ kind: 'project' as const, id: p.id, title: p.name })),
        ...tasks.map((t) => ({ kind: 'task' as const, id: t.id, title: t.title, subtitle: t.project?.name })),
        ...notes.map((n) => ({ kind: 'note' as const, id: n.id, title: n.title || 'Nota sem título' })),
        ...ideas.map((i) => ({ kind: 'idea' as const, id: i.id, title: i.title })),
        ...clients.map((k) => ({ kind: 'client' as const, id: k.id, title: k.name, subtitle: k.company ?? undefined })),
        ...files.map((f) => ({ kind: 'file' as const, id: f.id, title: f.name })),
      ],
    };
  }
}
