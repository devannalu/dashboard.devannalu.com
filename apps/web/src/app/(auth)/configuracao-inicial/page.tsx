"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { api, ApiError, errorMessage } from "@/lib/api";

/**
 * Primeiro acesso (E1-1): só o e-mail de OWNER_EMAIL, com o token de configuração do servidor.
 * Depois de criada a conta, a API responde 404 e esta tela manda para o login.
 */
export default function ConfiguracaoInicial() {
  const router = useRouter();
  const [v, setV] = useState({ email: "", setupToken: "", name: "", password: "", confirm: "", workspaceName: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV((p) => ({ ...p, [k]: e.target.value }));

  // Só sai desta tela se a API confirmar que o primeiro acesso já foi feito (404).
  // Erro do servidor (ex.: banco fora do ar) mostra aviso e mantém o formulário.
  useEffect(() => {
    fetch("/api/auth/setup", { cache: "no-store" })
      .then((r) => {
        if (r.status === 404) router.replace("/entrar");
        else if (!r.ok) setGeneral("O servidor está com problema agora. Tente de novo em instantes.");
      })
      .catch(() => setGeneral("Não foi possível falar com o servidor. Confira sua conexão."));
  }, [router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setGeneral(null);
    if (v.password !== v.confirm) {
      setErrors({ confirm: "As senhas não são iguais." });
      return;
    }
    setLoading(true);
    try {
      await api("/api/auth/setup", {
        method: "POST",
        body: { email: v.email, setupToken: v.setupToken, name: v.name, password: v.password, workspaceName: v.workspaceName || undefined },
      });
      router.replace("/");
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields);
      setGeneral(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <div>
        <h1 className="font-display text-3xl font-black tracking-tighter lowercase">
          primeiro <em className="font-script text-5xl font-normal tracking-normal normal-case not-italic text-accent-text">acesso</em>
        </h1>
        <p className="mt-1 text-sm text-text-2">Crie sua senha. Esta tela só funciona uma vez.</p>
      </div>
      {general && (
        <p role="alert" className="rounded-xl border border-danger px-3 py-2 text-sm font-semibold text-danger">
          {general}
        </p>
      )}
      <Field label="Seu nome" required error={errors.name}>
        <Input value={v.name} onChange={set("name")} autoComplete="name" required autoFocus />
      </Field>
      <Field label="E-mail" required error={errors.email} hint="O e-mail configurado no servidor.">
        <Input type="email" value={v.email} onChange={set("email")} autoComplete="username" required />
      </Field>
      <Field label="Token de configuração" required error={errors.setupToken} hint="Valor de SETUP_TOKEN no servidor.">
        <Input value={v.setupToken} onChange={set("setupToken")} autoComplete="off" required />
      </Field>
      <Field label="Senha" required error={errors.password} hint="Mínimo de 12 caracteres. Uma frase longa é ótima.">
        <Input type="password" value={v.password} onChange={set("password")} autoComplete="new-password" required />
      </Field>
      <Field label="Confirmar senha" required error={errors.confirm}>
        <Input type="password" value={v.confirm} onChange={set("confirm")} autoComplete="new-password" required />
      </Field>
      <Field label="Nome do seu espaço" hint="Opcional. Ex.: Ateliê Annalu">
        <Input value={v.workspaceName} onChange={set("workspaceName")} />
      </Field>
      <Button type="submit" size="lg" loading={loading}>
        Criar conta e entrar
      </Button>
    </form>
  );
}
