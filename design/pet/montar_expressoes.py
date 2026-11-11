"""Monta o pet 2D (D-41) a partir das camadas da owner em design/pet/camadas.

Uso: python design/pet/montar_expressoes.py
Saídas:
  design/pet/camadas/oculos.png            camada de óculos (desenhada aqui, alinhada ao rosto)
  apps/web/public/pet/<expressao>.webp      uma imagem por humor (corpo + olhos + boca + óculos)
  design/pet/previa-expressoes.png         folha com as 6 expressões lado a lado
Todas as camadas têm 1122×1402 px e fundo transparente, alinhadas entre si.
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).parent
LAYERS = HERE / "camadas"
WEB = HERE.parent.parent / "apps" / "web" / "public" / "pet"
W, H = 1122, 1402

# Por decisão da owner (11/11/2026), por enquanto só a expressão padrão vai para o app.
# As outras combinações ficam guardadas para quando houver camadas melhores.
EXPRESSOES = {
    "tranquila": ("olhos-1-tranquila", "boca-1-bico"),
}
EXPRESSOES_FUTURAS = {
    "feliz": ("olhos-2-aberta", "boca-2-sorriso"),
    "preocupada": ("olhos-3-preocupada", "boca-3-fechada"),
    "faminta": ("olhos-2-aberta", "boca-5-aberta"),
    "sonolenta": ("olhos-4-sonolenta", "boca-4-entreaberta"),
    "fraquinha": ("olhos-4-sonolenta", "boca-3-fechada"),
}

# Óculos: medidos nas camadas de olhos (área dos olhos sem as sobrancelhas, união das 4 variações).
# Olho esquerdo ≈ x 414–513 / y 180–235; direito ≈ x 560–657 / y 195–249 (rosto levemente inclinado).
LENS = ((464, 205), (609, 219))
RX, RY = 57, 28
TILT = math.atan2(LENS[1][1] - LENS[0][1], LENS[1][0] - LENS[0][0])   # armação acompanha a inclinação do rosto
FACE_EDGE = (376, 668)        # onde as hastes somem (borda do rosto / cabelo) na altura dos olhos
S = 4                          # superamostragem para bordas suaves


def rot(x, y):
    return x * math.cos(TILT) - y * math.sin(TILT), x * math.sin(TILT) + y * math.cos(TILT)


def lens_points(cx, cy, side):
    """Lente oval com o canto externo superior erguido (gatinho), girada com o rosto."""
    pts = []
    for k in range(180):
        t = 2 * math.pi * k / 180
        x, y = math.cos(t) * RX, math.sin(t) * RY
        outer = max(0.0, side * x / RX)
        if y < 0:
            y -= 8 * outer ** 2.4
        else:
            y *= 0.9
        xr, yr = rot(x, y)
        pts.append(((cx + xr) * S, (cy + yr) * S))
    return pts


def build_glasses() -> Image.Image:
    big = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(big)
    dark, mid, light = (112, 114, 124, 255), (198, 200, 208, 255), (246, 247, 250, 255)

    def stroke(pts, w_dark=3.0, w_mid=1.8):
        d.line(pts, fill=dark, width=int(w_dark * S), joint="curve")
        d.line(pts, fill=mid, width=int(w_mid * S), joint="curve")

    lenses = []
    for side, (cx, cy) in zip((-1, 1), LENS):
        pts = lens_points(cx, cy, side)
        lenses.append(pts)
        d.polygon(pts, fill=(255, 255, 255, 14))
    for pts in lenses:
        stroke(pts + [pts[0]])
        d.line([p for i, p in enumerate(pts) if 105 < i < 158], fill=light, width=int(0.8 * S), joint="curve")
    # ponte: arco curto entre os cantos internos, acima do nariz
    (lx, ly), (rx_, ry_) = LENS
    ia = rot(RX - 3, -8); ib = rot(-(RX - 3), -8)
    a = (lx + ia[0], ly + ia[1]); b = (rx_ + ib[0], ry_ + ib[1])
    bridge = [((a[0] + (b[0] - a[0]) * t) * S, (a[1] + (b[1] - a[1]) * t - 5 * math.sin(math.pi * t)) * S) for t in [i / 20 for i in range(21)]]
    stroke(bridge, 2.8, 1.7)
    # hastes: do canto externo até a borda do rosto (dali em diante ficam escondidas no cabelo)
    for side, (cx, cy), edge in zip((-1, 1), LENS, FACE_EDGE):
        ox, oy = rot(side * (RX - 2), -12)
        x0, y0 = cx + ox, cy + oy
        x1 = edge
        y1 = y0 + (x1 - x0) * math.tan(TILT) + 2
        if abs(x1 - x0) > 2:
            stroke([(x0 * S, y0 * S), (x1 * S, y1 * S)], 2.8, 1.7)
    # sem plaquetas visíveis: em tamanho pequeno pareciam piercing no nariz
    img = big.resize((W, H), Image.LANCZOS)
    shadow = img.getchannel("A").point(lambda v: int(v * 0.22)).filter(ImageFilter.GaussianBlur(3))
    sh = Image.new("RGBA", (W, H), (60, 30, 20, 0))
    sh.putalpha(shadow)
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    out.alpha_composite(sh, (2, 4))
    out.alpha_composite(img)
    return out


def main():
    glasses = build_glasses()
    glasses.save(LAYERS / "oculos.png")
    base = Image.open(LAYERS / "corpo-sem-rosto.png").convert("RGBA")
    WEB.mkdir(parents=True, exist_ok=True)
    # Imagem padrão do app = a boneca completa original da owner, sem nenhuma alteração (pedido de 11/11/2026).
    original = Image.open(LAYERS / "boneca-completa.png").convert("RGBA")
    original.resize((W // 2, H // 2), Image.LANCZOS).save(WEB / "tranquila.webp", "WEBP", quality=90, method=6)
    tiles = []
    for name, (eyes, mouth) in EXPRESSOES.items():
        im = base.copy()
        for layer in (eyes, mouth):
            im.alpha_composite(Image.open(LAYERS / f"{layer}.png").convert("RGBA"))
        im.alpha_composite(glasses)
        # versão web: metade do tamanho, WebP com transparência
        if name != "tranquila":  # a padrão é a original (acima); montagens só para expressões futuras
            im.resize((W // 2, H // 2), Image.LANCZOS).save(WEB / f"{name}.webp", "WEBP", quality=88, method=6)
        tiles.append((name, im.crop((330, 20, 790, 460))))
    sheet = Image.new("RGBA", (460 * min(3, len(tiles)), 440 * ((len(tiles) + 2) // 3)), (239, 232, 227, 255))
    for i, (name, tile) in enumerate(tiles):
        sheet.alpha_composite(tile, ((i % 3) * 460, (i // 3) * 440))
    sheet.save(HERE / "previa-expressoes.png")
    for f in sorted(WEB.glob("*.webp")):
        print(f.name, f.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
