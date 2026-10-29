#!/usr/bin/env python3
"""
EXPERIMENT ① — SAE intent decomposition (fellowship Month-2, done solo on OPEN tooling).

Question (RAGLens Feature 22790 style): does a single / few SAE features fire
differentially on SAFE vs MALICIOUS tool descriptions? If yes -> an interpretable
"intent" feature, the thing the fellowship M2 was after.

Sensor = GPT-2 small (ungated, matches the paper). SAE = Joseph Bloom's open
gpt2-small residual SAE via sae_lens (ungated). Gemma-2-2b is the upgrade path but
its weights are HF-gated (needs a token); GPT-2 proves the method now.
"""
import json, os, numpy as np, torch
from sklearn.metrics import roc_auc_score
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score
from transformer_lens import HookedTransformer
from sae_lens import SAE

DATA = os.path.join(os.path.dirname(__file__), "datasets")
torch.set_grad_enabled(False)


def L(name, lab):
    d = json.load(open(os.path.join(DATA, name)))
    return [(x["description"], lab) for x in d if isinstance(x, dict) and x.get("description")]


# same-words-different-intent pool (where text methods score 0%)
data = (L("hard_v3_matched_clean.json", 0) + L("hard_v3_matched_poisoned.json", 1) +
        L("neutral_clean.json", 0) + L("neutral_poisoned.json", 1) +
        L("hard_v2_clean.json", 0) + L("hard_v2_poisoned.json", 1) +
        L("hard_clean.json", 0) + L("hard_poisoned.json", 1))
texts = [t for t, _ in data]; y = np.array([l for _, l in data])
print(f"{len(texts)} descriptions ({y.sum()} poisoned / {(y==0).sum()} clean)")

print("Loading open GPT-2 SAE (gpt2-small-res-jb, blocks.7.hook_resid_pre) ...")
res = SAE.from_pretrained("gpt2-small-res-jb", "blocks.7.hook_resid_pre", device="cpu")
sae = res[0] if isinstance(res, tuple) else res
meta = sae.cfg.metadata
hook = meta.hook_name                                  # sae_lens v6: hook lives in metadata
kwargs = getattr(meta, "model_from_pretrained_kwargs", None) or {}
print(f"SAE: d_in={sae.cfg.d_in} d_sae={sae.cfg.d_sae} hook={hook}")
print("Loading GPT-2 (transformer_lens, no-processing as SAE expects) ...")
try:
    model = HookedTransformer.from_pretrained_no_processing("gpt2", **kwargs)
except Exception:
    model = HookedTransformer.from_pretrained("gpt2")


def sae_features(texts):
    out = []
    for t in texts:
        toks = model.to_tokens(t)[:, :256]
        _, cache = model.run_with_cache(toks, names_filter=hook)
        acts = cache[hook][0]                      # [seq, d_in]
        f = sae.encode(acts)                       # [seq, d_sae]
        out.append(f.mean(0).cpu().numpy())        # mean-pool over tokens
    return np.array(out)


print("Encoding to SAE features ...")
X = sae_features(texts)

# per-feature discrimination: AUROC of each single SAE feature separating clean/poison
active = [j for j in range(X.shape[1]) if X[:, j].std() > 1e-6]
auc = {j: roc_auc_score(y, X[:, j]) for j in active}
top = sorted(auc, key=lambda j: abs(auc[j] - 0.5), reverse=True)[:15]

print(f"\nActive SAE features: {len(active)} / {X.shape[1]}")
print(f"\n{'feature':>8} {'AUROC':>7} {'mean_poison':>12} {'mean_clean':>11}  (single-feature intent separation)")
print("-" * 60)
for j in top:
    mp = X[y == 1, j].mean(); mc = X[y == 0, j].mean()
    print(f"{j:8d} {auc[j]:7.3f} {mp:12.3f} {mc:11.3f}")

best = top[0]
print(f"\nBest single feature #{best}: AUROC {auc[best]:.3f} "
      f"(1.0 or 0.0 = perfectly separates intent; 0.5 = useless).")
print(f"Neuronpedia: gpt2-small/7-res-jb/{best}  (look it up to NAME the concept)")

# does a probe on SAE features separate intent? (in-distribution CV)
skf = StratifiedKFold(5, shuffle=True, random_state=42)
cv = cross_val_score(LogisticRegression(max_iter=3000), X, y, cv=skf).mean()
print(f"\nLogReg on SAE features, 5-fold CV accuracy: {cv:.1%}")
print("Next: test if top SAE features transfer CROSS-style better than raw activations (the M2 payoff).")
