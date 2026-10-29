"""Import the Tripo GLB, scale it to real size, stand it on the ground and save a clean .blend plus its vertices.

blender -b -P blender/prep_mesh.py -- in.glb length_m out_dir [rotz_deg] [axis]
The creature must face -Y (check with inspect_mesh.py); rotz_deg turns it about Z first if it doesn't. length_m is
the size along `axis` (y by default; x for creatures wider than they are long, such as a spider's leg span). Writes static.blend, verts.npy (world, metres)
and faces.npy, and side/front/top orthographic renders with a 10 cm grid for placing joints.
"""
import math, sys, pathlib

import bpy
import numpy as np
from mathutils import Matrix, Vector

args = sys.argv[sys.argv.index("--") + 1:]
src, length, out = args[:3]
rotz = float(args[3]) if len(args) > 3 else 0.0
axis = "xyz".index(args[4]) if len(args) > 4 else 1
length, out = float(length), pathlib.Path(out)
out.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
for o in bpy.context.scene.objects:
    o.select_set(o.type == "MESH")
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
body = bpy.context.view_layer.objects.active
# drop the glTF empties so the mesh sits at the root
bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
for o in list(bpy.context.scene.objects):
    if o.type != "MESH":
        bpy.data.objects.remove(o)
body.name = "body"
body.matrix_world = Matrix.Rotation(math.radians(rotz), 4, "Z") @ body.matrix_world  # glTF objects use quaternions
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

v = np.array([vt.co[:] for vt in body.data.vertices])
lo, hi = v.min(0), v.max(0)
s = length / (hi[axis] - lo[axis])
offset = np.array([-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2]])
for vt in body.data.vertices:
    vt.co = Vector(((np.array(vt.co[:]) + offset) * s).tolist())
body.data.update()
v = np.array([vt.co[:] for vt in body.data.vertices])
f = np.array([p.vertices[:] for p in body.data.polygons if len(p.vertices) == 3])
np.save(out / "verts.npy", v.astype(np.float32))
np.save(out / "faces.npy", f.astype(np.int32))
print("size", np.round(v.max(0) - v.min(0), 3), "faces", len(body.data.polygons))
bpy.ops.object.shade_smooth()
bpy.ops.wm.save_as_mainfile(filepath=str(out / "static.blend"))
print("saved", out / "static.blend")
