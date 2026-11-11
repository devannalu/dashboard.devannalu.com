import { createHash } from 'node:crypto';
import type { Readable } from 'node:stream';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Controller, Delete, Get, HttpCode, Param, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { Scope } from '../auth/decorators.js';
import { AppException } from '../common/problem.filter.js';
import { PrismaService } from '../database/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import { WorkspaceMemberGuard } from '../workspaces/workspace-member.guard.js';
import { foundOr404, inScope, type WorkspaceScope } from '../workspaces/workspace-scope.js';
import { assertRefs } from './crud.js';

interface Upload {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const MB = 1024 * 1024;
/** Política de tipos (doc 05 §7, Q9). Tudo fora desta lista é recusado. */
const TYPES: Record<string, { mime: string; max: number; inline?: boolean }> = {
  png: { mime: 'image/png', max: 25 * MB, inline: true },
  jpg: { mime: 'image/jpeg', max: 25 * MB, inline: true },
  jpeg: { mime: 'image/jpeg', max: 25 * MB, inline: true },
  webp: { mime: 'image/webp', max: 25 * MB, inline: true },
  gif: { mime: 'image/gif', max: 25 * MB, inline: true },
  avif: { mime: 'image/avif', max: 25 * MB, inline: true },
  svg: { mime: 'image/svg+xml', max: 25 * MB }, // só download, nunca exibido
  pdf: { mime: 'application/pdf', max: 50 * MB, inline: true },
  txt: { mime: 'text/plain', max: 50 * MB },
  md: { mime: 'text/markdown', max: 50 * MB },
  csv: { mime: 'text/csv', max: 50 * MB },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', max: 50 * MB },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', max: 50 * MB },
  pptx: { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', max: 50 * MB },
  odt: { mime: 'application/vnd.oasis.opendocument.text', max: 50 * MB },
  ods: { mime: 'application/vnd.oasis.opendocument.spreadsheet', max: 50 * MB },
  odp: { mime: 'application/vnd.oasis.opendocument.presentation', max: 50 * MB },
  fig: { mime: 'application/octet-stream', max: 200 * MB },
  psd: { mime: 'image/vnd.adobe.photoshop', max: 200 * MB },
  ai: { mime: 'application/postscript', max: 200 * MB },
  zip: { mime: 'application/zip', max: 200 * MB },
};

/** Assinaturas de bytes: o conteúdo precisa bater com a extensão (executável renomeado para .png é recusado). */
const ZIP = [0x50, 0x4b, 0x03, 0x04];
const MAGIC: Record<string, number[][]> = {
  png: [[0x89, 0x50, 0x4e, 0x47]],
  jpg: [[0xff, 0xd8, 0xff]],
  jpeg: [[0xff, 0xd8, 0xff]],
  gif: [[0x47, 0x49, 0x46, 0x38]],
  webp: [[0x52, 0x49, 0x46, 0x46]],
  pdf: [[0x25, 0x50, 0x44, 0x46]],
  psd: [[0x38, 0x42, 0x50, 0x53]],
  zip: [ZIP],
  docx: [ZIP],
  xlsx: [ZIP],
  pptx: [ZIP],
  odt: [ZIP],
  ods: [ZIP],
  odp: [ZIP],
};
const TEXT = new Set(['txt', 'md', 'csv', 'svg']);
const EXECUTABLE = [[0x4d, 0x5a], [0x7f, 0x45, 0x4c, 0x46], [0xcf, 0xfa, 0xed, 0xfe], [0x23, 0x21]]; // MZ, ELF, Mach-O, #!

function startsWith(buf: Buffer, sig: number[]): boolean {
  return sig.every((b, i) => buf[i] === b);
}

export function validateUpload(name: string, buf: Buffer): { ext: string; mime: string; inline: boolean } {
  const ext = name.toLowerCase().split('.').pop() ?? '';
  const type = name.includes('.') ? TYPES[ext] : undefined;
  if (!type) throw new AppException(422, 'FILE_TYPE_NOT_ALLOWED', 'Tipo de arquivo não permitido. Envie imagens, PDFs, documentos, arquivos de design ou ZIP.');
  if (buf.length === 0) throw new AppException(422, 'FILE_EMPTY', 'O arquivo está vazio.');
  if (buf.length > type.max) throw new AppException(413, 'FILE_TOO_LARGE', `Arquivos .${ext} podem ter no máximo ${type.max / MB} MB.`);
  if (EXECUTABLE.some((s) => startsWith(buf, s)) || (MAGIC[ext] && !MAGIC[ext].some((s) => startsWith(buf, s)))) {
    throw new AppException(422, 'FILE_CONTENT_MISMATCH', 'O conteúdo do arquivo não corresponde à extensão.');
  }
  if (TEXT.has(ext) && buf.subarray(0, 8192).includes(0)) throw new AppException(422, 'FILE_CONTENT_MISMATCH', 'O conteúdo do arquivo não corresponde à extensão.');
  return { ext, mime: type.mime, inline: type.inline === true };
}

/** Nome seguro para o header Content-Disposition (RFC 6266/5987). */
function disposition(kind: 'inline' | 'attachment', name: string): string {
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

@Controller('workspaces/:workspaceId/files')
@UseGuards(WorkspaceMemberGuard)
export class FilesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private s3() {
    if (!this.storage.client || !this.storage.bucket) {
      throw new AppException(503, 'STORAGE_NOT_CONFIGURED', 'O armazenamento de arquivos ainda não foi configurado no servidor.');
    }
    return { client: this.storage.client, bucket: this.storage.bucket };
  }

  @Get()
  async list(@Scope() scope: WorkspaceScope, @Query('projectId') projectId?: string, @Query('q') q?: string) {
    const where: Record<string, unknown> = inScope(scope, {});
    if (projectId) where.projectId = projectId === 'null' ? null : projectId;
    if (q) where.name = { contains: q.slice(0, 100) };
    const data = await this.prisma.db.storedFile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 1000,
      select: { id: true, name: true, mimeType: true, size: true, projectId: true, createdAt: true, project: { select: { id: true, name: true } } },
    });
    return { data };
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 200 * MB, files: 1 } }))
  async upload(@Scope() scope: WorkspaceScope, @UploadedFile() file: Upload | undefined, @Query('projectId') projectId?: string) {
    if (!file) throw new AppException(422, 'FILE_REQUIRED', 'Escolha um arquivo para enviar.');
    const { client, bucket } = this.s3();
    // Remove barras e caracteres de controle do nome (o nome só vai para o banco e para o download).
    // eslint-disable-next-line no-control-regex
    const name = Buffer.from(file.originalname, 'latin1').toString('utf8').replace(/[\\/\x00-\x1f]/g, '_').slice(0, 255);
    const { mime } = validateUpload(name, file.buffer);
    const pid = projectId || null;
    await assertRefs(this.prisma, scope, { projectId: pid }, { projectId: 'project' });

    const row = await this.prisma.db.storedFile.create({
      data: { workspaceId: scope.workspaceId, projectId: pid, name, mimeType: mime, size: file.size, sha256: createHash('sha256').update(file.buffer).digest('hex'), storageKey: 'pendente' },
    });
    const key = StorageService.objectKey(scope.workspaceId, row.id, 1);
    try {
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: file.buffer, ContentType: mime }));
    } catch (err) {
      await this.prisma.db.storedFile.delete({ where: { id: row.id } });
      throw err;
    }
    await this.prisma.db.storedFile.update({ where: { id: row.id }, data: { storageKey: key } });
    return { id: row.id, name, mimeType: mime, size: file.size, projectId: pid, createdAt: row.createdAt };
  }

  /** Download pela API (o bucket nunca fica exposto). SVG e outros formatos sempre como anexo. */
  @Get(':id/download')
  async download(@Scope() scope: WorkspaceScope, @Param('id') id: string, @Query('inline') inline: string | undefined, @Res() res: Response): Promise<void> {
    const f = foundOr404(await this.prisma.db.storedFile.findFirst({ where: inScope(scope, { id }) }), 'Arquivo');
    const { client, bucket } = this.s3();
    const obj = await client.send(new GetObjectCommand({ Bucket: bucket, Key: f.storageKey }));
    const canInline = inline === '1' && /^(image\/(png|jpeg|webp|gif|avif)|application\/pdf)$/.test(f.mimeType);
    res.setHeader('content-type', f.mimeType);
    res.setHeader('content-length', String(f.size));
    res.setHeader('content-disposition', disposition(canInline ? 'inline' : 'attachment', f.name));
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('content-security-policy', "default-src 'none'; sandbox");
    res.setHeader('cache-control', 'private, no-store');
    (obj.Body as Readable).pipe(res);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Scope() scope: WorkspaceScope, @Param('id') id: string): Promise<void> {
    const f = foundOr404(await this.prisma.db.storedFile.findFirst({ where: inScope(scope, { id }) }), 'Arquivo');
    await this.prisma.db.storedFile.delete({ where: { id: f.id } });
    if (this.storage.client && this.storage.bucket && f.storageKey !== 'pendente') {
      await this.storage.client.send(new DeleteObjectCommand({ Bucket: this.storage.bucket, Key: f.storageKey })).catch(() => undefined);
    }
  }
}
