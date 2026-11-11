import { Suspense } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { SessionProvider } from "@/lib/session";

function Loading() {
  return (
    <div className="grid min-h-screen place-items-center" aria-live="polite">
      <p className="label-mono">Carregando…</p>
    </div>
  );
}

/**
 * Telas do aplicativo (dentro do menu e da colagem). Exigem sessão; login e primeiro acesso ficam em (auth).
 * O Suspense dá ao build uma "casca" estática (Cache Components): rotas dinâmicas como /projetos/[id]
 * leem a URL só no navegador.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<Loading />}>
      <SessionProvider>
        <AppShell>{children}</AppShell>
      </SessionProvider>
    </Suspense>
  );
}
