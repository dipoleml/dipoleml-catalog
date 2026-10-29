"""Build the H3 LoRA training set: each solved motion (and its mirror) re-rendered from both layout cameras on the
painted rig, composed into the two-camera frame, with its prompt as the caption.

MOCAP_CREATURE=assets/wolf python tools/build_lora_set.py OUT_DIR clip[:prompt_file] ...
Clip names are folders under runs/<creature>/clips/ (from tools/capture.sh); a clip's prompt defaults to
prompts/<creature>/<move>.txt or prompts/<creature>/train/<move>.txt, where <move> is the clip name up to its last "_".
Writes OUT_DIR/<clip>.mp4 + .txt and <clip>_m.mp4 + .txt (mirrored). Tested on the wolf, whose rig is symmetric.
"""
import json, os, pathlib, re, subprocess, sys
from concurrent.futures import ThreadPoolExecutor

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from mocap.mirror import mirror  # noqa: E402

CREATURE = pathlib.Path(os.environ.get("MOCAP_CREATURE", "assets/wolf"))
NAME = CREATURE.name
RIG = ROOT / CREATURE / "rigged"
PY = os.environ.get("PYTHON") or (str(ROOT / ".venv/bin/python") if (ROOT / ".venv/bin/python").exists() else sys.executable)
BLENDER = os.environ.get("BLENDER", "blender")
SWAP = {"left": "right", "right": "left", "Left": "Right", "Right": "Left", "pink": "blue", "blue": "pink",
        "yellow": "cyan", "cyan": "yellow", "orange": "green", "green": "orange"}


def mirror_action(prompt):
    """Swap left/right words in the action sentence only; the colour code stays as it is."""
    head, sep, action = prompt.partition("Action:")
    return head + sep + re.sub(r"\b(" + "|".join(SWAP) + r")\b", lambda m: SWAP[m.group(1)], action)


def render(motion, work, mp4):
    if mp4.exists():
        return
    subprocess.run([BLENDER, "-b", "-P", str(ROOT / "blender/apply_motion.py"), "--", str(RIG / "rigged.blend"),
                    str(RIG / "rig_info.json"), str(motion), str(work), "--views", "front,side", "--paint", "--blur",
                    "--samples", "12", "--scale", "0.75"], check=True, capture_output=True)
    fps = json.load(open(motion)).get("fps", 24)
    subprocess.run([PY, "-m", "mocap.exam", "video", str(work), str(mp4) + ".raw.mp4", str(fps)],
                   check=True, cwd=ROOT, capture_output=True)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(mp4) + ".raw.mp4", "-c:v", "libx264", "-crf", "16",
                    "-pix_fmt", "yuv420p", str(mp4)], check=True)
    pathlib.Path(str(mp4) + ".raw.mp4").unlink()
    print("rendered", mp4.name, flush=True)


def main():
    out = pathlib.Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    jobs = []
    for arg in sys.argv[2:]:
        clip, _, prompt_file = arg.partition(":")
        move = clip.rsplit("_", 1)[0]
        prompt_file = prompt_file or next(p for p in (ROOT / f"prompts/{NAME}/{move}.txt", ROOT / f"prompts/{NAME}/train/{move}.txt")
                                          if p.exists())
        prompt = pathlib.Path(prompt_file).read_text().strip()
        m = json.load(open(ROOT / f"runs/{NAME}/clips/{clip}/motion.json"))
        work = out.parent / "work"
        mot = work / "motions"
        mot.mkdir(parents=True, exist_ok=True)
        json.dump(m, open(mot / f"{clip}.json", "w"))
        json.dump(mirror(m), open(mot / f"{clip}_m.json", "w"))
        (out / f"{clip}.txt").write_text(prompt + "\n")
        (out / f"{clip}_m.txt").write_text(mirror_action(prompt) + "\n")
        jobs += [(mot / f"{clip}.json", work / clip, out / f"{clip}.mp4"),
                 (mot / f"{clip}_m.json", work / f"{clip}_m", out / f"{clip}_m.mp4")]
    with ThreadPoolExecutor(5) as ex:
        for f in [ex.submit(render, *j) for j in jobs]:
            f.result()
    print("done", len(jobs), "clips")


if __name__ == "__main__":
    main()
