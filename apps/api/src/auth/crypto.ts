import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** Token aleatório de 256 bits, seguro para cookie/URL. */
export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

/** SHA-256 em hexadecimal (64 caracteres). O banco guarda só isso, nunca o token. */
export function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/** Comparação em tempo constante, inclusive para tamanhos diferentes (compara os hashes). */
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(Buffer.from(sha256(a), 'hex'), Buffer.from(sha256(b), 'hex'));
}

/**
 * Minimização de dados (LGPD): IPv4 com o último octeto zerado; IPv6 só com os 3 primeiros blocos (/48).
 * Suficiente para reconhecer "de onde" veio um acesso, sem identificar a máquina exata.
 */
export function truncateIp(ip: string | undefined | null): string | null {
  if (!ip) return null;
  const v4 = ip.replace(/^::ffff:/i, '');
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(v4)) return v4.replace(/\.\d{1,3}$/, '.0');
  if (ip.includes(':')) {
    const blocks = ip.split('::')[0]!.split(':').filter(Boolean).slice(0, 3);
    return `${blocks.join(':')}::`;
  }
  return null;
}

/** User-Agent limitado ao tamanho da coluna. */
export function clampUserAgent(ua: string | undefined): string | null {
  return ua ? ua.slice(0, 255) : null;
}
