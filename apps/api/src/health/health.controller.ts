import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { HealthCheck } from '@studio/contracts';
import type { Response } from 'express';
import { PrismaService } from '../database/prisma.service.js';

const VERSION = process.env.npm_package_version ?? '0.0.0';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Vivo: o processo responde. */
  @Get()
  live(): HealthCheck {
    return { status: 'ok', checks: { api: 'ok' }, version: VERSION, time: new Date().toISOString() };
  }

  /** Pronto: dependências disponíveis. Responde 503 se alguma estiver fora do ar. */
  @Get('ready')
  async ready(@Res({ passthrough: true }) res: Response): Promise<HealthCheck> {
    // Storage entra no épico de arquivos (E11).
    const checks: HealthCheck['checks'] = { api: 'ok', database: await this.prisma.ping(), storage: 'skipped' };
    const down = Object.values(checks).includes('down');
    if (down) res.status(HttpStatus.SERVICE_UNAVAILABLE);
    return { status: down ? 'down' : 'ok', checks, version: VERSION, time: new Date().toISOString() };
  }
}
