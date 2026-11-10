import { z } from 'zod';

/**
 * Resposta de erro padrão da API (RFC 9457, application/problem+json).
 * `code` é estável para o frontend tratar; `detail` é a mensagem em pt-BR para a usuária.
 */
export const problemSchema = z.object({
  type: z.string().default('about:blank'),
  title: z.string(),
  status: z.number().int(),
  code: z.string(),
  detail: z.string().optional(),
  requestId: z.string().optional(),
  errors: z
    .array(z.object({ path: z.string(), message: z.string() }))
    .optional(),
});
export type Problem = z.infer<typeof problemSchema>;

/** Paginação por cursor (limite máximo 100). */
export const cursorQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type CursorQuery = z.infer<typeof cursorQuerySchema>;

export const pageSchema = <T extends z.ZodType>(item: T) =>
  z.object({ data: z.array(item), nextCursor: z.string().nullable() });

/** Identificador cuid usado em todas as entidades. */
export const idSchema = z.string().min(20).max(32);
