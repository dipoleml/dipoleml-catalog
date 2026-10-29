"""A small fal.ai queue client: submit, wait, upload, download (copied from prompt2moveset).

The key comes from FAL_KEY (or a FAL_KEY= line in the repo's .env, which git ignores). Every finished request is
appended to runs/fal_log.jsonl (endpoint, request id, status, wall time), so spend can be audited afterwards.
"""
import json, os, pathlib, time

import requests

ROOT = pathlib.Path(__file__).resolve().parents[1]
LOG = pathlib.Path(os.environ.get("MOCAP_FAL_LOG", ROOT / "runs" / "fal_log.jsonl"))


def key():
    k = os.environ.get("FAL_KEY")
    env = ROOT / ".env"
    if not k and env.exists():
        k = next((line.split("=", 1)[1].strip() for line in env.read_text().splitlines()
                  if line.startswith("FAL_KEY=")), None)
    if not k:
        raise SystemExit("set FAL_KEY (or put FAL_KEY=... in .env)")
    return k


def headers():
    return {"Authorization": f"Key {key()}", "Content-Type": "application/json"}


def retry(fn, tries=5):
    """Run fn, retrying network failures with a growing pause."""
    for attempt in range(tries):
        try:
            return fn()
        except (requests.ConnectionError, requests.Timeout):
            if attempt == tries - 1:
                raise
            time.sleep(3 * (attempt + 1))


def submit(endpoint, payload):
    for attempt in range(4):
        r = retry(lambda: requests.post(f"https://queue.fal.run/{endpoint}", headers=headers(), json=payload, timeout=60))
        if r.status_code < 500:
            break
        time.sleep(2 + 4 * attempt)
    if r.status_code >= 400:
        raise RuntimeError(f"submit {endpoint} -> {r.status_code}: {r.text[:800]}")
    return {**r.json(), "endpoint": endpoint}


def wait(sub, poll=3.0, timeout=1800):
    t0, started = time.time(), None
    while True:
        s = retry(lambda: requests.get(sub["status_url"], headers=headers(), timeout=60)).json()
        if s.get("status") == "IN_PROGRESS" and started is None:
            started = time.time()
        if s.get("status") == "COMPLETED":
            break
        if time.time() - t0 > timeout:
            raise TimeoutError(sub["request_id"])
        time.sleep(poll)
    r = retry(lambda: requests.get(sub["response_url"], headers=headers(), timeout=120))
    out = r.json()
    info = {"wall_s": time.time() - t0, "run_s": (time.time() - started) if started else None}
    LOG.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG, "a") as f:
        f.write(json.dumps({"t": time.strftime("%Y-%m-%d %H:%M:%S"), "endpoint": sub.get("endpoint"),
                            "request_id": sub["request_id"], "status": r.status_code, **info}) + "\n")
    if r.status_code >= 400:
        raise RuntimeError(f"{r.status_code}: {json.dumps(out)[:800]}")
    return out, info


def run(endpoint, payload, **kw):
    return wait(submit(endpoint, payload), **kw)


TYPES = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp", "mp4": "video/mp4",
         "zip": "application/zip", "safetensors": "application/octet-stream"}


def upload(path):
    """Upload a local file to fal storage and return its URL."""
    p = pathlib.Path(path)
    ct = TYPES[p.suffix[1:].lower()]

    def go():
        r = requests.post("https://rest.alpha.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3", headers=headers(),
                          json={"content_type": ct, "file_name": p.name}, timeout=60)
        r.raise_for_status()
        d = r.json()
        requests.put(d["upload_url"], data=p.read_bytes(), headers={"Content-Type": ct}, timeout=300).raise_for_status()
        return d["file_url"]

    return retry(go)


def download(url, dest):
    dest = pathlib.Path(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)

    def go():
        with requests.get(url, stream=True, timeout=600) as r:
            r.raise_for_status()
            with open(dest, "wb") as f:
                for c in r.iter_content(1 << 20):
                    f.write(c)
        return dest

    return retry(go)
