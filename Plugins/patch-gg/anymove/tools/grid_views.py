"""Draw a metre grid and a rig's joints and bones over blender/ortho_views.py renders, as one sheet.

python tools/grid_views.py VIEWS_DIR out.png [rig.json] [step_m]
_L joints are mirrored to _R unless the rig gives the _R joint itself. Left side pink, right blue, middle orange.
"""
import json, pathlib, sys
from PIL import Image, ImageDraw

d = pathlib.Path(sys.argv[1])
views = json.load(open(d / "views.json"))
rig = json.load(open(sys.argv[3])) if len(sys.argv) > 3 and sys.argv[3] != "-" else None
step = float(sys.argv[4]) if len(sys.argv) > 4 else 0.1
joints, bones = {}, []
if rig:
    joints = dict(rig["joints"])
    for k, v in rig["joints"].items():
        if k.endswith("_L") and k[:-2] + "_R" not in rig["joints"]:
            joints[k[:-2] + "_R"] = [-v[0], v[1], v[2]]
    for b in rig["bones"]:
        bones.append(b)
        if b[0].endswith("_L"):
            bones.append([x[:-2] + "_R" if x and x.endswith("_L") else x for x in b])


def to_px(v, p):
    u = v["h_sign"] * (p[v["h_axis"]] - v["left"]) * v["ppm"]
    w = v["v_sign"] * (v["top"] - p[v["v_axis"]]) * v["ppm"]
    return u, w


def col(n):
    return (230, 40, 200) if n.endswith("_L") else (40, 90, 255) if n.endswith("_R") else (240, 130, 0)


panels = []
for name in ("side", "front", "top"):
    v = views[name]
    im = Image.open(d / f"{name}.png").convert("RGB")
    dr = ImageDraw.Draw(im)
    for axis, horiz in ((v["h_axis"], True), (v["v_axis"], False)):
        extent = (v["w"] if horiz else v["h"]) / v["ppm"]
        if horiz:
            a0, a1 = sorted([v["left"], v["left"] + v["h_sign"] * extent])
        else:
            a0, a1 = sorted([v["top"], v["top"] - v["v_sign"] * extent])
        k = int(a0 / step) - 1
        while k * step <= a1 + 1e-9:
            val = round(k * step, 4)
            p = [0, 0, 0]
            p[axis] = val
            if horiz:
                x = to_px(v, p)[0] if True else 0
                dr.line([(x, 0), (x, v["h"])], fill=(255, 120, 120) if abs(val) < 1e-6 else (120, 160, 255), width=1)
                if round(val / step) % 2 == 0:
                    dr.text((x + 2, 2), f"{val:+.1f}", fill=(255, 255, 0))
            else:
                y = to_px(v, p)[1]
                dr.line([(0, y), (v["w"], y)], fill=(255, 120, 120) if abs(val) < 1e-6 else (120, 160, 255), width=1)
                if round(val / step) % 2 == 0:
                    dr.text((2, y + 2), f"{val:+.1f}", fill=(255, 255, 0))
            k += 1
    for b in bones:
        if b[1] in joints and b[2] in joints:
            dr.line([to_px(v, joints[b[1]]), to_px(v, joints[b[2]])], fill=col(b[0]), width=3)
    for n, p in joints.items():
        x, y = to_px(v, p)
        dr.ellipse([x - 5, y - 5, x + 5, y + 5], fill=col(n))
        dr.text((x + 6, y - 6), n, fill=(255, 255, 255))
    dr.text((v["w"] // 2 - 30, v["h"] - 16), name, fill=(255, 255, 255))
    panels.append(im)
W = panels[0].width + panels[1].width + 10
H = max(panels[0].height, panels[1].height) + 10 + panels[2].height
sheet = Image.new("RGB", (max(W, panels[2].width), H), (20, 20, 20))
sheet.paste(panels[0], (0, 0))
sheet.paste(panels[1], (panels[0].width + 10, 0))
sheet.paste(panels[2], (0, max(panels[0].height, panels[1].height) + 10))
sheet.save(sys.argv[2])
print(sheet.size)
