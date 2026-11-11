import { withDriverDefaults } from './prisma.service.js';

describe('Opções do driver do banco', () => {
  it('ativa allowPublicKeyRetrieval (MySQL 8 sem TLS), pool e timeout', () => {
    const u = new URL(withDriverDefaults('mysql://u:p@db:3306/studio', 10));
    expect(u.searchParams.get('allowPublicKeyRetrieval')).toBe('true');
    expect(u.searchParams.get('connectionLimit')).toBe('10');
    expect(u.searchParams.get('connectTimeout')).toBe('5000');
  });

  it('não sobrescreve valores já informados na URL', () => {
    const u = new URL(withDriverDefaults('mysql://u:p@db:3306/studio?connectionLimit=3&allowPublicKeyRetrieval=false', 10));
    expect(u.searchParams.get('connectionLimit')).toBe('3');
    expect(u.searchParams.get('allowPublicKeyRetrieval')).toBe('false');
  });
});
