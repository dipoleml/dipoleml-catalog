#!/usr/bin/env python3
"""
GEMMA confirmation (memory-safe HF loader) — does the SAE cross-family win
(GPT-2: raw 14% -> SAE 84%) hold on a modern model with depth-matched open SAEs?

Gemma-2-2b (26 layers) + Gemma Scope canonical residual SAE at layer 15 (depth 0.58,
matching GPT-2 blocks.7/12). Loaded via HF AutoModel with low_cpu_mem_usage + bf16 to
avoid the transformer_lens weight-doubling that OOM-killed the previous attempt.
Gemma Scope layer_15 hook_resid_post == HF hidden_states[16] (0=embeddings).
"""
import json, os, numpy as np, torch
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import precision_recall_fscore_support, accuracy_score
from transformers import AutoTokenizer, AutoModel
from sae_lens import SAE

DATA = os.path.join(os.path.dirname(__file__), "datasets")
torch.set_grad_enabled(False); rng = np.random.default_rng(42)
LAYER = 15; HS_IDX = LAYER + 1            # HF hidden_states index for resid_post of layer 15


def Lf(name, lab):
    d = json.load(open(os.path.join(DATA, name)))
    return [(x["description"], lab) for x in d if isinstance(x, dict) and x.get("description")]


mt_all = Lf("mcptox_clean_descriptions_labeled.json", 0) + Lf("mcptox_poisoned_descriptions_labeled.json", 1)
cl = [x for x in mt_all if x[1] == 0]; po = [x for x in mt_all if x[1] == 1]
rng.shuffle(cl); rng.shuffle(po)
mcptox = cl[:100] + po[:100]
hand = (Lf("hard_v3_matched_clean.json", 0) + Lf("hard_v3_matched_poisoned.json", 1) +
        Lf("neutral_clean.json", 0) + Lf("neutral_poisoned.json", 1) +
        Lf("hard_v2_clean.json", 0) + Lf("hard_v2_poisoned.json", 1) +
        Lf("hard_clean.json", 0) + Lf("hard_poisoned.json", 1) +
        Lf("hard_v3_clean.json", 0) + Lf("hard_v3_poisoned.json", 1) +
        Lf("adversarial_poisoned.json", 1) + Lf("adversarial_poisoned_v2.json", 1) + Lf("adversarial_poisoned_v3.json", 1))

print("Loading Gemma Scope SAE (layer 15, 16k canonical) ...", flush=True)
res = SAE.from_pretrained("gemma-scope-2b-pt-res-canonical", f"layer_{LAYER}/width_16k/canonical", device="cpu")
sae = res[0] if isinstance(res, tuple) else res
print(f"SAE d_in={sae.cfg.d_in} d_sae={sae.cfg.d_sae} hook={sae.cfg.metadata.hook_name}", flush=True)
print("Loading gemma-2-2b via HF (bf16, low_cpu_mem_usage) ...", flush=True)
tok = AutoTokenizer.from_pretrained("google/gemma-2-2b")
model = AutoModel.from_pretrained("google/gemma-2-2b", torch_dtype=torch.bfloat16,
                                  low_cpu_mem_usage=True, output_hidden_states=True).eval()
print("model loaded.", flush=True)


def feats(items, tag):
    raw, sf, ys = [], [], []
    for i, (t, l) in enumerate(items):
        enc = tok(t, return_tensors="pt", truncation=True, max_length=256)
        hs = model(**enc).hidden_states[HS_IDX][0].float()     # [seq, 2304]
        raw.append(hs.mean(0).numpy())
        sf.append(sae.encode(hs).float().mean(0).numpy())
        ys.append(l)
        if (i + 1) % 50 == 0:
            print(f"  [{tag}] {i+1}/{len(items)}", flush=True)
    return np.array(raw), np.array(sf), np.array(ys)


print(f"Encoding hand ({len(hand)}) + MCPTox ({len(mcptox)}) ...", flush=True)
hd_r, hd_s, hd_y = feats(hand, "hand")
mt_r, mt_s, mt_y = feats(mcptox, "mcptox")


def ev(Xtr, ytr, Xte, yte):
    p = LogisticRegression(max_iter=3000).fit(Xtr, ytr).predict(Xte)
    _, r, f, _ = precision_recall_fscore_support(yte, p, average="binary", zero_division=0, pos_label=1)
    return accuracy_score(yte, p), r, f


print(f"\n{'direction (gemma-2-2b L15)':30} {'RAW acc/rec/F1':>22} {'SAE acc/rec/F1':>22}", flush=True)
print("-" * 78)
def line(n, r, s): print(f"{n:30} {r[0]:6.1%}/{r[1]:5.1%}/{r[2]:5.1%}    {s[0]:6.1%}/{s[1]:5.1%}/{s[2]:5.1%}", flush=True)
line("A train MCPTox -> test hand", ev(mt_r, mt_y, hd_r, hd_y), ev(mt_s, mt_y, hd_s, hd_y))
line("B train hand -> test MCPTox", ev(hd_r, hd_y, mt_r, mt_y), ev(hd_s, hd_y, mt_s, mt_y))
print("\nGPT-2 ref: B raw 14% -> SAE 84%. Pythia-70m(L2): B raw 88% -> SAE 100%.", flush=True)
