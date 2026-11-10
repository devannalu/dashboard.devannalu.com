"""Gera a boneca base do pet (Annalu Studio OS) no Blender.

Uso (sem interface):
  blender --background --factory-startup --python design/blender/boneca.py -- <pasta_saida> [render]

Saídas: boneca.blend, render_frente.png, render_34.png (e mais tarde boneca.glb).
Convenções: Z para cima, a boneca olha para -Y. Raio da cabeça ~1.
"""
import math
import random
import sys
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = Path(argv[0] if argv else ".").resolve()
OUT.mkdir(parents=True, exist_ok=True)
DO_RENDER = "render" in argv
random.seed(7)
np.random.seed(7)

CFG = {
    "skin": (0.96, 0.75, 0.68),
    "hair": (0.48, 0.03, 0.06),      # bordô/vermelho escuro
    "iris": (0.20, 0.36, 0.70),      # azul
    "lips": (0.74, 0.36, 0.37),
    "brow": (0.36, 0.16, 0.13),
}

# ------------------------------------------------------------------ utilitários
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj

def smooth(obj, level=2, render_level=None):
    obj.data.shade_smooth()
    m = obj.modifiers.new("Subdiv", "SUBSURF")
    m.levels = level
    m.render_levels = render_level if render_level is not None else level
    return m

def apply_mods(obj):
    bpy.context.view_layer.objects.active = obj
    for m in list(obj.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)

def mat(name, color, rough=0.4, coat=0.0, coat_rough=0.3, sss=0.0, metal=0.0, image=None, alpha_clip=False, double=False):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*color, 1)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    if coat:
        p.inputs["Coat Weight"].default_value = coat
        p.inputs["Coat Roughness"].default_value = coat_rough
    if sss:
        p.inputs["Subsurface Weight"].default_value = sss
        p.inputs["Subsurface Radius"].default_value = (0.9, 0.35, 0.25)
    if image is not None:
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = image
        nt.links.new(tex.outputs["Color"], p.inputs["Base Color"])
        if alpha_clip:
            gt = nt.nodes.new("ShaderNodeMath")
            gt.operation = "GREATER_THAN"
            gt.inputs[1].default_value = 0.5
            nt.links.new(tex.outputs["Alpha"], gt.inputs[0])
            nt.links.new(gt.outputs[0], p.inputs["Alpha"])
            m.surface_render_method = "DITHERED"
    m.use_backface_culling = not double
    return m

def image_from_array(name, arr):
    """arr: (h, w, 4) float32, linha 0 = topo."""
    h, w, _ = arr.shape
    img = bpy.data.images.new(name, w, h, alpha=True)
    img.pixels.foreach_set(np.ascontiguousarray(arr[::-1]).ravel().astype(np.float32))
    img.pack()
    return img

def bvh_of(obj):
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    return BVHTree.FromObject(obj.evaluated_get(dg), dg)

def surface(bvh, origin, direction, fallback):
    hit = bvh.ray_cast(origin, direction.normalized())
    return hit[0] if hit[0] is not None else origin + direction.normalized() * fallback

def sheet(name, cols, rows, pos_fn, uv_fn, material, subd=1, solid=0.0):
    """Malha em grade: pos_fn(i, j) -> Vector; uv_fn(i, j) -> (u, v)."""
    bm = bmesh.new()
    verts = [[bm.verts.new(pos_fn(i, j)) for i in range(cols)] for j in range(rows)]
    uv = bm.loops.layers.uv.new()
    for j in range(rows - 1):
        for i in range(cols - 1):
            f = bm.faces.new((verts[j][i], verts[j][i + 1], verts[j + 1][i + 1], verts[j + 1][i]))
            for loop, (ii, jj) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))):
                loop[uv].uv = uv_fn(ii, jj)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    obj = link(bpy.data.objects.new(name, me))
    obj.data.materials.append(material)
    if solid:
        so = obj.modifiers.new("Espessura", "SOLIDIFY")
        so.thickness = solid
        so.offset = -1
    if subd:
        smooth(obj, subd)
    else:
        obj.data.shade_smooth()
    return obj

