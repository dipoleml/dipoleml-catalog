"""One comparison video per clip, 1920 x 1080, four panes:

  AI clip, both cameras, with the joints the reader found  |  the rig playing the solved motion, three-quarter view
  AI clip, side camera only                                |  the rig through the same side camera

python -m mocap.showcase VIDEO.mp4 DETECTIONS.npz RENDER_DIR out.mp4 "label"
RENDER_DIR holds persp/ and side/ frames from blender/apply_motion.py. Left legs pink, right blue, middle white.
"""
import pathlib, sys

import cv2
import numpy as np

from mocap import layout
from mocap.detect import read_frames

PINK, BLUE, WHITE = (209, 60, 245), (255, 107, 47), (245, 245, 245)  # BGR


def bone_pairs(names):
    """Lines to draw between joints: every bone whose two ends are both read, from the creature's rig_info.json."""
    import json, os, pathlib
    root = pathlib.Path(os.environ.get("MOCAP_CREATURE", pathlib.Path(__file__).resolve().parents[1] / "assets/wolf"))
    info = next((json.load(open(p)) for p in (root / "rigged_v2/rig_info.json", root / "rigged/rig_info.json") if p.exists()), None)
    idx = {n: i for i, n in enumerate(names)}
    return [(idx[b["head_joint"]], idx[b["tail_joint"]]) for b in (info or {"bones": []})["bones"]
            if b["head_joint"] in idx and b["tail_joint"] in idx]


def over_backdrop(rgba_bgr, floor=True):
    a = rgba_bgr[..., 3:4] / 255.0
    bg = np.empty((*rgba_bgr.shape[:2], 3), np.float32)
    bg[:] = layout.BG[::-1]
    if floor:  # only meaningful for the layout's level cameras
        bg[layout.GROUND_V * rgba_bgr.shape[0] // layout.H:] = layout.FLOOR[::-1]
    return (rgba_bgr[..., :3] * a + bg * (1 - a)).astype(np.uint8)


def fit(img, w, h, fill=(24, 22, 22)):
    """Scale into a w x h cell, keeping the aspect, centred on a dark fill."""
    k = min(w / img.shape[1], h / img.shape[0])
    r = cv2.resize(img, (round(img.shape[1] * k), round(img.shape[0] * k)), interpolation=cv2.INTER_AREA)
    cell = np.empty((h, w, 3), np.uint8)
    cell[:] = fill
    y, x = (h - r.shape[0]) // 2, (w - r.shape[1]) // 2
    cell[y:y + r.shape[0], x:x + r.shape[1]] = r
    return cell


def label(img, text):
    cv2.putText(img, text, (18, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.7, WHITE, 1, cv2.LINE_AA)


def main():
    video, det_path, render_dir, out, title = sys.argv[1:6]
    det = np.load(det_path)
    names = [str(n) for n in det["names"]]
    pairs = bone_pairs(names)
    col = lambda n: PINK if n.endswith("_L") else BLUE if n.endswith("_R") else WHITE
    frames, fps = read_frames(video)
    persp = sorted((pathlib.Path(render_dir) / "persp").glob("*.png"))
    side = sorted((pathlib.Path(render_dir) / "side").glob("*.png"))
    T = min(len(frames), len(persp), len(side), len(det["front_uv"]))
    vw = cv2.VideoWriter(out, cv2.VideoWriter_fourcc(*"mp4v"), fps, (1920, 1080))
    for t in range(T):
        f = np.ascontiguousarray(cv2.warpAffine(frames[t], det["calib"], (layout.W, layout.H), flags=cv2.INTER_AREA)[..., ::-1])
        clean_side = f[:, layout.W_FRONT:].copy()
        for uv, x0 in ((det["front_uv"][t], 0), (det["side_uv"][t], layout.W_FRONT)):
            for a, b in pairs:
                cv2.line(f, (int(uv[a, 0] + x0), int(uv[a, 1])), (int(uv[b, 0] + x0), int(uv[b, 1])), col(names[b]), 2, cv2.LINE_AA)
            for j, n in enumerate(names):
                cv2.circle(f, (int(uv[j, 0] + x0), int(uv[j, 1])), 4, col(n), -1, cv2.LINE_AA)
        p = over_backdrop(cv2.imread(str(persp[t]), cv2.IMREAD_UNCHANGED), floor=False)
        s = over_backdrop(cv2.imread(str(side[t]), cv2.IMREAD_UNCHANGED))
        tl, tr, bl, br = fit(f, 960, 540), fit(p, 960, 540), fit(clean_side, 960, 540), fit(s, 960, 540)
        label(tl, f"{title}: AI video, joints read by DINOv2")
        label(tr, "the rig, solved motion")
        label(bl, "AI video, side camera")
        label(br, "the rig, same side camera")
        canvas = np.vstack([np.hstack([tl, tr]), np.hstack([bl, br])])
        canvas[:, 958:962] = (24, 22, 22)
        canvas[538:542] = (24, 22, 22)
        vw.write(canvas)
    vw.release()
    print("showcase", out, T, "frames")


if __name__ == "__main__":
    main()
