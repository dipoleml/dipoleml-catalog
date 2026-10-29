"""Draw side/front/top point projections of a mesh with a 10 cm grid, optionally with joints, for rig placement.

python tools/mesh_views.py verts.npy out.png [joints.json]
Side view looks from -X (head on the right), front from -Y, top from +Z (head at the bottom).
"""
import json, sys
import numpy as np
from PIL import Image, ImageDraw

v = np.load(sys.argv[1])
joints = json.load(open(sys.argv[3]))["joints"] if len(sys.argv) > 3 else {}
PX = 400  # pixels per metre
pad = 0.08
lo, hi = v.min(0) - pad, v.max(0) + pad

def panel(ax_h, ax_v, flip_h, flip_v, title):
    h0, h1 = lo[ax_h], hi[ax_h]
    v0, v1 = lo[ax_v], hi[ax_v]
    W, H = int((h1 - h0) * PX), int((v1 - v0) * PX)
    def to_px(p):
        x = (p[ax_h] - h0) * PX
        y = (p[ax_v] - v0) * PX
        if flip_h: x = W - x
        if flip_v: y = H - y
        return x, y
    img = Image.new("RGB", (W, H), (245, 245, 245))
    d = ImageDraw.Draw(img)
    for g in np.arange(np.floor(h0 * 10) / 10, h1, 0.1):
        x = to_px({ax_h: g, ax_v: v0} | {k: 0 for k in range(3) if k not in (ax_h, ax_v)})[0]
        d.line([(x, 0), (x, H)], fill=(200, 200, 255) if abs(g) > 1e-6 else (255, 120, 120))
        d.text((x + 2, 2), f"{g:+.1f}", fill=(90, 90, 160))
    for g in np.arange(np.floor(v0 * 10) / 10, v1, 0.1):
        y = to_px({ax_h: h0, ax_v: g} | {k: 0 for k in range(3) if k not in (ax_h, ax_v)})[1]
        d.line([(0, y), (W, y)], fill=(200, 200, 255) if abs(g) > 1e-6 else (255, 120, 120))
        d.text((2, y + 2), f"{g:+.1f}", fill=(90, 90, 160))
    pts = np.array([to_px({0: p[0], 1: p[1], 2: p[2]}) for p in v[::2]])
    for x, y in pts:
        d.point((x, y), fill=(60, 60, 60))
    for name, j in joints.items():
        x, y = to_px({0: j[0], 1: j[1], 2: j[2]})
        col = (230, 40, 200) if name.endswith("_L") else (40, 90, 255) if name.endswith("_R") else (230, 120, 0)
        d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=col)
        d.text((x + 5, y - 5), name, fill=col)
    d.text((W // 2 - 40, H - 14), title, fill=(0, 0, 0))
    return img

side = panel(1, 2, True, True, "side (from -X), head right")
front = panel(0, 2, False, True, "front (from -Y)")
top = panel(0, 1, False, False, "top (head at bottom, +X right)")
W = side.width + front.width + 20
H = max(side.height, front.height) + top.height + 20
sheet = Image.new("RGB", (W, H), "white")
sheet.paste(side, (0, 0)); sheet.paste(front, (side.width + 20, 0)); sheet.paste(top, (0, max(side.height, front.height) + 20))
sheet.save(sys.argv[2])
print(sheet.size)
