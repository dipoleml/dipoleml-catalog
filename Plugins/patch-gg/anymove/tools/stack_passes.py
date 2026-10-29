"""Lay the solid skeleton pass over the x-ray ghost pass, frame by frame (blender/turntable.py bones mode).

python tools/stack_passes.py DIR     DIR/f_*.png (ghost) + DIR/sticks/f_*.png -> DIR/f_*.png
"""
import pathlib, sys
from PIL import Image

d = pathlib.Path(sys.argv[1])
for g in sorted(d.glob("f_*.png")):
    ghost, sticks = Image.open(g).convert("RGBA"), Image.open(d / "sticks" / g.name).convert("RGBA")
    Image.alpha_composite(ghost, sticks).save(g)
print("stacked", len(list(d.glob("f_*.png"))))
