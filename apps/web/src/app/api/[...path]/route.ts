/**
 * Proxy da web para a API (ADR-002: o navegador só fala com a própria origem).
 * Lê API_ORIGIN a cada requisição — a mesma imagem Docker funciona em qualquer ambiente
 * (rewrites do next.config ficariam congelados no momento do build).
 */
const HOP_BY_HOP = new Set(["connection", "keep-alive", "transfer-encoding", "upgrade", "proxy-connection", "te", "trailer", "host", "content-length"]);

function apiOrigin(): string {
  return (process.env.API_ORIGIN ?? "http://localhost:4000").replace(/\/+$/, "");
}

async function proxy(req: Request, ctx: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path } = await ctx.params;
  const incoming = new URL(req.url);
  const target = `${apiOrigin()}/api/${path.map(encodeURIComponent).join("/")}${incoming.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  });
  headers.set("x-forwarded-host", incoming.host);
  headers.set("x-forwarded-proto", incoming.protocol.replace(":", ""));

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? req.body : undefined,
      redirect: "manual",
      cache: "no-store",
      // Sem resposta em 15 s: devolve 502 em vez de deixar a tela carregando para sempre.
      signal: AbortSignal.any([req.signal, AbortSignal.timeout(15_000)]),
      // Necessário para enviar o corpo como stream no fetch do Node.
      ...(hasBody ? { duplex: "half" } : {}),
    } as RequestInit);
  } catch {
    return Response.json(
      { type: "about:blank", title: "Serviço indisponível", status: 502, code: "API_UNREACHABLE", detail: "Não foi possível falar com a API agora. Tente novamente em instantes." },
      { status: 502, headers: { "content-type": "application/problem+json" } },
    );
  }

  const out = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase()) && key.toLowerCase() !== "content-encoding") out.append(key, value);
  });
  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
