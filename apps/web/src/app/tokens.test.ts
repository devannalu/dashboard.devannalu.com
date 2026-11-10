import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Contraste dos tokens (WCAG 2.2 AA): texto normal ≥ 4,5:1.
 * Lê os valores direto do globals.css para o teste acompanhar qualquer mudança de cor.
 */
const css = readFileSync(resolve(import.meta.dirname, "globals.css"), "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`Bloco não encontrado: ${selector}`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  const vars: Record<string, string> = {};
  for (const m of css.slice(open + 1, close).matchAll(/--([\w-]+):\s*([^;]+);/g)) vars[m[1]!] = m[2]!.trim();
  return vars;
}

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}
function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

const light = block(":root {");
const dark = { ...light, ...block(':root[data-theme="dark"]') };

describe.each([
  ["claro", light],
  ["escuro", dark],
])("tema %s", (_nome, t) => {
  it.each([
    ["texto principal sobre o fundo", "text", "bg"],
    ["texto secundário sobre o fundo", "text-2", "bg"],
    ["texto de destaque sobre o fundo", "accent-text", "bg"],
    ["perigo sobre o fundo", "danger", "bg"],
    ["sucesso sobre o fundo", "success", "bg"],
  ])("%s ≥ 4,5:1", (_d, fg, bg) => {
    expect(contrast(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(4.5);
  });

  it("texto branco sobre o botão primário ≥ 4,5:1", () => {
    expect(contrast("#ffffff", t.accent!)).toBeGreaterThanOrEqual(4.5);
  });
});