# ------------------------------------------------------------------ texturas
def tex_hair(color, w=256, h=1024, tips=False, part=False):
    base = np.array(color)
    cols = np.random.rand(w)
    for _ in range(3):
        cols = (np.roll(cols, 1) + cols + np.roll(cols, -1)) / 3
    fine = np.random.rand(w) * 0.5 + 0.75
    shade = (0.78 + 0.45 * cols) * fine
    v = np.linspace(0, 1, h)[:, None]
    grad = 0.88 + 0.12 * v[::-1]
    rgb = np.clip(base[None, None, :] * shade[None, :, None] * grad[:, :, None], 0, 1)
    shine = np.exp(-((v - 0.32) ** 2) / 0.004)[:, :, None] * 0.18 * shade[None, :, None]
    rgb = np.clip(rgb + shine, 0, 1)
    a = np.ones((h, w))
    if tips:
        grp = np.repeat(np.random.rand(w // 6 + 1), 6)[:w]
        cut = 1 - (0.01 + 0.035 * grp + 0.015 * np.random.rand(w))
        a = (v.repeat(w, 1) < cut[None, :]).astype(float)
    if part:
        xs = np.arange(w)
        line = np.exp(-((xs - w / 2) ** 2) / 3.0)[None, :] * (v < 0.3)
        rgb = rgb * (1 - line[:, :, None] * 0.35) + np.array([0.85, 0.62, 0.55]) * line[:, :, None] * 0.35
    return np.dstack([rgb, a]).astype(np.float32)

def tex_iris(color, w=1024, h=512):
    u = np.linspace(0, 1, w)[None, :]
    v = np.linspace(1, 0, h)[:, None]
    ang = (1 - v) * math.pi               # 0 no polo frontal
    c = np.array(color)
    rgb = np.ones((h, w, 3)) * 0.97      # esclera
    rgb[...] *= (0.96 + 0.04 * (ang < 1.2))[..., None]
    iris_r, pupil_r = 0.62, 0.30
    t = np.clip(ang / iris_r, 0, 1)
    streak = 0.85 + 0.15 * np.sin(u * 2 * math.pi * 40 + np.random.rand() * 6)
    iris = c[None, None, :] * (0.55 + 0.75 * (1 - t))[..., None] * streak[..., None]
    ring = np.clip((t - 0.8) / 0.2, 0, 1)[..., None]
    iris = iris * (1 - ring * 0.75)
    inside = (ang < iris_r)[..., None]
    rgb = np.where(inside, iris, rgb)
    rgb = np.where((ang < pupil_r)[..., None], np.array([0.03, 0.02, 0.03]), rgb)
    return np.dstack([np.clip(rgb, 0, 1), np.ones((h, w))]).astype(np.float32)

def tex_skin(head, color, w=1024, h=512):
    """Pinta blush, sardas e nariz rosado usando a correspondência UV->direção da esfera original."""
    me = head.data
    uvl = me.uv_layers.active.data
    samples = []
    for poly in me.polygons:
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            samples.append((uvl[li].uv.x, uvl[li].uv.y, math.atan2(co.y, co.x), math.asin(max(-1, min(1, co.z / co.length)))))
    s = np.array(samples)
    best = None
    for sign in (1, -1):
        d = (s[:, 0] - sign * s[:, 2] / (2 * math.pi)) % 1.0
        z = np.exp(2j * math.pi * d)
        var = 1 - abs(z.mean())
        if best is None or var < best[0]:
            best = (var, sign, (np.angle(z.mean()) / (2 * math.pi)) % 1.0)
    _, sign, off = best
    uu = np.linspace(0, 1, w)[None, :]
    vv = np.linspace(1, 0, h)[:, None]
    phi = (uu - off) * 2 * math.pi / sign
    lat = (vv - 0.5) * math.pi
    dx, dy, dz = np.cos(lat) * np.cos(phi), np.cos(lat) * np.sin(phi), np.sin(lat) * np.ones_like(phi)
    base = np.array(color)
    rgb = np.ones((h, w, 3)) * base
    def spot(d, sharp):
        d = np.array(d) / np.linalg.norm(d)
        dot = dx * d[0] + dy * d[1] + dz * d[2]
        return np.exp((dot - 1) * sharp)
    blush = np.clip(spot((0.62, -0.62, -0.42), 9) + spot((-0.62, -0.62, -0.42), 9), 0, 1)
    nose = spot((0, -0.95, -0.3), 60)
    pink = np.array([0.93, 0.48, 0.48])
    rgb = rgb * (1 - 0.55 * blush[..., None]) + pink * 0.55 * blush[..., None]
    rgb = rgb * (1 - 0.35 * nose[..., None]) + pink * 0.35 * nose[..., None]
    # sardas
    fr = np.zeros((h, w))
    for _ in range(45):
        sd = random.choice((1, -1))
        d = np.array((sd * random.uniform(0.25, 0.7), -random.uniform(0.6, 0.85), -random.uniform(0.18, 0.42)))
        fr = np.maximum(fr, spot(d, 14000) * random.uniform(0.35, 0.7))
    brown = np.array([0.62, 0.36, 0.28])
    rgb = rgb * (1 - fr[..., None] * 0.6) + brown * fr[..., None] * 0.6
    return np.dstack([np.clip(rgb, 0, 1), np.ones((h, w))]).astype(np.float32)

# ------------------------------------------------------------------ cabeça
def build_head():
    bpy.ops.mesh.primitive_uv_sphere_add(segments=72, ring_count=48, radius=1.0)
    head = bpy.context.active_object
    head.name = "cabeca"
    # textura de pele pintada antes da deformação (usa a esfera perfeita)
    skin_img = image_from_array("pele", tex_skin(head, CFG["skin"]))
    for v in head.data.vertices:
        x, y, z = v.co
        # cabeça de boneca: crânio largo, bochechas cheias, queixo pequeno e frente achatada
        low = max(0.0, -z)
        x *= 1.07 * (1 - 0.3 * low ** 1.7)
        if y < 0:
            cheek = math.exp(-((z + 0.38) ** 2) / 0.08) * math.exp(-((abs(x) - 0.55) ** 2) / 0.12)
            y -= 0.07 * cheek
            if y < -0.62:
                y = -0.62 - (-y - 0.62) * 0.55
            if z < -0.55:
                y -= 0.06 * (-z - 0.55)
        y *= 0.94
        z *= 0.97
        if z < -0.3:
            z = -0.3 + (z + 0.3) * 0.72
        v.co = (x, y, z)
    skin = mat("pele", CFG["skin"], rough=0.45, coat=0.35, coat_rough=0.4, sss=0.2, image=skin_img)
    head.data.materials.append(skin)
    smooth(head, 1, 2)
    return head, skin

def build_face(head, skin):
    bvh = bvh_of(head)
    parts = []
    skin_plain = mat("pele_lisa", CFG["skin"], rough=0.5, coat=0.2, coat_rough=0.45, sss=0.2)
    # olhos grandes em amêndoa
    iris_img = image_from_array("iris", tex_iris(CFG["iris"]))
    eye_m = mat("olho", (1, 1, 1), rough=0.05, coat=1.0, coat_rough=0.02, image=iris_img)
    lash_m = mat("cilios", (0.03, 0.02, 0.02), rough=0.5)
    R = 0.265
    for side in (-1, 1):
        cx, cz = side * 0.38, -0.08
        front = surface(bvh, Vector((cx, 0, cz)), Vector((0, -1, 0)), 0.8)
        center = Vector((cx, front.y + R * 0.7, cz))
        rot = Matrix.Rotation(math.radians(-side * 9), 4, "Z") @ Matrix.Rotation(math.radians(90), 4, "X")
        bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=32, radius=R)
        eye = bpy.context.active_object
        eye.name = f"olho_{'e' if side < 0 else 'd'}"
        eye.data.transform(rot)
        eye.location = center
        eye.scale = (1.18, 1, 1.0)
        eye.data.materials.append(eye_m)
        eye.data.shade_smooth()
        parts.append(eye)
        # pálpebra superior pesada (pele) cortando o olho em diagonal (canto externo levemente erguido)
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=32, radius=R * 1.025)
        def zc(x):
            return R * 0.2 + side * x * 0.16
        dead = [v for v in bm.verts if v.co.z < zc(v.co.x) or v.co.y > R * 0.35]
        bmesh.ops.delete(bm, geom=dead, context="VERTS")
        me = bpy.data.meshes.new("palpebra")
        bm.to_mesh(me)
        bm.free()
        lid = link(bpy.data.objects.new(f"palpebra_{side}", me))
        lid.data.materials.append(skin_plain)
        lid.location = center
        lid.rotation_euler = (0, 0, math.radians(-side * 9))
        lid.scale = (1.18, 1, 1.0)
        smooth(lid, 1)
        parts.append(lid)
        # linha de cílios com gatinho
        pts = []
        for k in range(25):
            x = -R * 1.0 + 2 * R * 1.0 * k / 24
            z = zc(x)
            yy = -math.sqrt(max(0.0, (R * 1.04) ** 2 - x * x - z * z))
            pts.append(Vector((x, yy, z)))
        outer = pts[-1] if side > 0 else pts[0]
        wing = outer + Vector((side * R * 0.32, R * 0.12, R * 0.22))
        if side > 0:
            pts.append(wing)
        else:
            pts.insert(0, wing)
        cu = bpy.data.curves.new("cilios", "CURVE")
        cu.dimensions = "3D"
        cu.bevel_depth = R * 0.06
        cu.bevel_resolution = 3
        sp = cu.splines.new("POLY")
        sp.points.add(len(pts) - 1)
        for p, co in zip(sp.points, pts):
            p.co = (*co, 1)
        lash = link(bpy.data.objects.new(f"cilios_{side}", cu))
        lash.data.materials.append(lash_m)
        lash.location = center
        lash.rotation_euler = (0, 0, math.radians(-side * 9))
        lash.scale = (1.18, 1, 1.0)
        parts.append(lash)
        # sobrancelha fina e alta
        bc = bpy.data.curves.new("sobrancelha", "CURVE")
        bc.dimensions = "3D"
        bc.bevel_depth = 0.01
        bc.bevel_resolution = 2
        sp = bc.splines.new("POLY")
        bpts = []
        for k in range(9):
            t = k / 8
            bx = side * (0.17 + 0.33 * t)
            bz = 0.5 + 0.08 * math.sin(t * math.pi) - 0.07 * t
            hit = surface(bvh, Vector((bx, 0, bz)), Vector((0, -1, 0)), 0.8)
            bpts.append(hit + Vector((0, -0.01, 0)))
        sp.points.add(len(bpts) - 1)
        for p, co in zip(sp.points, bpts):
            p.co = (*co, 1)
        brow = link(bpy.data.objects.new(f"sobrancelha_{side}", bc))
        brow.data.materials.append(mat("sobrancelha", CFG["brow"], rough=0.6))
        parts.append(brow)
    # nariz pequeno arrebitado
    nose_at = surface(bvh, Vector((0, 0, -0.24)), Vector((0, -1, 0)), 0.8)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.07, location=nose_at + Vector((0, 0.02, 0)))
    nose = bpy.context.active_object
    nose.name = "nariz"
    nose.scale = (1.15, 0.9, 0.85)
    nose.data.materials.append(skin_plain)
    nose.data.shade_smooth()
    parts.append(nose)
    # lábios carnudos com brilho
    lip_m = mat("labios", CFG["lips"], rough=0.12, coat=1.0, coat_rough=0.05, sss=0.1)
    for name, z, sx, sy, sz, bow in (("labio_sup", -0.4, 0.15, 0.09, 0.052, True), ("labio_inf", -0.475, 0.145, 0.1, 0.066, False)):
        at = surface(bvh, Vector((0, 0, z)), Vector((0, -1, 0)), 0.8)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=24, radius=1.0, location=at + Vector((0, 0.035, 0)))
        lip = bpy.context.active_object
        lip.name = name
        for v in lip.data.vertices:
            x, y, zz = v.co
            if bow and zz > 0:                     # arco do cupido
                zz -= 0.35 * math.exp(-(x ** 2) / 0.04) * zz
            zz *= 1 - 0.25 * x * x                 # cantos afinando
            v.co = (x, y, zz)
        lip.scale = (sx, sy, sz)
        lip.data.materials.append(lip_m)
        lip.data.shade_smooth()
        parts.append(lip)
    return parts, bvh

