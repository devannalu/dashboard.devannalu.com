import Image from "next/image";
import { ApiStatus } from "@/components/api-status";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Página temporária da fundação técnica (M1).
 * Será substituída pelo Dashboard quando autenticação e módulos existirem.
 */
export default function Home() {
  return (
    <main className="mx-auto grid min-h-screen max-w-3xl content-center gap-6 px-4 py-12 sm:px-8">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Image src="/brand/cereja-8.png" alt="" width={44} height={60} priority className="h-auto w-11 drop-shadow" />
          <div className="leading-none">
            <span className="block font-script text-5xl leading-[0.8] text-accent-text">Annalu</span>
            <span className="font-display text-sm font-black lowercase tracking-tight">studio os</span>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <section className="glass rounded-3xl p-6 sm:p-8">
        <p className="label-mono mb-3">Fundação técnica · M1</p>
        <h1 className="font-display text-4xl font-black lowercase leading-none tracking-tighter sm:text-6xl">
          em <em className="font-script text-6xl font-normal normal-case not-italic tracking-normal text-accent-text sm:text-8xl">construção</em>
        </h1>
        <p className="mt-4 text-text-2">
          A base do Studio OS está no ar: web, API e contratos compartilhados. O Dashboard aparece aqui assim que o login e os primeiros módulos estiverem prontos.
        </p>
      </section>

      <section className="glass rounded-3xl p-6 sm:p-8" aria-labelledby="status-titulo">
        <h2 id="status-titulo" className="label-mono mb-4">Estado dos serviços</h2>
        <ApiStatus />
      </section>
    </main>
  );
}
