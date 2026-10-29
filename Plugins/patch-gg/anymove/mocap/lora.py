"""Train and use a MiniMax H3 image-to-video LoRA on fal for the two-camera layout.

python -m mocap.lora pack DATA_DIR out.zip                  videos + same-name .txt captions -> zip
python -m mocap.lora train out.zip RUN_DIR steps [--debug]  upload, train, save lora.json (--debug: 1 step + the
                                                            trainer's preprocessed dataset, to check it first)
python -m mocap.lora generate LORA REF.png PROMPT.txt OUT.mp4 [scale] [seed]
                                                            LORA: a training run's dir, a .safetensors, or a URL
python -m mocap.lora resume RUN_DIR                         keep waiting on a submitted run (after a restart)
"""
import json, pathlib, sys, zipfile

from mocap import fal

TRIGGER = "TWOCAM"
TRAINER = "minimax/h3/i2v/trainer"
INFER = "minimax/h3/image-to-video/lora"


def pack(data_dir, out):
    d = pathlib.Path(data_dir)
    vids = sorted(d.glob("*.mp4"))
    with zipfile.ZipFile(out, "w", zipfile.ZIP_STORED) as z:
        for v in vids:
            z.write(v, v.name)
            z.write(v.with_suffix(".txt"), v.with_suffix(".txt").name)
    print(f"packed {len(vids)} clips into {out} ({pathlib.Path(out).stat().st_size / 1e6:.1f} MB)")


def train(zip_path, run_dir, steps, debug=False):
    run = pathlib.Path(run_dir)
    run.mkdir(parents=True, exist_ok=True)
    url = fal.upload(zip_path)
    req = {"training_data_url": url, "number_of_steps": 1 if debug else steps, "rank": 32, "learning_rate": 2e-4,
           "number_of_frames": 107, "frame_rate": 24, "resolution": "medium", "aspect_ratio": "16:9",
           "first_frame_conditioning_p": 0.7, "trigger_phrase": TRIGGER, "debug_dataset": debug}
    (run / "request.json").write_text(json.dumps(req, indent=1))
    sub = fal.submit(TRAINER, req)
    (run / "submitted.json").write_text(json.dumps(sub, indent=1))
    print("submitted", sub["request_id"], flush=True)
    res, info = fal.wait(sub, poll=20, timeout=6 * 3600)
    (run / "lora.json").write_text(json.dumps({"response": res, "info": info}, indent=1))
    if debug and res.get("debug_dataset"):
        fal.download(res["debug_dataset"]["url"], run / "debug_dataset.zip")
    print("done", json.dumps(res)[:600], info, flush=True)


def resume(run_dir):
    run = pathlib.Path(run_dir)
    sub = json.loads((run / "submitted.json").read_text())
    res, info = fal.wait(sub, poll=30, timeout=6 * 3600)
    (run / "lora.json").write_text(json.dumps({"response": res, "info": info}, indent=1))
    print("done", json.dumps(res)[:600], info, flush=True)


RELEASE_LORA = "https://github.com/Patch-gg/anymove/releases/download/examples-v1/lora-wolf-twocam-h3.safetensors"


def lora_path(src):
    """The LoRA for fal to load: a training run's directory (the URL in its lora.json), a URL (such as the wolf LoRA in
    the examples release, RELEASE_LORA), or a small local .safetensors (uploaded to fal first)."""
    if str(src).startswith(("http://", "https://")):
        return str(src)
    p = pathlib.Path(src)
    if p.suffix == ".safetensors":
        try:
            return fal.upload(p)
        except Exception as e:   # fal's simple upload refuses big files (the wolf LoRA is 131 MB): use a URL instead
            raise SystemExit(f"could not upload {p.name} to fal ({e.__class__.__name__}); pass the LoRA's URL instead, "
                             "e.g. " + RELEASE_LORA) from None
    return json.loads((p / "lora.json").read_text())["response"]["lora_file"]["url"]


def generate(run_dir, ref, prompt_file, out, scale=1.0, seed=None):
    lora = lora_path(run_dir)
    prompt = TRIGGER + " " + pathlib.Path(prompt_file).read_text().strip()
    req = {"prompt": prompt, "image_url": fal.upload(ref), "loras": [{"path": lora, "scale": scale}], "duration": 5,
           "resolution": "768P", "prompt_expansion_mode": "disabled"}
    if seed is not None:
        req["seed"] = seed
    res, info = fal.run(INFER, req, timeout=3600)
    fal.download(res["video"]["url"], out)
    pathlib.Path(str(out) + ".json").write_text(json.dumps({"request": req, "response": res, "info": info}, indent=1))
    print("generated", out, round(info["wall_s"]), "s")


if __name__ == "__main__":
    cmd, args = sys.argv[1], [a for a in sys.argv[2:] if not a.startswith("--")]
    if cmd == "pack":
        pack(*args[:2])
    elif cmd == "train":
        train(args[0], args[1], int(args[2]), "--debug" in sys.argv)
    elif cmd == "resume":
        resume(args[0])
    elif cmd == "generate":
        generate(args[0], args[1], args[2], args[3], float(args[4]) if len(args) > 4 else 1.0,
                 int(args[5]) if len(args) > 5 else None)
