import { PipeTransform } from '@nestjs/common';
import type { z } from 'zod';
import { AppException } from './problem.filter.js';

/**
 * Valida o corpo/parâmetro com um schema Zod de `@studio/contracts`.
 * Falha → 422 com a lista de campos e mensagens em pt-BR (problem+json).
 * Uso: `@Body(new ZodPipe(loginInputSchema)) body: z.output<typeof loginInputSchema>`
 */
export class ZodPipe<S extends z.ZodType> implements PipeTransform<unknown, z.output<S>> {
  constructor(private readonly schema: S) {}

  transform(value: unknown): z.output<S> {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;
    throw new AppException(
      422,
      'VALIDATION_FAILED',
      'Confira os campos destacados.',
      result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  }
}
