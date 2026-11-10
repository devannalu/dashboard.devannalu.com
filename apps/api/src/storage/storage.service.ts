import { randomUUID } from 'node:crypto';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ENV, type Env } from '../config/env.js';

/**
 * Acesso ao armazenamento de arquivos compatível com S3 (D-31: Garage na VPS; ADR-005).
 * Esta etapa liga a conexão e a verificação de saúde. Upload/download (E11) entram depois do
 * login (M2): sem autenticação, nenhum endpoint de arquivo pode ficar exposto.
 */
@Injectable()
export class StorageService implements OnModuleDestroy {
  private readonly log = new Logger('Armazenamento');
  readonly client: S3Client | null;
  readonly bucket: string | null;

  constructor(@Inject(ENV) env: Env) {
    if (env.S3_ENDPOINT && env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY) {
      this.bucket = env.S3_BUCKET;
      this.client = new S3Client({
        endpoint: env.S3_ENDPOINT,
        region: env.S3_REGION,
        forcePathStyle: true, // Garage e outros S3 auto-hospedados usam endereço por caminho
        credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
      });
    } else {
      this.bucket = null;
      this.client = null;
      this.log.warn('Armazenamento S3 não configurado: recursos de arquivos desativados.');
    }
  }

  /**
   * Chave do objeto no bucket. Nunca usa o nome enviado pela usuária (evita path traversal e
   * vazamento de nome); o nome original fica só no banco.
   */
  static objectKey(workspaceId: string, fileId: string, version: number): string {
    if (!/^[a-z0-9]+$/i.test(workspaceId) || !/^[a-z0-9]+$/i.test(fileId) || !Number.isInteger(version) || version < 1) {
      throw new Error('Identificadores inválidos para chave de armazenamento');
    }
    return `ws/${workspaceId}/f/${fileId}/v${version}`;
  }

  /** Identificador aleatório para objetos temporários (ex.: upload em andamento). */
  static tempKey(): string {
    return `tmp/${randomUUID()}`;
  }

  async ping(timeoutMs = 3000): Promise<'ok' | 'down' | 'skipped'> {
    if (!this.client || !this.bucket) return 'skipped';
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }), { abortSignal: AbortSignal.timeout(timeoutMs) });
      return 'ok';
    } catch {
      return 'down';
    }
  }

  onModuleDestroy(): void {
    this.client?.destroy();
  }
}