# ------------------------------------------------------------------ cabelo
def build_hair(head, bvh):
    col = CFG["hair"]
    long_img = image_from_array("cabelo_longo", tex_hair(col, tips=True))
    bang_img = image_from_array("franja", tex_hair(col, tips=True))
    cap_img = image_from_array("cabelo_topo", tex_hair(col, part=True))
    m_long = mat("cabelo", col, rough=0.5, coat=0.05, coat_rough=0.4, image=long_img, alpha_clip=True, double=True)
    m_bang = mat("franja", col, rough=0.5, coat=0.05, coat_rough=0.4, image=bang_img, alpha_clip=True, double=True)
    m_cap = mat("cabelo_topo", col, rough=0.5, coat=0.05, coat_rough=0.4, image=cap_img, double=True)
    parts = []

    # topo: casca que acompanha o crânio, fios descendo da risca
    cols, rows = 72, 26
    def cap_pos(i, j):
        a = -math.pi + 2 * math.pi * i / (cols - 1)            # 0 = frente
        lat = math.radians(88 - 118 * j / (rows - 1))          # do topo até atrás da nuca
        d = Vector((math.sin(a) * math.cos(lat), -math.cos(a) * math.cos(lat), math.sin(lat)))
        hit = surface(bvh, Vector((0, 0, 0)), d, 1.0)
        return hit + d * (0.028 + 0.02 * (j / rows))
    cap = sheet("cabelo_topo", cols, rows, cap_pos, lambda i, j: (i / (cols - 1) * 6, 1 - j / (rows - 1)), m_cap, subd=1, solid=0.03)
    # remove a parte da casca que cobriria o rosto (frente abaixo da testa)
    bm = bmesh.new(); bm.from_mesh(cap.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < 0.7 and abs(math.atan2(v.co.x, -v.co.y)) < 0.98], context="VERTS")
    bm.to_mesh(cap.data); bm.free()
    parts.append(cap)

    # comprimento: cortina lisa atrás e mechas laterais que caem na frente dos ombros
    cols, rows = 64, 34
    def edge(z):
        t = min(1, max(0, (-z - 0.75) / 0.8))
        return 1.0 - 0.42 * t
    def long_pos(i, j):
        z = 0.45 - 3.55 * j / (rows - 1)
        e = edge(z)
        a = e + (2 * math.pi - 2 * e) * i / (cols - 1)
        r = 1.08 + 0.06 * min(1, max(0, -z / 0.8))
        if z > -0.35:
            d = Vector((math.sin(a), -math.cos(a), 0))
            r = (surface(bvh, Vector((0, 0, z)), d, 1.0) - Vector((0, 0, z))).length + 0.075
        r += 0.018 * math.sin(a * 23) + 0.01 * math.sin(a * 57 + 1.3)
        x, y = math.sin(a) * r, -math.cos(a) * r * 0.92
        return Vector((x, y, z))
    longh = sheet("cabelo_longo", cols, rows, long_pos, lambda i, j: (i / (cols - 1) * 5, 1 - j / (rows - 1)), m_long, subd=1, solid=0.025)
    parts.append(longh)

    # franja reta com pontas desfiadas
    cols, rows = 48, 16
    def bang_pos(i, j):
        a = -1.08 + 2.16 * i / (cols - 1)
        lat = math.radians(89.5 - 79.5 * j / (rows - 1))
        d = Vector((math.sin(a) * math.cos(lat), -math.cos(a) * math.cos(lat), math.sin(lat)))
        hit = surface(bvh, Vector((0, 0, 0)), d, 1.0)
        u = j / (rows - 1)
        return hit + d * (0.05 + 0.05 * u ** 1.6)
    bang = sheet("franja", cols, rows, bang_pos, lambda i, j: (i / (cols - 1) * 3, 1 - j / (rows - 1)), m_bang, subd=1)
    parts.append(bang)
    return parts

