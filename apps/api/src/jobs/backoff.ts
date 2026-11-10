/**
 * Espera antes da próxima tentativa: exponencial (5 s, 10 s, 20 s…) com teto de 1 h e
 * variação aleatória de até 20% para evitar que vários jobs tentem ao mesmo tempo.
 */
export function retryDelayMs(attempt: number, random: () => number = Math.random): number {
  const base = Math.min(5_000 * 2 ** Math.max(0, attempt - 1), 3_600_000);
  return Math.round(base * (1 + 0.2 * random()));
}

/** Mensagem de erro segura para guardar no banco: curta e sem quebra de linha de stack. */
export function safeErrorMessage(err: unknown, max = 1000): string {
  const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  return msg.length > max ? `${msg.slice(0, max)}…` : msg;
}
