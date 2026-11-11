import { slugify } from './auth.service.js';
import { randomToken, safeEqual, sha256, truncateIp } from './crypto.js';
import { hashPassword, passwordProblem, verifyPassword } from './password.js';

describe('Força da senha (E1-5)', () => {
  it('recusa menos de 12 caracteres com mensagem clara', () => {
    expect(passwordProblem('curta123')).toBe('A senha precisa ter pelo menos 12 caracteres.');
  });

  it('recusa senha da lista de vazadas, sem diferenciar maiúsculas', () => {
    expect(passwordProblem('Senha1234567')).toBe('Essa senha aparece em vazamentos conhecidos. Escolha outra.');
    expect(passwordProblem('PASSWORD1234')).toMatch(/vazamentos/);
  });

  it('recusa repetição e senha baseada no próprio nome/e-mail', () => {
    expect(passwordProblem('aaaaaaaaaaaaaaab')).toMatch(/repete/);
    expect(passwordProblem('annaluzinha!1', { email: 'annaluzinha@exemplo.com' })).toMatch(/nome ou e-mail/);
  });

  it('aceita frase longa e incomum', () => {
    expect(passwordProblem('cereja bordô no ateliê 42', { email: 'dona@exemplo.com', name: 'Dona Teste' })).toBeNull();
  });
});

describe('Hash de senha (Argon2id)', () => {
  it('gera hash argon2id com os parâmetros da OWASP e verifica corretamente', async () => {
    const h = await hashPassword('cereja bordô no ateliê 42');
    expect(h).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(await verifyPassword(h, 'cereja bordô no ateliê 42')).toBe(true);
    expect(await verifyPassword(h, 'outra senha qualquer')).toBe(false);
    expect(await verifyPassword('lixo', 'x')).toBe(false);
  });
});

describe('Tokens e IP', () => {
  it('token tem 256 bits e o hash é SHA-256 hex', () => {
    const t = randomToken();
    expect(Buffer.from(t, 'base64url')).toHaveLength(32);
    expect(sha256(t)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('comparação segura funciona com tamanhos diferentes', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });

  it('trunca IPv4 e IPv6 (LGPD)', () => {
    expect(truncateIp('203.0.113.77')).toBe('203.0.113.0');
    expect(truncateIp('::ffff:198.51.100.9')).toBe('198.51.100.0');
    expect(truncateIp('2001:db8:abcd:12:1:2:3:4')).toBe('2001:db8:abcd::');
    expect(truncateIp(undefined)).toBeNull();
  });
});

describe('slugify', () => {
  it('remove acentos e símbolos', () => {
    expect(slugify('Meu Estúdio — Annalu!')).toBe('meu-estudio-annalu');
    expect(slugify('!!!')).toBe('estudio');
  });
});
