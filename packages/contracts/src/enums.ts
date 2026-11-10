import { z } from 'zod';

/** Valores em inglês no banco/API; rótulos em pt-BR ficam na interface (ver labels abaixo). */
export const projectCategorySchema = z.enum(['PERSONAL', 'OWNED_PRODUCT', 'CLIENT', 'PROFESSIONAL_WORK']);
export const projectStatusSchema = z.enum(['IDEA', 'PLANNING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'ARCHIVED']);
export const prioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export const taskStatusSchema = z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']);

export type ProjectCategory = z.infer<typeof projectCategorySchema>;
export type ProjectStatus = z.infer<typeof projectStatusSchema>;
export type Priority = z.infer<typeof prioritySchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const projectCategoryLabel: Record<ProjectCategory, string> = {
  PERSONAL: 'Pessoal',
  OWNED_PRODUCT: 'Produto próprio',
  CLIENT: 'Cliente',
  PROFESSIONAL_WORK: 'Trabalho profissional',
};
export const projectStatusLabel: Record<ProjectStatus, string> = {
  IDEA: 'Ideia',
  PLANNING: 'Planejamento',
  IN_PROGRESS: 'Em andamento',
  PAUSED: 'Pausado',
  COMPLETED: 'Concluído',
  ARCHIVED: 'Arquivado',
};
export const priorityLabel: Record<Priority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};
export const taskStatusLabel: Record<TaskStatus, string> = {
  BACKLOG: 'Backlog',
  TODO: 'A fazer',
  IN_PROGRESS: 'Em andamento',
  IN_REVIEW: 'Em revisão',
  DONE: 'Concluída',
};
