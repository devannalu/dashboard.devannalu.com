import { z } from 'zod';

export const healthCheckSchema = z.object({
  status: z.enum(['ok', 'degraded', 'down']),
  checks: z.record(z.string(), z.enum(['ok', 'down', 'skipped'])),
  version: z.string(),
  time: z.string(),
});
export type HealthCheck = z.infer<typeof healthCheckSchema>;
