"""Send one two-camera reference frame and a prompt to several video models on fal, in parallel.

python -m mocap.generate REF.png PROMPT.txt OUT_DIR [h3,h3max,seedance] [seconds] [seed]
Each model's clip lands in OUT_DIR/<model>.mp4 with its request in OUT_DIR/<model>.json.
"""
import json, pathlib, sys
from concurrent.futures import ThreadPoolExecutor

from mocap import fal

MODELS = {
    "h3": ("minimax/h3/image-to-video",
           lambda p, u, s: {"prompt": p, "image_url": u, "duration": s, "resolution": "768P", "prompt_expansion_mode": "disabled"}),
    "h3max": ("minimax/h3-max/image-to-video",
              lambda p, u, s: {"prompt": p, "image_url": u, "duration": s, "resolution": "768P", "prompt_expansion_mode": "disabled"}),
    "h3maxturbo": ("minimax/h3-max-turbo/image-to-video",
                   lambda p, u, s: {"prompt": p, "image_url": u, "duration": s, "resolution": "768P", "prompt_expansion_mode": "disabled"}),
    "seedance": ("bytedance/seedance-2.5/us/image-to-video",
                 lambda p, u, s: {"prompt": p, "image_url": u, "duration": str(s), "resolution": "720p", "generate_audio": False}),
    "flux3max": ("blackforestlabs/flux-3-max/image-to-video",
                 lambda p, u, s: {"prompt": p, "image_url": u, "duration": s, "resolution": "720p", "generate_audio": False}),
}


def one(name, prompt, url, seconds, out, seed=None):
    endpoint, payload = MODELS[name]
    req = payload(prompt, url, seconds)
    if seed is not None:
        req["seed"] = seed
    (out / f"{name}.json").write_text(json.dumps({"endpoint": endpoint, "request": req}, indent=1))
    try:
        res, info = fal.run(endpoint, req, timeout=3600)
    except Exception as e:  # keep the other models going
        print(name, "FAILED", str(e)[:300], flush=True)
        return
    video = res.get("video") or (res.get("videos") or [{}])[0]
    fal.download(video["url"], out / f"{name}.mp4")
    (out / f"{name}.json").write_text(json.dumps({"endpoint": endpoint, "request": req, "response": res, "info": info}, indent=1))
    print(name, "ok", round(info["wall_s"]), "s", flush=True)


if __name__ == "__main__":
    ref, prompt_file, out = sys.argv[1:4]
    names = sys.argv[4].split(",") if len(sys.argv) > 4 else ["h3", "h3max", "seedance"]
    seconds = int(sys.argv[5]) if len(sys.argv) > 5 else 5
    seed = int(sys.argv[6]) if len(sys.argv) > 6 else None
    out = pathlib.Path(out)
    out.mkdir(parents=True, exist_ok=True)
    url = fal.upload(ref)
    prompt = pathlib.Path(prompt_file).read_text().strip()
    with ThreadPoolExecutor(len(names)) as ex:
        for n in names:
            ex.submit(one, n, prompt, url, seconds, out, seed)
