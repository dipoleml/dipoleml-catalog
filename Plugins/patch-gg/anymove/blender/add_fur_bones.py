"""Add spring-driven fur bones to the rigged wolf: ears, the neck ruff (left and right), the chest tuft and the belly
fringe. Only the outer layer of fur follows them (weights fade in with distance from the body's core), so the body
holds its shape while the fur lags, swings and settles. The solver never sees these bones: blender/apply_motion.py
--springs simulates them from the solved motion.

blender -b -P blender/add_fur_bones.py -- rigged.blend out_dir
Writes out_dir/rigged.blend, a copy of rig_info.json (unchanged skeleton for the solver) and fur.json (spring settings).
"""
import json, pathlib, shutil, sys

import bpy
import numpy as np
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:]
src, out = pathlib.Path(args[0]), pathlib.Path(args[1])
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(src))
rig, body = bpy.data.objects["rig"], bpy.data.objects["body"]
co = np.array([v.co[:] for v in body.data.vertices])
x, y, z = co.T


def seg_dist(p, a, b):
    a, b = np.asarray(a), np.asarray(b)
    t = np.clip(((p - a) @ (b - a)) / ((b - a) @ (b - a)), 0, 1)
    return np.linalg.norm(a + np.outer(t, b - a) - p, axis=1)


def smooth01(v):
    v = np.clip(v, 0, 1)
    return v * v * (3 - 2 * v)


# the core the fur hangs off: chest -> neck -> head, and the spine
neck_core = np.min([seg_dist(co, a, b) for a, b in (((0, -0.22, 0.67), (0, -0.40, 0.73)), ((0, -0.40, 0.73), (0, -0.49, 0.81)),
                                                     ((0, -0.49, 0.81), (0, -0.56, 0.88)))], axis=0)
legs = np.zeros(len(co))
for vg in body.vertex_groups:
    if any(k in vg.name for k in ("upperarm", "forearm", "metacarpus", "fpaw", "thigh", "shin", "metatarsus", "hpaw")):
        for v in body.data.vertices:
            for g in v.groups:
                if g.group == vg.index:
                    legs[v.index] += g.weight
not_leg = 1 - smooth01(legs / 0.6)

fur = {}
# ears: the parts of the head above the skull, one per side
for side, s in (("L", 1), ("R", -1)):
    m = (z > 0.95) & (y > -0.70) & (y < -0.42) & (s * x > 0.01)
    base = co[m & (z < 0.99)].mean(0)
    tip = co[m][np.argmax(z[m])]
    w = np.where(m, smooth01((z - 0.95) / 0.06), 0)
    fur[f"ear_{side}"] = {"head": base, "tail": tip, "parent": "head", "w": w, "freq": 5.0, "damping": 0.45, "max_deg": 25}
# neck ruff: outer fur on each side of the neck and shoulders, as three clumps (upper, middle, lower) plus the crest
outer = smooth01((neck_core - 0.10) / 0.10)
clumps = (("upper", 0.80, 1.00, (0.08, -0.47, 0.86), (0.14, -0.43, 0.74), 2.4, 0.25),
          ("mid", 0.66, 0.84, (0.11, -0.40, 0.76), (0.17, -0.35, 0.62), 2.1, 0.22),
          ("lower", 0.48, 0.70, (0.13, -0.34, 0.66), (0.18, -0.30, 0.52), 1.9, 0.22))
for side, s in (("L", 1), ("R", -1)):
    for tag, z0, z1, h, tl, f, dmp in clumps:
        region = (y > -0.64) & (y < -0.10) & (s * x > 0.0) & ~((z > 0.92) & (y < -0.45))
        band = smooth01((z - z0) / 0.06) * smooth01((z1 - z) / 0.06)
        w = np.where(region, outer * band * smooth01(s * x / 0.04) * not_leg, 0)
        fur[f"ruff_{tag}_{side}"] = {"head": np.array([s * h[0], h[1], h[2]]), "tail": np.array([s * tl[0], tl[1], tl[2]]),
                                     "parent": "neck1" if tag != "lower" else "chest", "w": w, "freq": f,
                                     "damping": dmp, "max_deg": 30, "gravity": 0.45}
