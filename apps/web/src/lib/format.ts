/** Formatação pt-BR (datas dd/mm/aaaa, fuso America/Sao_Paulo por padrão). */

const TZ = "America/Sao_Paulo";

/** `aaaa-mm-dd` (ou ISO de data pura vinda do banco) → `dd/mm/aaaa`. */
export function fmtDate(value: string | null | undefined): string {
  if (!value) return "";
  const [y, m, d] = value.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** Data curta `dd/mm`. */
export function fmtDayMonth(value: string): string {
  const [, m, d] = value.slice(0, 10).split("-");
  return `${d}/${m}`;
}

/** ISO com hora → `dd/mm/aaaa, 14:30` no fuso local. */
export function fmtDateTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

export function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

/** Hoje em `aaaa-mm-dd` no fuso local. */
export function todayYmd(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Dia (`aaaa-mm-dd`) de um ISO com hora, no fuso local. */
export function ymdOf(iso: string): string {
  return iso.length === 10 ? iso : todayYmd(new Date(iso));
}

export function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** `aaaa-mm-dd` + `hh:mm` locais (Brasil, -03:00) → ISO com fuso. */
export function localToIso(ymd: string, hm: string): string {
  return new Date(`${ymd}T${hm || "00:00"}:00-03:00`).toISOString();
}

/** ISO → valores para `<input type="date">` e `<input type="time">`. */
export function isoToLocal(iso: string): { date: string; time: string } {
  return { date: ymdOf(iso), time: fmtTime(iso) };
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

export const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** Rótulo relativo para vencimentos: "hoje", "amanhã", "ontem", "há 3 dias", senão dd/mm. */
export function fmtDue(ymd: string, today = todayYmd()): string {
  const diff = Math.round((Date.parse(`${ymd.slice(0, 10)}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
  if (diff === 0) return "hoje";
  if (diff === 1) return "amanhã";
  if (diff === -1) return "ontem";
  if (diff < 0 && diff > -8) return `há ${-diff} dias`;
  return fmtDayMonth(ymd);
}
