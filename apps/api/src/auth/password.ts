import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { hash, verify } from '@node-rs/argon2';

/**
 * Argon2id com os parâmetros mínimos da OWASP: 19 MiB de memória, 2 iterações, 1 linha.
 * `algorithm: 2` = Argon2id (o enum da biblioteca é `const enum`, incompatível com isolatedModules).
 */
const ARGON2 = { algorithm: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export const PASSWORD_MIN_LENGTH = 12;

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/**
 * Hash de uma senha qualquer, calculado uma vez. Usado quando o e-mail não existe, para que a resposta
 * leve o mesmo tempo de uma senha errada (não revela quais e-mails têm conta).
 */
let dummyHash: Promise<string> | undefined;
export function dummyVerify(password: string): Promise<boolean> {
  dummyHash ??= hashPassword(randomFiller());
  return dummyHash.then((h) => verifyPassword(h, password));
}
function randomFiller(): string {
  return `dummy-${Math.random().toString(36)}-${Date.now()}`;
}

/**
 * Lista local de senhas vazadas conhecidas (≈30 mil com 12+ caracteres, do projeto público SecLists),
 * em minúsculas. A senha nunca é enviada a serviços de terceiros.
 */
let leaked: Set<string> | undefined;
function leakedPasswords(): Set<string> {
  if (!leaked) {
    // src/auth → ../../data  e  dist/auth → ../../data apontam para apps/api/data
    const file = resolve(import.meta.dirname, '../../data/senhas-vazadas.txt.gz');
    leaked = new Set(gunzipSync(readFileSync(file)).toString('utf8').split('\n').filter(Boolean));
  }
  return leaked;
}

/**
 * Confere a força da senha (E1-5, compensação pela ausência de 2FA — D-19).
 * Retorna a mensagem de erro em pt-BR, ou `null` se a senha é aceitável.
 */
export function passwordProblem(password: string, context: { email?: string; name?: string } = {}): string | null {
  const length = codePoints(password);
  if (length < PASSWORD_MIN_LENGTH) return `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  if (length > 128) return 'A senha pode ter no máximo 128 caracteres.';
  const lower = password.toLowerCase();
  if (leakedPasswords().has(lower)) return 'Essa senha aparece em vazamentos conhecidos. Escolha outra.';
  if (new Set(lower).size <= 3) return 'A senha repete poucos caracteres. Escolha uma mais variada.';
  const personal = [context.email?.split('@')[0], ...(context.name?.split(/\s+/) ?? [])]
    .map((p) => p?.toLowerCase().trim())
    .filter((p): p is string => !!p && p.length >= 4);
  if (personal.some((p) => lower.replace(/[^a-z0-9]/g, '').startsWith(p) && lower.length - p.length < 6)) {
    return 'A senha é muito parecida com seu nome ou e-mail. Escolha outra.';
  }
  return null;
}

/** Conta caracteres (pontos de código), não unidades UTF-16: "ê" ou um emoji contam como 1. */
function codePoints(text: string): number {
  let n = 0;
  for (const _ of text) n++;
  return n;
}
