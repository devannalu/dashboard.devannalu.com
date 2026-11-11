import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { PET_FOODS, petFeedSchema, petFoodSchema, petUpdateSchema, type PetDto, type PetFood, type PetMood } from '@studio/contracts';
import type { z } from 'zod';
import { Scope } from '../auth/decorators.js';
import { AppException } from '../common/problem.filter.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { PrismaService } from '../database/prisma.service.js';
import type { PetState } from '../generated/prisma/client.js';
import { WorkspaceMemberGuard } from '../workspaces/workspace-member.guard.js';
import { inScope, type WorkspaceScope } from '../workspaces/workspace-scope.js';
import { todayIn, tzOffset } from './insights.controller.js';

const HOUR = 3_600_000;
const DECAY_PER_HOUR = 4;            // de cheia a vazia em ~25 h
const MAX_PETS_PER_DAY = 5;
const FOODS = petFoodSchema.options;
type Inventory = Record<PetFood, number>;

/** Só a violação do índice único (comida já concedida) é esperada; qualquer outro erro sobe. */
function onlyDuplicate(e: unknown): false {
  if ((e as { code?: string }).code === 'P2002') return false;
  throw e;
}

const emptyInventory = (): Inventory => ({ cereja: 0, cupcake: 0, torta: 0, bolo: 0, milkshake: 0 });

/** Saciedade atual: valor guardado menos a queda por hora desde então (nunca abaixo de 0). */
export function currentSatiety(stored: number, at: Date, now: Date): number {
  return Math.max(0, Math.min(100, stored - (DECAY_PER_HOUR * (now.getTime() - at.getTime())) / HOUR));
}

/** Humor (doc 03 §9.1): base 60; −15 por atraso; +8 por tarefa concluída hoje; +3 por carinho (máx. 5); +15 se saciedade ≥ 60; −20 se < 30. */
export function humorOf(input: { overdue: number; doneToday: number; petted: number; satiety: number }): number {
  let h = 60 - 15 * input.overdue + 8 * input.doneToday + 3 * Math.min(MAX_PETS_PER_DAY, input.petted);
  if (input.satiety >= 60) h += 15;
  if (input.satiety < 30) h -= 20;
  return Math.max(0, Math.min(100, Math.round(h)));
}

/** Expressão: fraquinha › sonolenta (23 h–6 h) › faminta › preocupada › feliz › tranquila. */
export function moodOf(input: { satiety: number; humor: number; overdue: number; hour: number }): PetMood {
  if (input.satiety <= 0) return 'fraquinha';
  if (input.hour >= 23 || input.hour < 6) return 'sonolenta';
  if (input.satiety < 30) return 'faminta';
  if (input.overdue > 0 && input.humor < 55) return 'preocupada';
  if (input.humor >= 80) return 'feliz';
  return 'tranquila';
}

/** Sequência ao comer: mesmo dia mantém; dia seguinte soma 1; depois de um intervalo recomeça em 1. */
export function nextStreak(lastFedDay: string | null, today: string, streak: number): number {
  if (lastFedDay === today) return streak;
  const yesterday = new Date(Date.parse(`${today}T12:00:00Z`) - 24 * HOUR).toISOString().slice(0, 10);
  return lastFedDay === yesterday ? streak + 1 : 1;
}

function hourIn(tz: string, now: Date): number {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(now));
}

function inventoryOf(pet: PetState): Inventory {
  const raw = (pet.inventory ?? {}) as Partial<Inventory>;
  const inv = emptyInventory();
  for (const f of FOODS) inv[f] = Math.max(0, Number(raw[f] ?? 0) || 0);
  return inv;
}

/**
 * Pet tamagotchi do Início (D-25, D-27, D-42). As comidas vêm só de ações reais registradas no Studio
 * DEPOIS que o pet nasceu (nada é inventado retroativamente) e cada ação rende uma única comida.
 * Nunca morre: com saciedade 0 fica "fraquinha"; nível, XP e lancheira nunca são perdidos.
 */
