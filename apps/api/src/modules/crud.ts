import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Query, Type, UseGuards } from '@nestjs/common';
import type { z } from 'zod';
import { Scope } from '../auth/decorators.js';
import { AppException } from '../common/problem.filter.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { PrismaService } from '../database/prisma.service.js';
import { WorkspaceMemberGuard } from '../workspaces/workspace-member.guard.js';
import { foundOr404, inScope, type WorkspaceScope } from '../workspaces/workspace-scope.js';

export type Row = Record<string, unknown> & { id: string };
type Data = Record<string, unknown>;
export type ModelName = 'client' | 'project' | 'milestone' | 'task' | 'event' | 'note' | 'idea' | 'storedFile';

/** Interface mínima dos delegates do Prisma usada pelo CRUD genérico. */
interface Delegate {
  findMany(args: unknown): Promise<Row[]>;
  findFirst(args: unknown): Promise<Row | null>;
  create(args: unknown): Promise<Row>;
  updateMany(args: unknown): Promise<{ count: number }>;
  deleteMany(args: unknown): Promise<{ count: number }>;
}

export function delegate(prisma: PrismaService, model: ModelName): Delegate {
  return (prisma.db as unknown as Record<ModelName, Delegate>)[model];
}

const REF_LABEL: Record<string, string> = { project: 'Projeto', client: 'Cliente', milestone: 'Marco', idea: 'Ideia' };

/**
 * Confere que cada ID referenciado (projeto, cliente…) existe NO MESMO workspace.
 * Sem isto, alguém poderia vincular uma tarefa a um projeto de outro workspace.
 */
export async function assertRefs(prisma: PrismaService, scope: WorkspaceScope, data: Data, refs: Record<string, ModelName>): Promise<void> {
  for (const [field, model] of Object.entries(refs)) {
    const id = data[field];
    if (id == null) continue;
    const found = await delegate(prisma, model).findFirst({ where: inScope(scope, { id: id as string }), select: { id: true } });
    if (!found) throw new AppException(422, 'INVALID_REFERENCE', `${REF_LABEL[model] ?? 'Item'} não encontrado.`, [{ path: field, message: 'Não encontrado.' }]);
  }
}

/** `aaaa-mm-dd` → Date em UTC à meia-noite; ISO com hora → Date. `null` mantém (limpa o campo). */
export function toDates(data: Data, dateFields: string[] = [], dateTimeFields: string[] = []): Data {
  const out = { ...data };
  for (const f of dateFields) if (typeof out[f] === 'string') out[f] = new Date(`${out[f] as string}T00:00:00.000Z`);
  for (const f of dateTimeFields) if (typeof out[f] === 'string') out[f] = new Date(out[f] as string);
  return out;
}

export interface CrudOptions {
  /** Caminho depois de `workspaces/:workspaceId/`. */
  path: string;
  model: ModelName;
  label: string;
  create: z.ZodType;
  update: z.ZodType;
  /** Campos filtráveis por igualdade na query (`?status=TODO`; `?projectId=null` = sem vínculo). */
  filters?: string[];
  /** Campos pesquisados com `?q=` (contém; o MySQL já ignora acento e caixa). */
  search?: string[];
  orderBy: unknown;
  include?: unknown;
  refs?: Record<string, ModelName>;
  dateFields?: string[];
  dateTimeFields?: string[];
  /** Ajustes de dados (ex.: status DONE → completedAt). */
  transform?: (data: Data, current: Row | null) => Data;
  /** Filtros extras a partir da query (ex.: `?archived=true`). */
  where?: (query: Record<string, string>) => Data;
  /** Enriquecimento das linhas (ex.: progresso dos projetos). */
  decorate?: (prisma: PrismaService, scope: WorkspaceScope, rows: Row[]) => Promise<Row[]>;
  /** Concorrência otimista pelo campo `version`. */
  versioned?: boolean;
}

const LIST_LIMIT = 1000;

