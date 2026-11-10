import Link from "next/link";

/** Página 404 em pt-BR, no visual do Studio OS. */
export default function NaoEncontrado() {
  return (
    <main className="mx-auto grid min-h-screen max-w-xl content-center gap-5 px-4 text-center">
      <p className="label-mono">Erro 404</p>
      <h1 className="font-display text-5xl leading-none font-black tracking-tighter lowercase">
        página <em className="font-script text-7xl font-normal tracking-normal normal-case not-italic text-accent-text">perdida</em>
      </h1>
      <p className="text-text-2">Este endereço não existe ou foi movido.</p>
      <Link href="/" className="justify-self-center rounded-xl bg-accent px-5 py-2.5 font-bold text-white hover:bg-accent-hover">
        Voltar ao início
      </Link>
    </main>
  );
}
