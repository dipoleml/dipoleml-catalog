#!/usr/bin/env python3
"""
CONFIRMATION — is SAE's cross-family win (14%->84%) robust, or a one-off MCPTox quirk?
Leave-one-FAMILY-out: for each balanced family, train on ALL others (+ adversarial
poison), test on the held-out family. Compare RAW vs SAE on the SAME held-out items.
Same GPT-2, same hook (blocks.7), same pooling; only raw-vs-SAE differs.
"""
import json, os, numpy as np, torch
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import precision_recall_fscore_support, accuracy_score
from transformer_lens import HookedTransformer
from sae_lens import SAE

DATA = os.path.join(os.path.dirname(__file__), "datasets")
torch.set_grad_enabled(False); np.random.seed(42)


def Lf(name, lab):
    d = json.load(open(os.path.join(DATA, name)))
    return [(x["description"], lab) for x in d if isinstance(x, dict) and x.get("description")]


FAM = {
    "mcptox":  Lf("mcptox_clean_descriptions_labeled.json", 0) + Lf("mcptox_poisoned_descriptions_labeled.json", 1),
    "hard":    Lf("hard_clean.json", 0) + Lf("hard_poisoned.json", 1),
    "hard_v2": Lf("hard_v2_clean.json", 0) + Lf("hard_v2_poisoned.json", 1),
    "hard_v3": Lf("hard_v3_clean.json", 0) + Lf("hard_v3_poisoned.json", 1),
    "matched": Lf("hard_v3_matched_clean.json", 0) + Lf("hard_v3_matched_poisoned.json", 1),
    "neutral": Lf("neutral_clean.json", 0) + Lf("neutral_poisoned.json", 1),
}
EXTRA = Lf("adversarial_poisoned.json", 1) + Lf("adversarial_poisoned_v2.json", 1) + Lf("adversarial_poisoned_v3.json", 1)

print("Loading SAE + GPT-2 ...")
res = SAE.from_pretrained("gpt2-small-res-jb", "blocks.7.hook_resid_pre", device="cpu")
sae = res[0] if isinstance(res, tuple) else res
hook = sae.cfg.metadata.hook_name
kwargs = getattr(sae.cfg.metadata, "model_from_pretrained_kwargs", None) or {}
try:
    model = HookedTransformer.from_pretrained_no_processing("gpt2", **kwargs)
except Exception:
    model = HookedTransformer.from_pretrained("gpt2")

recs = [(t, l, fam) for fam, items in FAM.items() for t, l in items] + [(t, l, "_adv") for t, l in EXTRA]
print(f"Encoding {len(recs)} descriptions (raw + SAE) ...")
RAW, SAEF, Y, FAMT = [], [], [], []
for t, l, fam in recs:
    toks = model.to_tokens(t)[:, :256]
    _, cache = model.run_with_cache(toks, names_filter=hook)
    a = cache[hook][0]
    RAW.append(a.mean(0).cpu().numpy()); SAEF.append(sae.encode(a).mean(0).cpu().numpy())
    Y.append(l); FAMT.append(fam)
RAW = np.array(RAW); SAEF = np.array(SAEF); Y = np.array(Y); FAMT = np.array(FAMT)


def rec(Xtr, ytr, Xte, yte):
    p = LogisticRegression(max_iter=3000).fit(Xtr, ytr).predict(Xte)
    _, r, f, _ = precision_recall_fscore_support(yte, p, average="binary", zero_division=0, pos_label=1)
    return accuracy_score(yte, p), r, f


print(f"\n{'held-out family':14} {'n':>5} {'RAW rec/F1':>16} {'SAE rec/F1':>16}  delta-recall")
print("-" * 74)
braw, bsae = [], []
for fam in FAM:
    tr = FAMT != fam; te = FAMT == fam
    ra, rr, rf = rec(RAW[tr], Y[tr], RAW[te], Y[te])
    sa, sr, sf = rec(SAEF[tr], Y[tr], SAEF[te], Y[te])
    braw.append(rr); bsae.append(sr)
    print(f"{fam:14} {te.sum():5d} {rr:7.1%}/{rf:6.1%}   {sr:7.1%}/{sf:6.1%}    {sr-rr:+.1%}")
print("-" * 74)
print(f"{'MEAN recall':14} {'':>5} {np.mean(braw):7.1%}{'':>9} {np.mean(bsae):7.1%}{'':>9}    {np.mean(bsae)-np.mean(braw):+.1%}")
print("\nIf SAE recall > RAW on most held-out families, the cross-family win is robust.")
