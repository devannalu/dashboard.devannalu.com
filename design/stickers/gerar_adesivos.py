"""Recorta o fundo das referências e gera adesivos PNG com borda branca (die-cut)."""
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

SRC = Path(sys.argv[1])
OUT = Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)
MAX = 720      # lado máximo antes da borda
BORDER = 11    # espessura da borda branca (px)


def flood_bg(rgb: np.ndarray, tol: int) -> np.ndarray:
    """Máscara True para pixels de fundo conectados às bordas (cor próxima à do canto)."""
    h, w, _ = rgb.shape
    ref = np.median(np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]]), axis=0)
    close = (np.abs(rgb.astype(int) - ref).max(axis=2) <= tol)
    bg = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if close[y, x] and not bg[y, x]:
                bg[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if close[y, x] and not bg[y, x]:
                bg[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and close[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True; q.append((ny, nx))
    return bg


def drop_specks(mask: Image.Image, keep_ratio: float = 0.03) -> Image.Image:
    """Remove manchas soltas: componentes menores que keep_ratio do maior componente."""
    a = np.asarray(mask) > 127
    h, w = a.shape
    lab = np.zeros((h, w), np.int32)
    sizes = [0]
    cur = 0
    for y0, x0 in zip(*np.nonzero(a)):
        if lab[y0, x0]:
            continue
        cur += 1; n = 0
        q = deque([(y0, x0)]); lab[y0, x0] = cur
        while q:
            y, x = q.popleft(); n += 1
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and a[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = cur; q.append((ny, nx))
        sizes.append(n)
    sizes = np.array(sizes)
    keep = sizes >= sizes.max() * keep_ratio
    keep[0] = False
    return Image.fromarray(np.where(keep[lab], 255, 0).astype("uint8"))


def die_cut(img: Image.Image, mask: Image.Image, border: int) -> Image.Image:
    pad = border * 2 + 4
    w, h = img.size
    canvas = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    m = Image.new("L", canvas.size, 0); m.paste(mask, (pad, pad))
    # fecha buracos pequenos (halftone) antes de dilatar para a borda ficar lisa
    solid = m.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(3))
    outline = solid
    for _ in range(border // 2):
        outline = outline.filter(ImageFilter.MaxFilter(5))
    outline = outline.filter(ImageFilter.GaussianBlur(1.2)).point(lambda v: 255 if v > 110 else 0)
    outline = drop_specks(outline)
    m = ImageChops.multiply(m, outline)
    outline = outline.filter(ImageFilter.GaussianBlur(0.7))
    white = Image.new("RGBA", canvas.size, (255, 255, 255, 255)); white.putalpha(outline)
    fg = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    rgba = img.convert("RGBA"); rgba.putalpha(m.crop((pad, pad, pad + w, pad + h))); fg.paste(rgba, (pad, pad))
    out = Image.alpha_composite(white, fg)
    return out.crop(out.getbbox())


def square_sticker(img: Image.Image, border: int, radius: int = 34) -> Image.Image:
    """Adesivo 'foto' quadrado com cantos arredondados (mantém o fundo da arte)."""
    w, h = img.size
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), radius, fill=255)
    return die_cut(img, m, border)


def load(name: str, crop=None) -> Image.Image:
    im = Image.open(SRC / name).convert("RGB")
    if crop:  # recorte (esquerda, topo, direita, base) em fração da imagem
        w, h = im.size
        im = im.crop((int(crop[0] * w), int(crop[1] * h), int(crop[2] * w), int(crop[3] * h)))
    im.thumbnail((MAX, MAX), Image.LANCZOS)
    return im


# nome de saída, arquivo, modo, tolerância, recorte opcional
JOBS = [
    ("cerejas-laco", "1.png", "cut", 40),
    ("estrela", "2.png", "cut", 40),
    ("boneco-capuz", "3.png", "cut", 12),
    ("leopardo", "4.png", "square", 0),
    ("espiral", "5.png", "cut", 40),
    ("kanji-amor", "6.png", "key", 60),
    ("estrelas-trilha", "9.png", "cut", 40),
    ("tribal-coracao", "10.png", "cut", 45),
    ("kanji-textura", "11.png", "cut", 30),
    ("lirio", "12.png", "cut", 40, (0.01, 0.245, 0.99, 0.795)),
    ("estrela-espiral", "13.png", "cut", 28),
    ("olhos", "14.png", "cut", 40),
    ("loser", "15.png", "cut", 40),
    ("silhueta", "16.png", "cut", 48),
    ("cereja-8", "18.png", "key", 22, (0.28, 0.27, 0.72, 0.6)),
]

for out_name, src, mode, tol, *rest in JOBS:
    im = load(src, rest[0] if rest else None)
    if mode == "square":
        st = square_sticker(im, BORDER)
    else:
        arr = np.asarray(im)
        if mode == "key":  # remove a cor do canto em toda a imagem (inclui áreas fechadas)
            ref = np.median(np.concatenate([arr[0], arr[-1], arr[:, 0], arr[:, -1]]), axis=0)
            bg = np.abs(arr.astype(int) - ref).max(axis=2) <= tol
        else:
            bg = flood_bg(arr, tol)
        mask = Image.fromarray(np.where(bg, 0, 255).astype("uint8"))
        mask = mask.filter(ImageFilter.GaussianBlur(0.6))
        st = die_cut(im, mask, BORDER)
    st.save(OUT / f"{out_name}.png", optimize=True)
    print(out_name, st.size)
