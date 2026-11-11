"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { api, errorMessage } from "@/lib/api";

/** Login com e-mail e senha (D-19). Mensagem de erro genérica, sem dizer se o e-mail existe. */
export default function Entrar() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sem conta criada ainda → primeiro acesso.
  useEffect(() => {
    fetch("/api/auth/setup", { cache: "no-store" })
      .then((r) => r.ok && router.replace("/configuracao-inicial"))
      .catch(() => undefined);
  }, [router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api("/api/auth/login", { method: "POST", body: { email, password } });
      const back = new URLSearchParams(window.location.search).get("voltar");
      router.replace(back && back.startsWith("/") && !back.startsWith("//") ? back : "/");
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <h1 className="font-display text-3xl font-black tracking-tighter lowercase">
        bem-vinda <em className="font-script text-5xl font-normal tracking-normal normal-case not-italic text-accent-text">de volta</em>
      </h1>
      {error && (
        <p role="alert" className="rounded-xl border border-danger px-3 py-2 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
      <Field label="E-mail" required>
        <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
      </Field>
      <Field label="Senha" required>
        <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </Field>
      <Button type="submit" size="lg" loading={loading}>
        Entrar
      </Button>
      <p className="text-xs text-text-2">Esqueceu a senha? A redefinição é feita no servidor (veja o guia de operação).</p>
    </form>
  );
}
