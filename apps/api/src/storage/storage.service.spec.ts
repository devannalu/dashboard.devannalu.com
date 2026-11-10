import { parseEnv } from '../config/env.js';
import { StorageService } from './storage.service.js';

describe('StorageService', () => {
  it('sem configuração, fica desligado e o health responde "skipped"', async () => {
    const s = new StorageService(parseEnv({}));
    expect(s.client).toBeNull();
    expect(await s.ping()).toBe('skipped');
  });

  it('com endpoint inalcançável, o health responde "down" sem travar', async () => {
    const s = new StorageService(
      parseEnv({ S3_ENDPOINT: 'http://127.0.0.1:1', S3_BUCKET: 'studio-arquivos', S3_ACCESS_KEY_ID: 'x', S3_SECRET_ACCESS_KEY: 'y' }),
    );
    expect(await s.ping(1500)).toBe('down');
    s.onModuleDestroy();
  });

  it('chave do objeto nunca usa entrada da usuária', () => {
    expect(StorageService.objectKey('cmw1abc', 'cmw2def', 3)).toBe('ws/cmw1abc/f/cmw2def/v3');
    expect(() => StorageService.objectKey('../../etc', 'x', 1)).toThrow();
    expect(() => StorageService.objectKey('abc', 'nome com espaço.png', 1)).toThrow();
    expect(() => StorageService.objectKey('abc', 'def', 0)).toThrow();
  });
});

describe('parseEnv (armazenamento)', () => {
  it('recusa configuração S3 pela metade, dizendo o que falta', () => {
    expect(() => parseEnv({ S3_ENDPOINT: 'http://garage:3900' })).toThrow(/S3_BUCKET/);
  });
});
