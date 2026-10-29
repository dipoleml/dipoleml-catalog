"""Draw the reader's joints (rings) and the fitted rig's joints (dots) on chosen frames of a clip.

python tools/fit_check.py VIDEO.mp4 CLIP_DIR out.jpg frame [frame ...]
"""
import json, sys
import cv2
import numpy as np
sys.path.insert(0, ".")
from mocap import layout
from mocap.detect import read_frames

video, clip, out = sys.argv[1:4]
ts = [int(t) for t in sys.argv[4:]]
d = np.load(f"{clip}/det.npz")
m = json.load(open(f"{clip}/motion.json"))
J = np.array(m["joints"])
pf, ps = layout.project(J)
frames, _ = read_frames(video)
tiles = []
for t in ts:
    img = np.ascontiguousarray(cv2.warpAffine(frames[t], d["calib"], (layout.W, layout.H))[..., ::-1])
    for det, fit, x0 in ((d["front_uv"][t], pf[t], 0), (d["side_uv"][t], ps[t], layout.W_FRONT)):
        for j in range(len(det)):
            cv2.circle(img, (int(det[j, 0] + x0), int(det[j, 1])), 5, (0, 255, 255), 1, cv2.LINE_AA)
            cv2.circle(img, (int(fit[j, 0] + x0), int(fit[j, 1])), 3, (0, 0, 255), -1, cv2.LINE_AA)
            cv2.line(img, (int(det[j, 0] + x0), int(det[j, 1])), (int(fit[j, 0] + x0), int(fit[j, 1])), (0, 0, 255), 1)
    cv2.putText(img, f"frame {t}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
    tiles.append(cv2.resize(img, (960, 540)))
rows = [np.hstack(tiles[i:i + 2]) if i + 1 < len(tiles) else np.hstack([tiles[i], np.zeros_like(tiles[i])]) for i in range(0, len(tiles), 2)]
cv2.imwrite(out, np.vstack(rows))
