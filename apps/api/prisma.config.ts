import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "prisma/config";

// O .env fica na raiz do monorepo (modelo em .env.example). Carregado com o recurso nativo do Node.
const rootEnv = resolve(import.meta.dirname, "../../.env");
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Sem DATABASE_URL, comandos que não acessam o banco (ex.: generate) continuam funcionando.
  datasource: { url: process.env.DATABASE_URL ?? "mysql://nao-configurado@localhost:3306/nao-configurado" },
});
