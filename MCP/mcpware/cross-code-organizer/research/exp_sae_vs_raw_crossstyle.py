#!/usr/bin/env python3
"""
DECISIVE TEST — does SAE-encoding generalize CROSS-STYLE better than raw activations?
(The fellowship M2 payoff question.)

Fair comparison: SAME model (GPT-2), SAME hook (blocks.7.hook_resid_pre = the SAE's
layer), SAME pooling, SAME splits. The ONLY difference is raw resid vs SAE-encoded.
If SAE >> raw on the cross-family directions (where raw collapsed to 0-15%), SAE is
worth pursuing. If SAE ~= raw, that's a meaningful negative result.

Cross-family directions:
  A) train MCPTox (templated)   -> test handcrafted (same-vocab)   [raw was ~0%]
  B) train handcrafted          -> test MCPTox                     [raw was ~15%]
Plus in-distribution 5-fold CV on each pool for reference.
"""
import json, os, numpy as np, torch
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from transformer_lens import HookedTransformer
from sae_lens import SAE

DATA = os.path.join(os.path.dirname(__file__), "datasets")
torch.set_grad_enabled(False); np.random.seed(42)


def Lf(name, lab):
    d = json.load(open(os.path.join(DATA, name)))
    return [(x["description"], lab) for x in d if isinstance(x, dict) and x.get("description")]


mcptox = Lf("mcptox_clean_descriptions_labeled.json", 0) + Lf("mcptox_poisoned_descriptions_labeled.json", 1)
hand = (Lf("hard_v3_matched_clean.json", 0) + Lf("hard_v3_matched_poisoned.json", 1) +
        Lf("neutral_clean.json", 0) + Lf("neutral_poisoned.json", 1) +
        Lf("hard_v2_clean.json", 0) + Lf("hard_v2_poisoned.json", 1) +
        Lf("hard_clean.json", 0) + Lf("hard_poisoned.json", 1) +
        Lf("hard_v3_clean.json", 0) + Lf("hard_v3_poisoned.json", 1) +
        Lf("adversarial_poisoned.json", 1) + Lf("adversarial_poisoned_v2.json", 1) + Lf("adversarial_poisoned_v3.json", 1))

print("Loading SAE + GPT-2 ...")
res = SAE.from_pretrained("gpt2-small-res-jb", "blocks.7.hook_resid_pre", device="cpu")
sae = res[0] if isinstance(res, tuple) else res
hook = sae.cfg.metadata.hook_name
kwargs = getattr(sae.cfg.metadata, "model_from_pretrained_kwargs", None) or {}
try:
    model = HookedTransformer.from_pretrained_no_processing("gpt2", **kwargs)
except Exception:
    model = HookedTransformer.from_pretrained("gpt2")


def feats(items):
    """Return raw[n,768], sae[n,24576], y."""
    raw, saef, ys = [], [], []
    for t, l in items:
        toks = model.to_tokens(t)[:, :256]
        _, cache = model.run_with_cache(toks, names_filter=hook)
        a = cache[hook][0]                       # [seq, 768]
        raw.append(a.mean(0).cpu().numpy())
        saef.append(sae.encode(a).mean(0).cpu().numpy())
        ys.append(l)
    return np.array(raw), np.array(saef), np.array(ys)


print("Encoding MCPTox ...");  mt_raw, mt_sae, mt_y = feats(mcptox)
print("Encoding handcrafted ..."); hd_raw, hd_sae, hd_y = feats(hand)


def ev(Xtr, ytr, Xte, yte):
    clf = LogisticRegression(max_iter=3000).fit(Xtr, ytr)
    p = clf.predict(Xte)
    pr, rc, f, _ = precision_recall_fscore_support(yte, p, average="binary", zero_division=0, pos_label=1)
    return accuracy_score(yte, p), rc, f


def cv(X, y):
    p = cross_val_predict(LogisticRegression(max_iter=3000), X, y,
                          cv=StratifiedKFold(5, shuffle=True, random_state=42))
    pr, rc, f, _ = precision_recall_fscore_support(y, p, average="binary", zero_division=0, pos_label=1)
    return accuracy_score(y, p), rc, f


print(f"\n{'direction':34} {'RAW acc/rec/F1':>22} {'SAE acc/rec/F1':>22}")
print("-" * 82)
def line(name, r, s):
    print(f"{name:34} {r[0]:6.1%}/{r[1]:5.1%}/{r[2]:5.1%}    {s[0]:6.1%}/{s[1]:5.1%}/{s[2]:5.1%}")

line("A train MCPTox -> test hand", ev(mt_raw, mt_y, hd_raw, hd_y), ev(mt_sae, mt_y, hd_sae, hd_y))
line("B train hand -> test MCPTox", ev(hd_raw, hd_y, mt_raw, mt_y), ev(hd_sae, hd_y, mt_sae, mt_y))
line("(ref) MCPTox in-dist CV", cv(mt_raw, mt_y), cv(mt_sae, mt_y))
line("(ref) hand in-dist CV", cv(hd_raw, hd_y), cv(hd_sae, hd_y))
print("\nRead the A/B rows: if SAE recall >> RAW recall, SAE generalizes cross-family better (M2 win).")
print("If SAE ~= RAW, SAE buys no generalization -> negative result, still publishable.")
