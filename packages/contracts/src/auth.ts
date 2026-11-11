import { z } from 'zod';

/** Papéis no workspace (só OWNER é usado no MVP). */
export const memberRoleSchema = z.enum(['OWNER', 'ADMIN', 'COLLABORATOR', 'CLIENT']);
export type MemberRole = z.infer<typeof memberRoleSchema>;

const email = z.email('Informe um e-mail válido.').max(254).transform((v) => v.trim().toLowerCase());
/** O limite de 12 caracteres e a lista de senhas vazadas são conferidos na API (mensagem clara em pt-BR). */
const password = z.string().min(1, 'Informe a senha.').max(128, 'Use no máximo 128 caracteres.');

/** GET /api/auth/csrf — token que deve ir no header `x-csrf-token` em toda requisição que altera dados. */
export const csrfTokenSchema = z.object({ csrfToken: z.string() });
export type CsrfToken = z.infer<typeof csrfTokenSchema>;

/** GET /api/auth/setup — se o primeiro acesso ainda está disponível. */
export const setupStatusSchema = z.object({ available: z.literal(true) });

/** POST /api/auth/setup — primeiro acesso (E1-1). */
export const setupInputSchema = z.object({
  email,
  setupToken: z.string().min(1, 'Informe o token de configuração.').max(256),
  name: z.string().trim().min(1, 'Informe seu nome.').max(120),
  password,
  workspaceName: z.string().trim().min(1).max(120).optional(),
});
export type SetupInput = z.input<typeof setupInputSchema>;

/** POST /api/auth/login (E1-2). */
export const loginInputSchema = z.object({ email, password });
export type LoginInput = z.input<typeof loginInputSchema>;

export const workspaceSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  role: memberRoleSchema,
});
export type WorkspaceSummary = z.infer<typeof workspaceSummarySchema>;

/** GET /api/auth/me — usuária da sessão e seus workspaces. Nunca inclui hash de senha. */
export const meSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    timezone: z.string(),
    weekStartsOn: z.number().int(),
    themePreference: z.enum(['LIGHT', 'DARK', 'SYSTEM']),
    /** Disposição salva dos widgets do Início (nulo = padrão). Validada com `dashboardLayoutSchema`. */
    dashboardLayout: z.unknown().nullable(),
  }),
  workspaces: z.array(workspaceSummarySchema),
});
export type Me = z.infer<typeof meSchema>;
