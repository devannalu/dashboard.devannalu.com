import { ApiStatus } from "@/components/api-status";
import { Card, CardHeader } from "@/components/ui/display";

/**
 * Início provisório. Mostra só dados reais (estado dos serviços).
 * O Dashboard completo (doc 03 §1) entra no M9, quando os módulos existirem.
 */
export default function Inicio() {
  return (
    <>
      <Card className="justify-self-start max-w-full">
        <p className="label-mono mb-3">Fundação técnica · M1</p>
        <h1 className="font-display text-4xl leading-none font-black tracking-tighter lowercase text-shadow-[0_0_10px_color-mix(in_srgb,currentColor_18%,transparent)] sm:text-6xl">
          em <em className="font-script text-6xl font-normal tracking-normal normal-case not-italic text-accent-text sm:text-8xl">construção</em>
        </h1>
        <p className="mt-4 max-w-2xl text-text-2">
          A base do Studio OS está no ar: web, API, banco e o visual aprovado. Os módulos aparecem no menu conforme ficam prontos; o login vem no próximo marco.
        </p>
      </Card>

      <Card aria-labelledby="status-titulo" className="max-w-3xl">
        <CardHeader id="status-titulo" title="Estado dos serviços" />
        <ApiStatus />
      </Card>
    </>
  );
}
