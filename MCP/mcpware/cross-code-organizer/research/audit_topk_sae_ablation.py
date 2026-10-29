#!/usr/bin/env python3
"""Audit whether SAE transfer depends on a small top-weight feature set."""
import json
import os

import numpy as np
import torch
from sae_lens import SAE
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from transformer_lens import HookedTransformer

DATA = os.path.join(os.path.dirname(__file__), "datasets")
torch.set_grad_enabled(False)
rng = np.random.default_rng(42)


def load_file(name, label):
    with open(os.path.join(DATA, name)) as f:
        rows = json.load(f)
    return [
        (row["description"], label)
        for row in rows
        if isinstance(row, dict) and row.get("description")
    ]


hand = (
    load_file("hard_v3_matched_clean.json", 0)
    + load_file("hard_v3_matched_poisoned.json", 1)
    + load_file("neutral_clean.json", 0)
    + load_file("neutral_poisoned.json", 1)
    + load_file("hard_v2_clean.json", 0)
    + load_file("hard_v2_poisoned.json", 1)
    + load_file("hard_clean.json", 0)
    + load_file("hard_poisoned.json", 1)
    + load_file("hard_v3_clean.json", 0)
    + load_file("hard_v3_poisoned.json", 1)
    + load_file("adversarial_poisoned.json", 1)
    + load_file("adversarial_poisoned_v2.json", 1)
    + load_file("adversarial_poisoned_v3.json", 1)
)
mcptox = load_file("mcptox_clean_descriptions_labeled.json", 0) + load_file(
    "mcptox_poisoned_descriptions_labeled.json", 1
)

print("Loading GPT-2 SAE ...", flush=True)
res = SAE.from_pretrained("gpt2-small-res-jb", "blocks.7.hook_resid_pre", device="cpu")
sae = res[0] if isinstance(res, tuple) else res
hook = sae.cfg.metadata.hook_name
kwargs = getattr(sae.cfg.metadata, "model_from_pretrained_kwargs", None) or {}
try:
    model = HookedTransformer.from_pretrained_no_processing("gpt2", **kwargs)
except Exception:
    model = HookedTransformer.from_pretrained("gpt2")


def encode(items, tag):
    X = []
    y = []
    for idx, (text, label) in enumerate(items, 1):
        tokens = model.to_tokens(text)[:, :256]
        _, cache = model.run_with_cache(tokens, names_filter=hook)
        X.append(sae.encode(cache[hook][0]).mean(0).cpu().numpy())
        y.append(label)
        if idx % 100 == 0:
            print(f"  encoded {tag} {idx}/{len(items)}", flush=True)
    return np.array(X), np.array(y)


print("Encoding train hand + test MCPTox ...", flush=True)
Xtr, ytr = encode(hand, "hand")
Xte, yte = encode(mcptox, "mcptox")


def score(drop=None):
    A = Xtr.copy()
    B = Xte.copy()
    if drop is not None:
        A[:, drop] = 0
        B[:, drop] = 0
    clf = LogisticRegression(max_iter=4000).fit(A, ytr)
    pred = clf.predict(B)
    precision, recall, f1, _ = precision_recall_fscore_support(
        yte, pred, average="binary", zero_division=0, pos_label=1
    )
    return accuracy_score(yte, pred), precision, recall, f1


base_clf = LogisticRegression(max_iter=4000).fit(Xtr, ytr)
weights = base_clf.coef_[0]
top_pos = list(np.argsort(weights)[::-1])
additive = [8063, 11596, 2344]

print(f"\n{'condition':36} {'acc':>7} {'prec':>7} {'rec':>7} {'F1':>7}")
print("-" * 70)
base = score()
print(f"{'baseline all features':36} {base[0]:7.1%} {base[1]:7.1%} {base[2]:7.1%} {base[3]:7.1%}")
for label, drop in [
    ("ablate top-1 positive", top_pos[:1]),
    ("ablate additive 3", additive),
    ("ablate top-10 positive", top_pos[:10]),
    ("ablate top-20 positive", top_pos[:20]),
    ("ablate top-50 positive", top_pos[:50]),
]:
    result = score(drop)
    print(f"{label:36} {result[0]:7.1%} {result[1]:7.1%} {result[2]:7.1%} {result[3]:7.1%}")

for k in [10, 20, 50]:
    recalls = []
    for _ in range(10):
        drop = list(rng.choice(Xtr.shape[1], size=k, replace=False))
        recalls.append(score(drop)[2])
    print(f"random-{k} ablation recall avg/std: {np.mean(recalls):.1%} / {np.std(recalls):.1%}")

print("\nTop positive feature IDs:")
print(",".join(str(int(x)) for x in top_pos[:20]))
