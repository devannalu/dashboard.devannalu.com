/** Junta classes CSS ignorando valores vazios (substitui a dependência clsx). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
