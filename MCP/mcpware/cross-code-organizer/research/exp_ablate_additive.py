#!/usr/bin/env python3
"""
Ablation: how much of the SAE cross-family win (hand->MCPTox, ~84% recall) depends
on the additive-framing features (#8063 'Also', #11596 'included', #2344 'each')?

Zero those SAE features in BOTH train and test, retrain the probe, measure the drop
on held-out MCPTox. Random-3 ablation = control (a non-specific drop baseline).
"""
import json, os, numpy as np, torch
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import precision_recall_fscore_support, accuracy_score
from transformer_lens import HookedTransformer
from sae_lens import SAE

DATA = os.path.join(os.path.dirname(__file__), "datasets")
torch.set_grad_enabled(False); rng = np.random.default_rng(42)

ADDITIVE = [8063, 11596, 2344]   # 'Also', 'included', 'each'


def Lf(name, lab):
    d = json.load(open(os.path.join(DATA, name)))
    return [(x["description"], lab) for x in d if isinstance(x, dict) and x.get("description")]


hand = (Lf("hard_v3_matched_clean.json", 0) + Lf("hard_v3_matched_poisoned.json", 1) +
        Lf("neutral_clean.json", 0) + Lf("neutral_poisoned.json", 1) +
        Lf("hard_v2_clean.json", 0) + Lf("hard_v2_poisoned.json", 1) +
        Lf("hard_clean.json", 0) + Lf("hard_poisoned.json", 1) +
        Lf("hard_v3_clean.json", 0) + Lf("hard_v3_poisoned.json", 1) +
        Lf("adversarial_poisoned.json", 1) + Lf("adversarial_poisoned_v2.json", 1) + Lf("adversarial_poisoned_v3.json", 1))
mcptox = Lf("mcptox_clean_descriptions_labeled.json", 0) + Lf("mcptox_poisoned_descriptions_labeled.json", 1)

print("Loading SAE + GPT-2 ...")
res = SAE.from_pretrained("gpt2-small-res-jb", "blocks.7.hook_resid_pre", device="cpu")
sae = res[0] if isinstance(res, tuple) else res
hook = sae.cfg.metadata.hook_name
kwargs = getattr(sae.cfg.metadata, "model_from_pretrained_kwargs", None) or {}
try:
    model = HookedTransformer.from_pretrained_no_processing("gpt2", **kwargs)
except Exception:
    model = HookedTransformer.from_pretrained("gpt2")


def enc(items):
    X, y = [], []
    for t, l in items:
        toks = model.to_tokens(t)[:, :256]
        _, cache = model.run_with_cache(toks, names_filter=hook)
        X.append(sae.encode(cache[hook][0]).mean(0).cpu().numpy()); y.append(l)
    return np.array(X), np.array(y)


print("Encoding hand + MCPTox ...")
Xtr, ytr = enc(hand); Xte, yte = enc(mcptox)


def transfer_recall(drop=None):
    A, B = Xtr.copy(), Xte.copy()
    if drop is not None:
        A[:, drop] = 0; B[:, drop] = 0
    p = LogisticRegression(max_iter=4000).fit(A, ytr).predict(B)
    _, r, f, _ = precision_recall_fscore_support(yte, p, average="binary", zero_division=0, pos_label=1)
    return accuracy_score(yte, p), r, f


print(f"\nCross-family transfer (train hand -> test MCPTox, n={len(yte)}):")
print(f"{'condition':34} {'acc':>7} {'recall':>8} {'F1':>7}")
print("-" * 60)
b = transfer_recall(None);              print(f"{'baseline (all features)':34} {b[0]:7.1%} {b[1]:8.1%} {b[2]:7.1%}")
a1 = transfer_recall([8063]);           print(f"{'ablate #8063 (Also)':34} {a1[0]:7.1%} {a1[1]:8.1%} {a1[2]:7.1%}")
a3 = transfer_recall(ADDITIVE);         print(f"{'ablate additive {Also,incl,each}':34} {a3[0]:7.1%} {a3[1]:8.1%} {a3[2]:7.1%}")
# control: 3 random features, averaged over 5 draws
rec = []
for _ in range(5):
    rec.append(transfer_recall(list(rng.integers(0, Xtr.shape[1], 3)))[1])
print(f"{'ablate 3 RANDOM features (x5 avg)':34} {'':>7} {np.mean(rec):8.1%} {'':>7}")
print(f"\nbaseline recall {b[1]:.1%} -> additive-ablated {a3[1]:.1%} "
      f"(drop {b[1]-a3[1]:+.1%}); random-3 control {np.mean(rec):.1%}.")
print("If additive-ablation drops MUCH more than random-3, the win leans on additive framing.")
