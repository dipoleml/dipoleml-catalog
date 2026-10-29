#!/usr/bin/env python3
"""
Sensor bake-off: which small local model gives the best activation-probe
GENERALIZATION across attack styles?  GPT-2 vs SmolLM2-360M vs Qwen2.5-0.5B.

Cross-style = train the probe on one dataset style, test on a DIFFERENT style:
  block A: train MCPTox (templated) -> test pooled matched/neutral/hard (same-vocab)
  block B: train pooled hard         -> test MCPTox
Also reports in-distribution 5-fold CV for reference, and deberta (Snyk) zero-shot
as the constant baseline on each test set.

Probe = logistic regression on mean-pooled residual-stream activations. For each
model the probing layer is chosen on the TRAIN set (5-fold CV over candidate
depths 25/40/55%), then frozen and evaluated on TEST. Seed 42.

Run:
    . .venv-bench/bin/activate
    pip install scikit-learn numpy
    python benchmark-sensor-crossstyle.py
"""
import json, os, gc, numpy as np, torch
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from transformers import AutoTokenizer, AutoModel, pipeline

SEED = 42
DEPTHS = [0.25, 0.40, 0.55]
DATA = os.path.join(os.path.dirname(__file__), "datasets")
SENSORS = ["gpt2", "HuggingFaceTB/SmolLM2-360M", "Qwen/Qwen2.5-0.5B"]
np.random.seed(SEED); torch.manual_seed(SEED)


def to_label(v, forced):
    if v is None:
        return forced
    if isinstance(v, (int, float)):
        return int(v)
    s = str(v).strip().lower()
    if s in ("1", "poisoned", "poison", "malicious", "injection", "unsafe", "bad"):
        return 1
    if s in ("0", "clean", "safe", "benign", "good"):
        return 0
    return forced


def load(path, forced):
    with open(path) as f:
        d = json.load(f)
    out = []
    for x in d:
        if isinstance(x, str):
            out.append((x, forced))
        elif isinstance(x, dict):
            t = x.get("description") or x.get("text") or x.get("tool_description")
            if t:
                out.append((t, to_label(x.get("label"), forced)))
    return out


# datasets
mcptox = load(os.path.join(DATA, "mcptox_clean_descriptions_labeled.json"), 0) + \
         load(os.path.join(DATA, "mcptox_poisoned_descriptions_labeled.json"), 1)
hard = []
for cf, pf in [("hard_v3_matched_clean.json", "hard_v3_matched_poisoned.json"),
               ("neutral_clean.json", "neutral_poisoned.json"),
               ("hard_v2_clean.json", "hard_v2_poisoned.json")]:
    hard += load(os.path.join(DATA, cf), 0) + load(os.path.join(DATA, pf), 1)
mt_x = [t for t, _ in mcptox]; mt_y = np.array([l for _, l in mcptox])
hd_x = [t for t, _ in hard];   hd_y = np.array([l for _, l in hard])


def extract(model_id, texts, depths=DEPTHS, batch=16):
    """Return {layer_index: (n, hidden) mean-pooled activations} for candidate layers."""
    tok = AutoTokenizer.from_pretrained(model_id)
    if tok.pad_token is None:
        tok.pad_token = tok.eos_token
    model = AutoModel.from_pretrained(model_id, output_hidden_states=True,
                                      torch_dtype=torch.float32).eval()
    n_layers = model.config.num_hidden_layers
    layers = sorted({max(1, min(n_layers, round(d * n_layers))) for d in depths})
    acc = {L: [] for L in layers}
    for i in range(0, len(texts), batch):
        enc = tok(texts[i:i + batch], return_tensors="pt", padding=True,
                  truncation=True, max_length=256)
        with torch.no_grad():
            out = model(**enc)
        m = enc["attention_mask"].unsqueeze(-1).float()
        for L in layers:
            hs = out.hidden_states[L]
            mean = (hs * m).sum(1) / m.sum(1)
            acc[L].append(mean.float().numpy())
    del model; gc.collect()
    return {L: np.vstack(v) for L, v in acc.items()}, n_layers