/**
 * Gera o controller REST de um recurso: GET (lista), POST, GET :id, PATCH :id, DELETE :id.
 * Todas as consultas usam o `WorkspaceScope` da rota; recurso de outro workspace → 404.
 */
export function crudController(o: CrudOptions): Type<unknown> {
  @Controller(`workspaces/:workspaceId/${o.path}`)
  @UseGuards(WorkspaceMemberGuard)
  class CrudController {
    constructor(@Inject(PrismaService) readonly prisma: PrismaService) {}

    private get db(): Delegate {
      return delegate(this.prisma, o.model);
    }

    private async decorate(scope: WorkspaceScope, rows: Row[]): Promise<Row[]> {
      return o.decorate ? o.decorate(this.prisma, scope, rows) : rows;
    }

    @Get()
    async list(@Scope() scope: WorkspaceScope, @Query() query: Record<string, string>): Promise<{ data: Row[] }> {
      const where: Data = inScope(scope, {});
      for (const f of o.filters ?? []) if (typeof query[f] === 'string') where[f] = query[f] === 'null' ? null : query[f];
      const q = typeof query.q === 'string' ? query.q.trim().slice(0, 100) : '';
      if (q && o.search?.length) where.OR = o.search.map((f) => ({ [f]: { contains: q } }));
      Object.assign(where, o.where?.(query) ?? {});
      const rows = await this.db.findMany({ where, orderBy: o.orderBy, include: o.include, take: LIST_LIMIT });
      return { data: await this.decorate(scope, rows) };
    }

    @Get(':id')
    async get(@Scope() scope: WorkspaceScope, @Param('id') id: string): Promise<Row> {
      const row = foundOr404(await this.db.findFirst({ where: inScope(scope, { id }), include: o.include }), o.label);
      return (await this.decorate(scope, [row]))[0]!;
    }

    @Post()
    async create(@Scope() scope: WorkspaceScope, @Body(new ZodPipe(o.create)) body: Data): Promise<Row> {
      let data = toDates(body, o.dateFields, o.dateTimeFields);
      if (o.transform) data = o.transform(data, null);
      await assertRefs(this.prisma, scope, data, o.refs ?? {});
      const row = await this.db.create({ data: { ...data, workspaceId: scope.workspaceId }, include: o.include });
      return (await this.decorate(scope, [row]))[0]!;
    }

    @Patch(':id')
    async update(@Scope() scope: WorkspaceScope, @Param('id') id: string, @Body(new ZodPipe(o.update)) body: Data): Promise<Row> {
      const current = foundOr404(await this.db.findFirst({ where: inScope(scope, { id }) }), o.label);
      const { version, ...rest } = body;
      let data = toDates(rest, o.dateFields, o.dateTimeFields);
      if (o.transform) data = o.transform(data, current);
      await assertRefs(this.prisma, scope, data, o.refs ?? {});
      const where: Data = inScope(scope, { id });
      if (o.versioned) {
        data.version = { increment: 1 };
        if (typeof version === 'number') where.version = version;
      }
      const { count } = await this.db.updateMany({ where, data });
      if (count === 0) {
        if (o.versioned) throw new AppException(409, 'VERSION_CONFLICT', 'Este item foi alterado em outra aba. Recarregue para ver a versão mais recente.');
        throw new AppException(404, 'NOT_FOUND', `${o.label} não encontrado.`);
      }
      return this.get(scope, id);
    }

    @Delete(':id')
    @HttpCode(204)
    async remove(@Scope() scope: WorkspaceScope, @Param('id') id: string): Promise<void> {
      const { count } = await this.db.deleteMany({ where: inScope(scope, { id }) });
      if (count === 0) throw new AppException(404, 'NOT_FOUND', `${o.label} não encontrado.`);
    }
  }
  Object.defineProperty(CrudController, 'name', { value: `${o.label.replace(/\W/g, '')}CrudController` });
  return CrudController;
}
