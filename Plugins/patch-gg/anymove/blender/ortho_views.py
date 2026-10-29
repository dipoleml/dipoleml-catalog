"""Render a mesh from the side (-X), front (-Y) and top (+Z) with orthographic cameras at a fixed scale, as a base for
placing joints; tools/grid_views.py draws the metre grid and the joints on top.

blender -b -P blender/ortho_views.py -- static.blend out_dir [px_per_m] [xray]
Writes side.png, front.png, top.png and views.json (for each view: which world axes map to image right and down,
the world value at the image's top-left, px per metre).
"""
import json, pathlib, sys

import bpy
import numpy as np
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:]
blend, out = args[0], pathlib.Path(args[1])
ppm = float(args[2]) if len(args) > 2 else 300
xray = len(args) > 3 and args[3] == "xray"
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=blend)
scene = bpy.context.scene
body = bpy.data.objects["body"]
co = np.array([body.matrix_world @ v.co for v in body.data.vertices])
lo, hi = co.min(0) - 0.1, co.max(0) + 0.1
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"
scene.display.shading.color_type = "TEXTURE"
scene.display.shading.show_xray = xray
scene.display.shading.xray_alpha = 0.5
scene.render.film_transparent = False
cam = bpy.data.objects.new("vcam", bpy.data.cameras.new("vcam"))
scene.collection.objects.link(cam)
cam.data.type = "ORTHO"
scene.camera = cam
views = {}
# (name, horizontal axis, sign, vertical axis, sign, camera direction): image right = sign_h * axis_h, up = sign_v * axis_v
for name, ah, sh, av, sv, look in (("side", 1, -1, 2, 1, (1, 0, 0)), ("front", 0, 1, 2, 1, (0, 1, 0)), ("top", 0, 1, 1, 1, (0, 0, -1))):
    w, h = (hi[ah] - lo[ah]) * ppm, (hi[av] - lo[av]) * ppm
    scene.render.resolution_x, scene.render.resolution_y = int(round(w)), int(round(h))
    cam.data.ortho_scale = max(hi[ah] - lo[ah], hi[av] - lo[av])
    c = (lo + hi) / 2
    d = Vector(look)
    cam.location = Vector(c.tolist()) - d * 50
    up = Vector((0, 0, 1)) if name != "top" else Vector((0, 1, 0))
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler() if name != "top" else (0, 0, 0)
    if name == "side":
        cam.rotation_euler = (np.pi / 2, 0, -np.pi / 2)
    elif name == "front":
        cam.rotation_euler = (np.pi / 2, 0, 0)
    cam.data.clip_end = 200
    scene.render.filepath = str(out / f"{name}.png")
    bpy.ops.render.render(write_still=True)
    # world value at the image's left edge and top edge
    left = c[ah] - sh * (hi[ah] - lo[ah]) / 2
    top = c[av] + sv * (hi[av] - lo[av]) / 2
    views[name] = {"h_axis": ah, "h_sign": sh, "v_axis": av, "v_sign": sv, "left": float(left), "top": float(top),
                   "ppm": ppm, "w": scene.render.resolution_x, "h": scene.render.resolution_y}
json.dump(views, open(out / "views.json", "w"), indent=1)
print("views", {k: (v["w"], v["h"]) for k, v in views.items()})
