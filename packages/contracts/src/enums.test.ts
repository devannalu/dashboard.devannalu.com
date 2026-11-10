import { describe, expect, it } from 'vitest';
import {
  priorityLabel,
  prioritySchema,
  projectCategoryLabel,
  projectCategorySchema,
  projectStatusLabel,
  projectStatusSchema,
  taskStatusLabel,
  taskStatusSchema,
} from './enums.js';

describe('rótulos pt-BR', () => {
  it('cobrem todos os valores de cada enum', () => {
    const pares = [
      [projectCategorySchema.options, projectCategoryLabel],
      [projectStatusSchema.options, projectStatusLabel],
      [prioritySchema.options, priorityLabel],
      [taskStatusSchema.options, taskStatusLabel],
    ] as const;
    for (const [valores, rotulos] of pares) {
      expect(Object.keys(rotulos).sort()).toEqual([...valores].sort());
    }
  });
});
