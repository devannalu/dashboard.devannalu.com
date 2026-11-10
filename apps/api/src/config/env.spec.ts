import { EnvValidationError, parseEnv } from './env.js';

describe('parseEnv', () => {
  it('aplica padrões seguros em desenvolvimento', () => {
    const env = parseEnv({});
    expect(env).toMatchObject({ NODE_ENV: 'development', PORT: 4000, APP_ORIGIN: 'http://localhost:3000' });
  });

  it('recusa porta inválida com mensagem que aponta a variável', () => {
    expect(() => parseEnv({ PORT: 'abc' })).toThrow(EnvValidationError);
    try {
      parseEnv({ PORT: 'abc' });
    } catch (e) {
      expect((e as EnvValidationError).issues.join()).toContain('PORT');
    }
  });

  it('exige DATABASE_URL em produção', () => {
    expect(() => parseEnv({ NODE_ENV: 'production' })).toThrow(/DATABASE_URL/);
  });

  it('aceita produção completa', () => {
    const env = parseEnv({ NODE_ENV: 'production', DATABASE_URL: 'mysql://u:p@localhost:3306/studio' });
    expect(env.NODE_ENV).toBe('production');
  });
});