# ------------------------------------------------------------------ corpo (modificador Skin)
BODY = dict(s=0.5, b=0.32, w=0.21, h=0.33, limb=1.15)

def build_body():
    b = BODY
    L = b["limb"]
    P = [  # (x, y, z, rx, ry)
        (0, 0, -2.3, b["h"] * 0.8, 0.18),        # 0 pelve
        (0, 0, -1.98, b["w"], 0.14),             # 1 cintura
        (0, 0, -1.64, b["b"], 0.17),             # 2 peito
        (0, 0, -1.3, 0.19, 0.12),                # 3 base do pescoço / ombros
        (0, 0, -1.08, 0.14, 0.135),              # 4 pescoço
        (0, 0, -0.7, 0.135, 0.13),               # 5 topo do pescoço (dentro da cabeça)
    ]
    E = [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5)]
    def limb(chain, parent):
        nonlocal P, E
        prev = parent
        for pt in chain:
            P.append(pt)
            E.append((prev, len(P) - 1))
            prev = len(P) - 1
    for sd in (-1, 1):
        limb([(sd * b["s"] * 0.55, 0, -1.35, 0.095 * L, 0.095 * L),
              (sd * b["s"], 0, -1.4, 0.085 * L, 0.085 * L),
              (sd * (b["s"] + 0.07), 0.02, -1.8, 0.06 * L, 0.06 * L),
              (sd * (b["s"] + 0.12), 0, -2.15, 0.048 * L, 0.043 * L),
              (sd * (b["s"] + 0.13), -0.02, -2.3, 0.056 * L, 0.03 * L)], 3)
        limb([(sd * b["h"] * 0.48, 0, -2.43, 0.135 * L, 0.135 * L),
              (sd * b["h"] * 0.42, 0, -3.25, 0.09 * L, 0.09 * L),
              (sd * b["h"] * 0.4, 0.02, -4.05, 0.063 * L, 0.063 * L),
              (sd * b["h"] * 0.4, -0.12, -4.2, 0.07 * L, 0.043 * L)], 0)
    global JOINTS
    # (índice da junta, índice do próximo ponto, fator de raio): ombro, cotovelo, punho, quadril, joelho, tornozelo
    JOINTS = []
    for base in (6, 15):          # braços (pontos: ombro interno, ombro, cotovelo, punho, mão)
        JOINTS += [(base + 1, base + 2, 1.12), (base + 2, base + 3, 1.08), (base + 3, base + 4, 1.06)]
    for base in (11, 20):         # pernas (pontos: quadril, joelho, tornozelo, pé)
        JOINTS += [(base, base + 1, 1.0), (base + 1, base + 2, 1.06), (base + 2, base + 3, 1.08)]
    me = bpy.data.meshes.new("corpo")
    me.from_pydata([p[:3] for p in P], E, [])
    obj = link(bpy.data.objects.new("corpo", me))
    sk = obj.modifiers.new("Skin", "SKIN")
    sk.use_smooth_shade = True
    for i, p in enumerate(P):
        obj.data.skin_vertices[0].data[i].radius = (p[3], p[4])
    obj.data.skin_vertices[0].data[0].use_root = True
    obj.data.materials.append(mat("pele_corpo", CFG["skin"], rough=0.45, coat=0.35, coat_rough=0.4, sss=0.2))
    smooth(obj, 2)
    apply_mods(obj)
    # juntas articuladas de boneca (anéis finos nas articulações)
    seam = mat("junta", tuple(c * 0.78 for c in CFG["skin"]), rough=0.6)
    body_bvh = bvh_of(obj)
    def ring(a, b_, r):
        a, b_ = Vector(a), Vector(b_)
        axis = (b_ - a).normalized()
        ref = Vector((0, 0, 1)) if abs(axis.z) < 0.9 else Vector((1, 0, 0))
        u = axis.cross(ref).normalized(); w = axis.cross(u)
        dists = []
        for k in range(12):
            ang = 2 * math.pi * k / 12
            d = u * math.cos(ang) + w * math.sin(ang)
            hit = body_bvh.ray_cast(a, d, 0.5)   # de dentro para fora: primeira parede do próprio membro
            if hit[0] is not None:
                dists.append((hit[0] - a).length)
        r = (sum(dists) / len(dists)) * 1.004 if dists else r
        bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=0.005, major_segments=48, minor_segments=6, location=a)
        t = bpy.context.active_object
        t.rotation_euler = (b_ - a).to_track_quat("Z", "Y").to_euler()
        t.data.materials.append(seam)
        t.data.shade_smooth()
    # anéis desativados: juntas serão feitas como vincos na malha numa próxima etapa
    return obj

