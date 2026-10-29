"""Import a GLB, join its meshes and render four orthographic views with Workbench, so the facing can be checked.

blender -b -P blender/inspect_mesh.py -- in.glb out_dir
"""
import math, sys, pathlib

import bpy
from mathutils import Vector

src, out = sys.argv[sys.argv.index("--") + 1:][:2]
out = pathlib.Path(out)
out.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
print("meshes", [(o.name, len(o.data.vertices)) for o in meshes])

pts = [o.matrix_world @ v.co for o in meshes for v in o.data.vertices]
lo = Vector([min(p[i] for p in pts) for i in range(3)])
hi = Vector([max(p[i] for p in pts) for i in range(3)])
print("bbox min", tuple(round(x, 3) for x in lo), "max", tuple(round(x, 3) for x in hi))
c, size = (lo + hi) / 2, max(hi - lo)

scene = bpy.context.scene
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"
scene.display.shading.color_type = "TEXTURE"
scene.render.resolution_x = scene.render.resolution_y = 512
scene.render.film_transparent = False
world = bpy.data.worlds.new("w")
scene.world = world

cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
scene.collection.objects.link(cam)
cam.data.type = "ORTHO"
cam.data.ortho_scale = size * 1.15
scene.camera = cam

views = {"from_negY": (Vector((0, -1, 0)), 0), "from_posY": (Vector((0, 1, 0)), 0),
         "from_negX": (Vector((-1, 0, 0)), 0), "from_posX": (Vector((1, 0, 0)), 0)}
for name, (d, _) in views.items():
    cam.location = c + d * size * 3
    cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = str(out / f"{name}.png")
    bpy.ops.render.render(write_still=True)
print("done")
