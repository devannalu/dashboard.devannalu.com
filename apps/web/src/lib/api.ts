/**
 * Cliente HTTP da interface. Fala só com a própria origem (`/api/*`, proxy para a API — ADR-002).
 * Mutações levam o token anti-CSRF no header `x-csrf-token` (obtido uma vez em GET /api/auth/csrf).
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

let csrfToken: Promise<string> | null = null;

function getCsrf(): Promise<string> {
  csrfToken ??= fetch("/api/auth/csrf", { cache: "no-store", credentials: "same-origin" })
    .then((r) => r.json() as Promise<{ csrfToken: string }>)
    .then((b) => b.csrfToken)
    .catch((e: unknown) => {
      csrfToken = null;
      throw e;
    });
  return csrfToken;
}

async function toError(res: Response): Promise<ApiError> {
  let body: { code?: string; detail?: string; title?: string; errors?: { path: string; message: string }[] } = {};
  try {
    body = (await res.json()) as typeof body;
  } catch {
    /* resposta sem JSON */
  }
  const fields = Object.fromEntries((body.errors ?? []).map((e) => [e.path, e.message]));
  return new ApiError(res.status, body.code ?? `HTTP_${res.status}`, body.detail ?? body.title ?? "Algo deu errado. Tente novamente.", fields);
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export async function api<T = unknown>(path: string, opts: { method?: Method; body?: unknown; form?: FormData; signal?: AbortSignal } = {}): Promise<T> {
  const method = opts.method ?? "GET";
  const headers: Record<string, string> = {};
  if (method !== "GET") headers["x-csrf-token"] = await getCsrf();
  if (opts.body !== undefined) headers["content-type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers,
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
      credentials: "same-origin",
      cache: "no-store",
      signal: opts.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError(0, "NETWORK", "Sem conexão com o servidor. Verifique a internet e tente de novo.");
  }

  if (res.status === 403 && method !== "GET") {
    // Token CSRF pode ter mudado (ex.: cookie expirou): renova uma vez e repete.
    const err = await toError(res);
    if (err.code === "CSRF_REJECTED" && !(opts as { _retry?: boolean })._retry) {
      csrfToken = null;
      return api<T>(path, { ...opts, _retry: true } as typeof opts);
    }
    throw err;
  }
  if (res.status === 401 && !path.startsWith("/api/auth/")) {
    window.dispatchEvent(new CustomEvent("sessao-expirada"));
  }
  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Mensagem amigável de qualquer erro. */
export function errorMessage(e: unknown): string {
  return e instanceof ApiError ? e.message : "Algo deu errado. Tente novamente.";
}