def build_top(body, color=(0.06, 0.05, 0.06)):
    bvh = bvh_of(body)
    m = mat("top", color, rough=0.55, coat=0.2, double=True)
    cols, rows = 48, 8
    def pos(i, j):
        a = math.pi + 2 * math.pi * i / (cols - 1)
        z = -1.48 - 0.38 * j / (rows - 1)
        d = Vector((math.sin(a), -math.cos(a), 0))
        hit = surface(bvh, Vector((0, 0, z)), d, 0.3)
        return hit + d * 0.025
    return sheet("top", cols, rows, pos, lambda i, j: (i / (cols - 1), 1 - j / (rows - 1)), m, subd=1, solid=0.02)

def build_dress(body, color=(0.018, 0.015, 0.018)):
    """Vestido preto com gola branca arredondada e gravata."""
    bvh = bvh_of(body)
    knit = mat("vestido", color, rough=0.75, double=True)
    white = mat("gola", (0.96, 0.95, 0.93), rough=0.55, coat=0.1, double=True)
    z_top, z_hip, z_hem = -1.22, -2.3, -2.95
    cols, rows = 64, 30
    def pos(i, j):
        a = math.pi + 2 * math.pi * i / (cols - 1)
        u = j / (rows - 1)
        z = z_top + (z_hem - z_top) * u
        d = Vector((math.sin(a), -math.cos(a), 0))
        if z > z_hip:
            hit = surface(bvh, Vector((0, 0, z)), d, 0.3)
            r = (hit - Vector((0, 0, z))).length + 0.035
        else:
            hip = surface(bvh, Vector((0, 0, z_hip)), d, 0.35)
            r = (hip - Vector((0, 0, z_hip))).length + 0.04 + (z_hip - z) * 0.32
        r += 0.006 * math.sin(a * 18) * max(0.0, (z_hip - z))          # pregas leves na saia
        return Vector((math.sin(a) * r, -math.cos(a) * r * (0.82 if z < z_hip else 1), z))
    dress = sheet("vestido", cols, rows, pos, lambda i, j: (i / (cols - 1), 1 - j / (rows - 1)), knit, subd=1, solid=0.02)
    # mangas bufantes curtas
    for sd in (-1, 1):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.16, location=(sd * (BODY["s"] + 0.01), 0, -1.43))
        sl = bpy.context.active_object
        sl.name = f"manga_{sd}"
        sl.scale = (1.0, 1.05, 0.9)
        sl.data.materials.append(knit)
        sl.data.shade_smooth()
    # gola arredondada (duas abas com abertura na frente)
    for sd in (-1, 1):
        cols2, rows2 = 20, 6
        def cpos(i, j, sd=sd):
            a = sd * (0.12 + 1.55 * i / (cols2 - 1))
            u = j / (rows2 - 1)
            z = -1.2 - 0.17 * u
            r = 0.15 + 0.3 * u * (1 - 0.3 * (abs(a) / 1.67) ** 2)
            return Vector((math.sin(a) * r, -math.cos(a) * r - 0.005, z + 0.03 * u * u))
        sheet(f"gola_{sd}", cols2, rows2, cpos, lambda i, j: (i / (cols2 - 1), j / (rows2 - 1)), white, subd=2, solid=0.012)
    # gravata
    tie = mat("gravata", (0.02, 0.02, 0.025), rough=0.35, coat=0.3)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.04, location=(0, -0.2, -1.27))
    knot = bpy.context.active_object; knot.scale = (1.1, 0.7, 1.0); knot.data.materials.append(tie); knot.data.shade_smooth()
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.055, radius2=0.025, depth=0.28, location=(0, -0.215, -1.44))
    blade = bpy.context.active_object; blade.scale = (1.0, 0.25, 1.0); blade.rotation_euler = (math.radians(-6), 0, math.radians(45))
    blade.data.materials.append(tie)
    return dress

