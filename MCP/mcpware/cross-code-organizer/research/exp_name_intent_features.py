#!/usr/bin/env python3
"""
Which SAE features DRIVE the cross-family transfer? Train the probe on the
handcrafted pool (the config that generalized to MCPTox at 84%), read the logistic
-regression weights, and list the top SAE features pushing toward "poison". Those
are the candidate INTENT features to name on Neuronpedia (gpt2-small/7-res-jb/<id>).
"""
import json, os, numpy as np, torch
from sklearn.linear_model import LogisticRegression
from transformer_lens import HookedTransformer
from sae_lens import SAE

DATA = os.path.join(os.path.dirname(__file__), "datasets")
torch.set_grad_enabled(False); np.random.seed(42)


def Lf(name, lab):
    d = json.load(open(os.path.join(DATA, name)))
    return [(x["description"], lab) for x in d if isinstance(x, dict) and x.get("description")]


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

X, y = [], []
for t, l in hand:
    toks = model.to_tokens(t)[:, :256]
    _, cache = model.run_with_cache(toks, names_filter=hook)
    X.append(sae.encode(cache[hook][0]).mean(0).cpu().numpy()); y.append(l)
X = np.array(X); y = np.array(y)

clf = LogisticRegression(max_iter=4000).fit(X, y)
w = clf.coef_[0]
top_pois = np.argsort(w)[::-1][:12]      # push toward poison
top_clean = np.argsort(w)[:6]            # push toward clean
print("\nTop SAE features -> POISON (name these on Neuronpedia gpt2-small/7-res-jb/<id>):")
for j in top_pois:
    mp, mc = X[y == 1, j].mean(), X[y == 0, j].mean()
    print(f"  feat {j:6d}  weight {w[j]:+.3f}  mean_poison {mp:.3f}  mean_clean {mc:.3f}  "
          f"https://neuronpedia.org/gpt2-small/7-res-jb/{j}")
print("\nTop SAE features -> CLEAN:")
for j in top_clean:
    print(f"  feat {j:6d}  weight {w[j]:+.3f}  https://neuronpedia.org/gpt2-small/7-res-jb/{j}")

ids = ",".join(str(int(j)) for j in top_pois[:6])
print(f"\nLook up top-6 poison feature IDs: {ids}")
