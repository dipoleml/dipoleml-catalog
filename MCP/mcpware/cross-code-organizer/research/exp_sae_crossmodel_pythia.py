#!/usr/bin/env python3
"""
CROSS-MODEL confirmation — does the SAE cross-family win replicate on a DIFFERENT
model family? Repeats exp_sae_vs_raw_crossstyle.py on Pythia-70m-deduped (EleutherAI,
GPT-NeoX arch) + its open residual SAE. (Gemma-2-2b is the ideal upgrade but its
weights are HF-gated; Pythia is ungated and a genuinely different family.)

If SAE >> raw on the cross-family direction here too, the effect is not GPT-2-specific.
"""
import json, os, numpy as np, torch
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import precision_recall_fscore_support, accuracy_score
from transformer_lens import HookedTransformer
from sae_lens import SAE

DATA = os.path.join(os.path.dirname(__file__), "datasets")
torch.set_grad_enabled(False); np.random.seed(42)
RELEASE = "pythia-70m-deduped-res-sm"


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

# discover a middle-layer residual sae_id for this release
try:
    from sae_lens import get_pretrained_saes_directory as gdir
except Exception:
    from sae_lens.loading.pretrained_saes_directory import get_pretrained_saes_directory as gdir
saes_map = gdir()[RELEASE].saes_map
res_ids = [sid for sid in saes_map if "resid" in sid]
res_ids.sort(key=lambda s: int("".join(ch for ch in s.split(".")[1] if ch.isdigit()) or 0))
sae_id = res_ids[len(res_ids) // 2] if res_ids else list(saes_map)[0]
print(f"Release {RELEASE}, picked sae_id = {sae_id} (of {len(saes_map)} saes)")

res = SAE.from_pretrained(RELEASE, sae_id, device="cpu")
sae = res[0] if isinstance(res, tuple) else res
hook = sae.cfg.metadata.hook_name
print(f"SAE: d_in={sae.cfg.d_in} d_sae={sae.cfg.d_sae} hook={hook}")
print("Loading Pythia-70m-deduped ...")
model = HookedTransformer.from_pretrained("pythia-70m-deduped")


def feats(items):
    raw, sf, ys = [], [], []
    for t, l in items:
        toks = model.to_tokens(t)[:, :256]
        _, cache = model.run_with_cache(toks, names_filter=hook)
        a = cache[hook][0]
        raw.append(a.mean(0).cpu().numpy()); sf.append(sae.encode(a).mean(0).cpu().numpy()); ys.append(l)
    return np.array(raw), np.array(sf), np.array(ys)


print("Encoding ...")
mt_r, mt_s, mt_y = feats(mcptox)
hd_r, hd_s, hd_y = feats(hand)


def ev(Xtr, ytr, Xte, yte):
    p = LogisticRegression(max_iter=3000).fit(Xtr, ytr).predict(Xte)
    _, r, f, _ = precision_recall_fscore_support(yte, p, average="binary", zero_division=0, pos_label=1)
    return accuracy_score(yte, p), r, f


print(f"\n{'direction (Pythia-70m)':30} {'RAW acc/rec/F1':>22} {'SAE acc/rec/F1':>22}")
print("-" * 78)
def line(n, r, s): print(f"{n:30} {r[0]:6.1%}/{r[1]:5.1%}/{r[2]:5.1%}    {s[0]:6.1%}/{s[1]:5.1%}/{s[2]:5.1%}")
line("A train MCPTox -> test hand", ev(mt_r, mt_y, hd_r, hd_y), ev(mt_s, mt_y, hd_s, hd_y))
line("B train hand -> test MCPTox", ev(hd_r, hd_y, mt_r, mt_y), ev(hd_s, hd_y, mt_s, mt_y))
print("\nIf B: SAE recall >> RAW (as on GPT-2: 14%->84%), the cross-family win replicates across model families.")
