import type { WidgetId, WidgetSize } from "@studio/contracts";
import { describe, expect, it } from "vitest";
import { autoArrange, COLS, packRows } from "./auto-layout";

const ALL: WidgetId[] = ["atividade", "hoje", "calendario", "projetos", "kpi7", "agora", "captura", "notas"];

/** Confere que a soma das colunas fecha linhas completas de 12, sem buracos. */
function rowsAreFull(items: { size: WidgetSize }[]): boolean {
  let row = 0;
  for (const it of items) {
    row += COLS[it.size];
    if (row > 12) return false;
    if (row === 12) row = 0;
  }
  return row === 0;
}

describe("Organizar sozinho", () => {
  it("fecha os buracos mantendo os widgets e a ordem quando possível", () => {
    const input = ALL.map((id) => ({ id, size: "sm" as WidgetSize }));
    input[0] = { id: "atividade", size: "sm" };
    const out = packRows(input);
    expect(out.map((o) => o.id).sort()).toEqual([...ALL].sort());
    expect(rowsAreFull(out)).toBe(true);
    expect(out[0]!.id).toBe("atividade");
  });

  it("nunca deixa buraco, para qualquer combinação de tamanhos e quantidade", () => {
    const sizes: WidgetSize[] = ["sm", "md", "lg", "full"];
    for (let n = 1; n <= ALL.length; n++) {
      for (let seed = 0; seed < 64; seed++) {
        const items = ALL.slice(0, n).map((id, i) => ({ id, size: sizes[(seed >> (i % 6)) % 4]! }));
        const out = packRows(items);
        expect(out).toHaveLength(n);
        expect(rowsAreFull(out)).toBe(true);
      }
    }
  });

  it("cada clique seguinte mostra outra disposição, sempre completa", () => {
    const items = ALL.map((id) => ({ id, size: "md" as WidgetSize }));
    const a = autoArrange(items, 1);
    const b = autoArrange(items, 2);
    expect(a.map((x) => x.id)).not.toEqual(b.map((x) => x.id));
    expect(rowsAreFull(a)).toBe(true);
    expect(rowsAreFull(b)).toBe(true);
  });
});
