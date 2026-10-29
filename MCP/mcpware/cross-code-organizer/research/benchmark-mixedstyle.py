#!/usr/bin/env python3
"""
Does MIXED-STYLE training rescue cross-style generalization?

Leave-one-style-out: for each balanced style S, train the probe on ALL other
styles pooled (+ adversarial poison always in train for diversity), test on the
held-out style S. If diversity helps, held-out recall should rise well above the
single-style cross-style collapse (~0-23%). deberta (Snyk) zero-shot = constant
baseline on each held-out style.

Sensor = GPT-2 (paper's model, fast). Layer chosen per fold by 5-fold CV on the
training pool. Seed 42.
"""
import json, os, numpy as np, torch
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from transformers import AutoTokenizer, AutoModel, pipeline

SEED = 42; DEPTHS = [0.25, 0.40, 0.55]
DATA = os.path.join(os.path.dirname(__file__), "datasets")
np.random.seed(SEED); torch.manual_seed(SEED)


def L(name, forced):
    with open(os.path.join(DATA, name)) as f:
        d = json.load(f)
    out = []
    for x in d:
        t = x.get("description") if isinstance(x, dict) else (x if isinstance(x, str) else None)
        if t:
            out.append((t, forced))
    return out


# balanced styles (clean + poison) used as held-out test rotation
STYLES = {
    "mcptox":  L("mcptox_clean_descriptions_labeled.json", 0) + L("mcptox_poisoned_descriptions_labeled.json", 1),
    "hard":    L("hard_clean.json", 0) + L("hard_poisoned.json", 1),
    "hard_v2": L("hard_v2_clean.json", 0) + L("hard_v2_poisoned.json", 1),
    "hard_v3": L("hard_v3_clean.json", 0) + L("hard_v3_poisoned.json", 1),
    "matched": L("hard_v3_matched_clean.json", 0) + L("hard_v3_matched_poisoned.json", 1),
    "neutral": L("neutral_clean.json", 0) + L("neutral_poisoned.json", 1),
}
# poison-only, always in training pool for diversity
EXTRA = L("adversarial_poisoned.json", 1) + L("adversarial_poisoned_v2.json", 1) + L("adversarial_poisoned_v3.json", 1)

# master corpus with style tags
recs = []
for sname, items in STYLES.items():
    for t, y in items:
        recs.append((t, y, sname))
for t, y in EXTRA:
    recs.append((t, y, "_adv"))
texts = [r[0] for r in recs]; ys = np.array([r[1] for r in recs]); styles = np.array([r[2] for r in recs])

print("Extracting GPT-2 activations once for", len(texts), "texts ...")
tok = AutoTokenizer.from_pretrained("gpt2"); tok.pad_token = tok.eos_token
gpt2 = AutoModel.from_pretrained("gpt2", output_hidden_states=True).eval()
nL = gpt2.config.num_hidden_layers
LAYERS = sorted({max(1, min(nL, round(d * nL))) for d in DEPTHS})
feat = {l: [] for l in LAYERS}
for i in range(0, len(texts), 16):
    enc = tok(texts[i:i+16], return_tensors="pt", padding=True, truncation=True, max_length=256)
    with torch.no_grad():
        out = gpt2(**enc)
    m = enc["attention_mask"].unsqueeze(-1).float()
    for l in LAYERS:
        feat[l].append(((out.hidden_states[l]*m).sum(1)/m.sum(1)).numpy())
feat = {l: np.vstack(v) for l, v in feat.items()}

print("Loading deberta baseline ...")
pi = pipeline("text-classification", model="protectai/deberta-v3-base-prompt-injection-v2", top_k=None, truncation=True)
def deberta(ts):
    o = []
    for r in pi(ts, batch_size=16):
        sc = next((s["score"] for s in r if s["label"] == "INJECTION"), 0.0)
        o.append(1 if sc > 0.9 else 0)
    return o

def mm(g, p):
    pr, rc, f, _ = precision_recall_fscore_support(g, p, average="binary", zero_division=0, pos_label=1)
    return accuracy_score(g, p), pr, rc, f

print(f"\n{'held-out style':14} {'n':>5} | {'MIXED-train probe':>26} | {'deberta (Snyk)':>22}")
print(f"{'':14} {'':>5} | {'lyr':>4} {'acc':>6} {'rec':>6} {'F1':>6} | {'acc':>6} {'rec':>6} {'F1':>6}")
print("-" * 80)
for held in STYLES:
    tr = (styles != held)            # train on every other style + adversarial
    te = (styles == held)
    ytr = ys[tr]
    # pick layer by CV on training pool
    skf = StratifiedKFold(5, shuffle=True, random_state=SEED)
    bL, bs = LAYERS[0], -1
    for l in LAYERS:
        s = cross_val_score(LogisticRegression(max_iter=2000), feat[l][tr], ytr, cv=skf).mean()
        if s > bs: bs, bL = s, l
    clf = LogisticRegression(max_iter=2000).fit(feat[bL][tr], ytr)
    pa, _, pr, pf = mm(ys[te], clf.predict(feat[bL][te]))
    da, _, dr, df = mm(ys[te], deberta([texts[i] for i in np.where(te)[0]]))
    print(f"{held:14} {te.sum():5d} | {bL:4d} {pa:6.1%} {pr:6.1%} {pf:6.1%} | {da:6.1%} {dr:6.1%} {df:6.1%}")

print("\nCompare held-out recall to the single-style cross-style run (0-23%).")
print("If mixed-train recall is much higher, diversity rescues generalization.")