def build_shoes(color=(0.02, 0.018, 0.02)):
    """Sapatinho boneca (Mary Jane) com tira."""
    patent = mat("verniz", color, rough=0.12, coat=1.0, coat_rough=0.05)
    for sd in (-1, 1):
        x = sd * BODY["h"] * 0.4
        bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=1, location=(x, -0.06, -4.24))
        sh = bpy.context.active_object
        sh.name = f"sapato_{sd}"
        for v in sh.data.vertices:
            if v.co.z < -0.25:
                v.co.z = -0.25 - (v.co.z + 0.25) * 0.15                   # sola reta
        sh.scale = (0.13, 0.22, 0.09)
        sh.data.materials.append(patent)
        smooth(sh, 1)
        bpy.ops.mesh.primitive_torus_add(major_radius=0.09, minor_radius=0.014, location=(x, -0.05, -4.15))
        st = bpy.context.active_object
        st.rotation_euler = (0, math.radians(90), 0)
        st.scale = (1, 1, 0.9)
        st.data.materials.append(patent)

# ------------------------------------------------------------------ cena e render
def scene_setup():
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_EEVEE"
    sc.render.resolution_x, sc.render.resolution_y = 900, 1100
    sc.view_settings.view_transform = "Standard"
    world = bpy.data.worlds.new("mundo")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.02, 0.018, 0.02, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.6
    sc.world = world
    def area(name, loc, energy, size, color=(1, 1, 1)):
        ld = bpy.data.lights.new(name, "AREA")
        ld.energy, ld.size, ld.color = energy, size, color
        ld.shape = "DISK"
        o = link(bpy.data.objects.new(name, ld))
        o.location = loc
        d = Vector((0, 0, -0.8)) - Vector(loc)
        o.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        return o
    area("principal", (-3.5, -6, 3.5), 900, 4, (1, 0.96, 0.93))
    area("preenchimento", (4.5, -5, 0.5), 350, 5, (1, 0.9, 0.92))
    area("contorno", (0, 5, 3), 700, 3, (1, 0.85, 0.85))
    cam_d = bpy.data.cameras.new("camera")
    cam_d.lens = 85
    cam = link(bpy.data.objects.new("camera", cam_d))
    sc.camera = cam
    return cam

def shoot(cam, path, loc, target):
    cam.location = loc
    cam.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)

def main():
    reset()
    head, skin = build_head()
    face, bvh = build_face(head, skin)
    build_hair(head, bvh)
    for o in list(bpy.context.scene.objects):        # desce a cabeça: pescoço mais curto
        o.location.z -= 0.14
    body = build_body()
    build_dress(body)
    build_shoes()
    cam = scene_setup()
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "boneca.blend"))
    if DO_RENDER:
        shoot(cam, OUT / "render_frente.png", (0, -10, -0.55), (0, 0, -0.6))
        shoot(cam, OUT / "render_34.png", (-6.5, -9, 0.2), (0, 0, -1.6))
        shoot(cam, OUT / "render_corpo.png", (0, -17, -1.75), (0, 0, -1.75))
    print("BONECA_OK")

main()

