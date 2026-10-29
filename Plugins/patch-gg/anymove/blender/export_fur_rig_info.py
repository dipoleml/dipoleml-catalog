"""Extend rig_info.json with the fur bones of a rigged_v3 blend, so the reader can learn to find each fur bone's tip
and the solver can pose the fur from the video instead of simulating it.

blender -b -P blender/export_fur_rig_info.py -- rigged.blend rig_info.json fur.json out_rig_info.json
Fur bones are appended after the body bones (their parents come earlier), each with a tip keypoint "<bone>_tip".
"""
import json, sys

import bpy

args = sys.argv[sys.argv.index("--") + 1:]
blend, info_path, fur_path, out = args[:4]
bpy.ops.wm.open_mainfile(filepath=blend)
arm = bpy.data.objects["rig"]
info = json.load(open(info_path))
fur = json.load(open(fur_path))
order = [b["name"] for b in info["bones"]]
for name, f in fur.items():
    bb = arm.data.bones[name]
    lim = f.get("max_deg", 30)
    info["bones"].append({"name": name, "parent": order.index(f["parent"]), "matrix_local": [list(r) for r in bb.matrix_local],
                          "length": bb.length, "head_joint": name + "_root", "tail_joint": name + "_tip",
                          "limits_deg": [[-lim, lim], [-5, 5], [-lim, lim]]})
    order.append(name)
    info["keypoints"].append({"name": name + "_tip", "bone": len(order) - 1, "end": "tail", "rest": list(bb.tail_local)})
json.dump(info, open(out, "w"), indent=1)
print("rig_info with fur:", len(info["bones"]), "bones,", len(info["keypoints"]), "keypoints")
