"""Mirror a motion left to right: a new, equally plausible move (a limp on the other leg, a head turn the other way).

python -m mocap.mirror motion.json mirrored.json
Every bone's local X is world X, so mirroring across the YZ plane keeps rotations about X (flexion) and flips the
ones about Y and Z; left and right bones swap, the pelvis quaternion becomes (w, x, -y, -z) and the root moves to -x.
"""
import json, sys


def mirror(m):
    names = m["bones"]
    idx = {n: i for i, n in enumerate(names)}
    partner = [idx.get(n[:-2] + ("_R" if n.endswith("_L") else "_L"), i) if n.endswith(("_L", "_R")) else i
               for i, n in enumerate(names)]
    out = dict(m)
    out["euler"] = [[[e[partner[i]][0], -e[partner[i]][1], -e[partner[i]][2]] for i in range(len(names))] for e in m["euler"]]
    out["root_quat"] = [[w, x, -y, -z] for w, x, y, z in m["root_quat"]]
    out["trans"] = [[-x, y, z] for x, y, z in m["trans"]]
    out.pop("joints", None)
    return out


if __name__ == "__main__":
    json.dump(mirror(json.load(open(sys.argv[1]))), open(sys.argv[2], "w"))
