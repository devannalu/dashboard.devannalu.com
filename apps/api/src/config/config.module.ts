import { DynamicModule, Global, Module } from '@nestjs/common';
import { ENV, type Env } from './env.js';

/** Disponibiliza o `Env` já validado para injeção (`@Inject(ENV)`). */
@Global()
@Module({})
export class ConfigModule {
  static forRoot(env: Env): DynamicModule {
    return { module: ConfigModule, providers: [{ provide: ENV, useValue: env }], exports: [ENV] };
  }
}