region = (np.abs(x) < 0.08) & (y > -0.50) & (y < -0.12) & (z > 0.80)
fur["crest"] = {"head": np.array([0, -0.44, 0.90]), "tail": np.array([0, -0.30, 0.95]), "parent": "neck2",
                "w": np.where(region, smooth01((neck_core - 0.10) / 0.08), 0), "freq": 2.6, "damping": 0.25,
                "max_deg": 25, "gravity": 0.3}
# chest tuft hanging under the neck
region = (np.abs(x) < 0.11) & (y > -0.64) & (y < -0.38) & (z > 0.36) & (z < 0.64)
fur["chest_tuft"] = {"head": np.array([0, -0.52, 0.62]), "tail": np.array([0, -0.50, 0.44]), "parent": "chest",
                     "w": np.where(region, smooth01((0.64 - z) / 0.12) * not_leg, 0), "freq": 2.6, "damping": 0.25, "max_deg": 30,
                     "gravity": 0.5}
# belly fringe, each side
for side, s in (("L", 1), ("R", -1)):
    region = (y > -0.26) & (y < 0.18) & (z < 0.54) & (s * x > -0.02)
    w = np.where(region, smooth01((0.54 - z) / 0.09) * not_leg, 0)
    fur[f"belly_{side}"] = {"head": np.array([s * 0.10, -0.05, 0.52]), "tail": np.array([s * 0.12, -0.03, 0.41]),
                            "parent": "spine2", "w": w, "freq": 2.8, "damping": 0.25, "max_deg": 25,
                            "gravity": 0.5}

bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode="EDIT")
for name, f in fur.items():
    b = rig.data.edit_bones.new(name)
    b.head, b.tail = Vector(f["head"].tolist()), Vector(f["tail"].tolist())
    zv = Vector((1, 0, 0)).cross((b.tail - b.head).normalized())
    b.align_roll(zv.normalized() if zv.length > 1e-4 else Vector((0, 0, 1)))
    b.parent = rig.data.edit_bones[f["parent"]]
bpy.ops.object.mode_set(mode="OBJECT")

# blend the fur weights in: fur takes up to 85% of a vertex, the body bones keep the rest, still 4 bones max
nv = len(co)
names = [g.name for g in body.vertex_groups]
W = np.zeros((nv, len(names)))
for v in body.data.vertices:
    for g in v.groups:
        W[v.index, g.group] = g.weight
F = np.stack([0.85 * f["w"] for f in fur.values()], 1)
tot = F.sum(1, keepdims=True)
F = np.where(tot > 0.85, F * 0.85 / tot.clip(1e-9), F)
W = np.hstack([W * (1 - F.sum(1, keepdims=True)), F])
keep = np.argsort(-W, axis=1)[:, :4]
mask = np.zeros_like(W, bool)
np.put_along_axis(mask, keep, True, axis=1)
W = np.where(mask, W, 0)
W /= W.sum(1, keepdims=True).clip(1e-9)
for name in fur:
    body.vertex_groups.new(name=name)
for gi, vg in enumerate(body.vertex_groups):
    vg.remove(list(range(nv)))
    for i in np.nonzero(W[:, gi] > 1e-4)[0]:
        vg.add([int(i)], float(W[i, gi]), "REPLACE")
print("fur bones:", {n: int((f["w"] > 0.05).sum()) for n, f in fur.items()}, "vertices each")

bpy.ops.wm.save_as_mainfile(filepath=str(out / "rigged.blend"))
shutil.copy(src.parent / "rig_info.json", out / "rig_info.json")
json.dump({n: {k: f.get(k, 0.0) for k in ("parent", "freq", "damping", "max_deg", "gravity")} for n, f in fur.items()}, open(out / "fur.json", "w"), indent=1)
print("saved", out)