@Controller('workspaces/:workspaceId/pet')
@UseGuards(WorkspaceMemberGuard)
export class PetController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get(@Scope() scope: WorkspaceScope): Promise<PetDto> {
    const pet = await this.load(scope);
    const newAwards = await this.sync(scope, pet);
    return this.view(scope, await this.load(scope), newAwards);
  }

  @Post('alimentar')
  async feed(@Scope() scope: WorkspaceScope, @Body(new ZodPipe(petFeedSchema)) body: z.output<typeof petFeedSchema>): Promise<PetDto> {
    const pet = await this.load(scope);
    await this.sync(scope, pet);
    const now = new Date();
    const tz = await this.timezone(scope);
    const today = todayIn(tz, now);
    await this.prisma.db.$transaction(async (tx) => {
      const fresh = await tx.petState.findFirstOrThrow({ where: inScope(scope, { userId: scope.userId }) });
      const inv = inventoryOf(fresh);
      if (inv[body.food] <= 0) throw new AppException(409, 'PET_NO_FOOD', `Você ainda não tem ${PET_FOODS[body.food].label.toLowerCase()} na lancheira.`);
      inv[body.food] -= 1;
      const streak = nextStreak(fresh.lastFedDay, today, fresh.streak);
      // milkshake a cada 3 dias seguidos (só no primeiro lanche do dia, uma vez por marco de sequência)
      if (fresh.lastFedDay !== today && streak > 0 && streak % 3 === 0) {
        const created = await tx.petAward
          .create({ data: { workspaceId: scope.workspaceId, sourceType: 'streak', sourceId: `${scope.userId.slice(0, 24)}:${today}`, food: 'milkshake' } })
          .then(() => true)
          .catch(onlyDuplicate);
        if (created) inv.milkshake += 1;
      }
      const sat = currentSatiety(fresh.satiety, fresh.satietyAt, now);
      // Condição na versão (updatedAt) evita duas refeições simultâneas gastarem a mesma comida.
      const { count } = await tx.petState.updateMany({
        where: { id: fresh.id, updatedAt: fresh.updatedAt },
        data: {
          satiety: Math.min(100, sat + PET_FOODS[body.food].satiety),
          satietyAt: now,
          xp: fresh.xp + PET_FOODS[body.food].xp,
          streak,
          lastFedDay: today,
          inventory: inv,
        },
      });
      if (count === 0) throw new AppException(409, 'PET_BUSY', 'O pet acabou de comer. Tente de novo.');
    });
    return this.view(scope, await this.load(scope), []);
  }

  @Post('carinho')
  async pet(@Scope() scope: WorkspaceScope): Promise<PetDto> {
    const pet = await this.load(scope);
    const today = todayIn(await this.timezone(scope));
    const count = pet.pettedDay === today ? pet.pettedCount + 1 : 1;
    await this.prisma.db.petState.update({ where: { id: pet.id }, data: { pettedDay: today, pettedCount: Math.min(count, 99) } });
    return this.view(scope, await this.load(scope), []);
  }

  @Patch()
  async update(@Scope() scope: WorkspaceScope, @Body(new ZodPipe(petUpdateSchema)) body: z.output<typeof petUpdateSchema>): Promise<PetDto> {
    const pet = await this.load(scope);
    await this.prisma.db.petState.update({ where: { id: pet.id }, data: { name: body.name } });
    return this.view(scope, await this.load(scope), []);
  }

  // ------------------------------------------------------------------ internos

  /** Busca (ou cria, na primeira visita) o pet da usuária neste workspace. */
  private async load(scope: WorkspaceScope): Promise<PetState> {
    const where = { workspaceId_userId: { workspaceId: scope.workspaceId, userId: scope.userId } };
    return this.prisma.db.petState.upsert({ where, update: {}, create: { workspaceId: scope.workspaceId, userId: scope.userId, inventory: emptyInventory() } });
  }

  private async timezone(scope: WorkspaceScope): Promise<string> {
    const u = await this.prisma.db.user.findUnique({ where: { id: scope.userId }, select: { timezone: true } });
    return u?.timezone ?? 'America/Sao_Paulo';
  }

  /** Concede as comidas das ações feitas desde que o pet nasceu e que ainda não renderam comida. */
  private async sync(scope: WorkspaceScope, pet: PetState): Promise<PetFood[]> {
    const since = pet.createdAt;
    const db = this.prisma.db;
    const [tasks, ideas, milestones, projects] = await Promise.all([
      db.task.findMany({ where: inScope(scope, { status: 'DONE' as const, completedAt: { gte: since } }), select: { id: true }, take: 200 }),
      db.idea.findMany({ where: inScope(scope, { createdAt: { gte: since } }), select: { id: true }, take: 200 }),
      db.milestone.findMany({ where: inScope(scope, { completedAt: { gte: since } }), select: { id: true }, take: 200 }),
      db.project.findMany({ where: inScope(scope, { status: 'COMPLETED' as const, updatedAt: { gte: since } }), select: { id: true }, take: 200 }),
    ]);
    const candidates: { sourceType: string; sourceId: string; food: PetFood }[] = [
      ...tasks.map((t) => ({ sourceType: 'task', sourceId: t.id, food: 'cereja' as const })),
      ...ideas.map((t) => ({ sourceType: 'idea', sourceId: t.id, food: 'cupcake' as const })),
      ...milestones.map((t) => ({ sourceType: 'milestone', sourceId: t.id, food: 'torta' as const })),
      ...projects.map((t) => ({ sourceType: 'project', sourceId: t.id, food: 'bolo' as const })),
    ];
    if (candidates.length === 0) return [];
    const existing = await db.petAward.findMany({
      where: inScope(scope, { sourceId: { in: candidates.map((c) => c.sourceId) } }),
      select: { sourceType: true, sourceId: true },
    });
    const done = new Set(existing.map((e) => `${e.sourceType}:${e.sourceId}`));
    const granted: PetFood[] = [];
    for (const c of candidates) {
      if (done.has(`${c.sourceType}:${c.sourceId}`)) continue;
      // índice único (workspace, tipo, origem): se outra requisição já concedeu, esta não concede de novo
      const ok = await db.petAward
        .create({ data: { workspaceId: scope.workspaceId, ...c } })
        .then(() => true)
        .catch(onlyDuplicate);
      if (ok) granted.push(c.food);
    }
    if (granted.length > 0) {
      await db.$transaction(async (tx) => {
        const fresh = await tx.petState.findUniqueOrThrow({ where: { id: pet.id } });
        const inv = inventoryOf(fresh);
        for (const f of granted) inv[f] += 1;
        await tx.petState.update({ where: { id: pet.id }, data: { inventory: inv } });
      });
    }
    return granted;
  }

  private async view(scope: WorkspaceScope, pet: PetState, newAwards: PetFood[]): Promise<PetDto> {
    const now = new Date();
    const tz = await this.timezone(scope);
    const today = todayIn(tz, now);
    const todayDate = new Date(`${today}T00:00:00.000Z`);
    const [overdue, doneToday] = await Promise.all([
      this.prisma.db.task.count({ where: inScope(scope, { status: { not: 'DONE' as const }, dueDate: { lt: todayDate } }) }),
      this.prisma.db.task.count({ where: inScope(scope, { status: 'DONE' as const, completedAt: { gte: new Date(`${today}T00:00:00.000${tzOffset(tz, now)}`) } }) }),
    ]);
    const satiety = Math.round(currentSatiety(pet.satiety, pet.satietyAt, now));
    const petted = pet.pettedDay === today ? pet.pettedCount : 0;
    const humor = humorOf({ overdue, doneToday, petted, satiety });
    return {
      name: pet.name,
      satiety,
      humor,
      mood: moodOf({ satiety, humor, overdue, hour: hourIn(tz, now) }),
      level: Math.floor(pet.xp / 10) + 1,
      xp: pet.xp,
      xpInLevel: pet.xp % 10,
      streak: pet.lastFedDay === today || nextStreak(pet.lastFedDay, today, pet.streak) > 1 ? pet.streak : 0,
      fedToday: pet.lastFedDay === today,
      pettedToday: petted,
      inventory: inventoryOf(pet),
      newAwards,
    };
  }
}