def best_layer(feats_by_layer, y):
    """Pick layer with best 5-fold CV accuracy on the training set."""
    best, bL = -1, None
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    for L, X in feats_by_layer.items():
        s = cross_val_score(LogisticRegression(max_iter=2000), X, y, cv=skf).mean()
        if s > best:
            best, bL = s, L
    return bL, best


def m(gold, pred):
    a = accuracy_score(gold, pred)
    p, r, f, _ = precision_recall_fscore_support(gold, pred, average="binary",
                                                 zero_division=0, pos_label=1)
    return a, p, r, f


# deberta baseline (constant)
print("Loading Snyk deberta baseline ...")
pi = pipeline("text-classification", model="protectai/deberta-v3-base-prompt-injection-v2",
              top_k=None, truncation=True)
def deberta(texts):
    out = []
    for r in pi(texts, batch_size=16):
        sc = next((s["score"] for s in r if s["label"] == "INJECTION"), 0.0)
        out.append(1 if sc > 0.9 else 0)
    return out
deb_on_hd = deberta(hd_x)
deb_on_mt = deberta(mt_x)

print(f"\n{'sensor':22} {'block':28} {'layer':>6} {'acc':>7} {'prec':>7} {'rec':>7} {'F1':>7}")
print("-" * 92)
for sid in SENSORS:
    name = sid.split("/")[-1]
    print(f"... extracting {name}", flush=True)
    mt_feats, nl = extract(sid, mt_x)
    hd_feats, _ = extract(sid, hd_x)

    # block A: train MCPTox -> test hard (layer chosen on MCPTox train)
    L, _ = best_layer(mt_feats, mt_y)
    clf = LogisticRegression(max_iter=2000).fit(mt_feats[L], mt_y)
    a, p, r, f = m(hd_y, clf.predict(hd_feats[L]))
    print(f"{name:22} {'A train MCPTox->test hard':28} {f'{L}/{nl}':>6} {a:7.1%} {p:7.1%} {r:7.1%} {f:7.1%}")

    # block B: train hard -> test MCPTox (layer chosen on hard train)
    L2, _ = best_layer(hd_feats, hd_y)
    clf2 = LogisticRegression(max_iter=2000).fit(hd_feats[L2], hd_y)
    a, p, r, f = m(mt_y, clf2.predict(mt_feats[L2]))
    print(f"{name:22} {'B train hard->test MCPTox':28} {f'{L2}/{nl}':>6} {a:7.1%} {p:7.1%} {r:7.1%} {f:7.1%}")

    # in-distribution CV reference (MCPTox, best layer)
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    cvp = np.zeros_like(mt_y)
    for tr, te in skf.split(mt_feats[L], mt_y):
        cvp[te] = LogisticRegression(max_iter=2000).fit(mt_feats[L][tr], mt_y[tr]).predict(mt_feats[L][te])
    a, p, r, f = m(mt_y, cvp)
    print(f"{name:22} {'(ref) MCPTox in-dist CV':28} {f'{L}/{nl}':>6} {a:7.1%} {p:7.1%} {r:7.1%} {f:7.1%}")
    del mt_feats, hd_feats; gc.collect()

a, p, r, f = m(hd_y, deb_on_hd)
print("-" * 92)
print(f"{'deberta (Snyk)':22} {'test hard (zero-shot)':28} {'-':>6} {a:7.1%} {p:7.1%} {r:7.1%} {f:7.1%}")
a, p, r, f = m(mt_y, deb_on_mt)
print(f"{'deberta (Snyk)':22} {'test MCPTox (zero-shot)':28} {'-':>6} {a:7.1%} {p:7.1%} {r:7.1%} {f:7.1%}")
print("\nCross-style = the honest generalization number (train one style, test another).")
print("Pick the sensor with the best block-A/B numbers as the product default.")
