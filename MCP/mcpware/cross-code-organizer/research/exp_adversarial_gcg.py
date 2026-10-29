#!/usr/bin/env python3
"""
EXPERIMENT — stronger adversarial evasion (greedy black-box suffix search).

Unlike exp_adversarial_evasion.py (fixed hand-written camouflage), this OPTIMISES an
appended token suffix per poison item to minimise the probe's poison-probability,
via greedy coordinate search over a clean-associated candidate token pool. This is a
tractable CPU proxy for white-box GCG (arXiv 2602.00750); full white-box GCG could be
stronger still, so a low evasion rate here is a lower-bound on robustness, not proof.

Probe = GPT-2 layer-3 mean-pooled activation logreg, trained on MCPTox-train.
"""
import json, os, numpy as np, torch
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from transformers import AutoTokenizer, AutoModel

SEED = 42; LAYER = 3; K = 6; ROUNDS = 2; N_ITEMS = 20; POOL = 80
DATA = os.path.join(os.path.dirname(__file__), "datasets")
np.random.seed(SEED); torch.manual_seed(SEED); torch.set_grad_enabled(False)


def Lf(name, lab):
    d = json.load(open(os.path.join(DATA, name)))
    return [(x["description"], lab) for x in d if isinstance(x, dict) and x.get("description")]


mcptox = Lf("mcptox_clean_descriptions_labeled.json", 0) + Lf("mcptox_poisoned_descriptions_labeled.json", 1)
clean_texts = [t for t, l in mcptox if l == 0]

print("Loading GPT-2 ...")
tok = AutoTokenizer.from_pretrained("gpt2"); tok.pad_token = tok.eos_token
gpt2 = AutoModel.from_pretrained("gpt2", output_hidden_states=True).eval()


def acts_from_ids(id_lists):
    """mean-pooled layer-3 activations for a batch of token-id lists."""
    maxlen = min(256, max(len(x) for x in id_lists))
    ids = torch.full((len(id_lists), maxlen), tok.eos_token_id, dtype=torch.long)
    mask = torch.zeros((len(id_lists), maxlen), dtype=torch.long)
    for i, x in enumerate(id_lists):
        x = x[:maxlen]; ids[i, :len(x)] = torch.tensor(x); mask[i, :len(x)] = 1
    hs = gpt2(input_ids=ids, attention_mask=mask).hidden_states[LAYER]
    m = mask.unsqueeze(-1).float()
    return ((hs * m).sum(1) / m.sum(1)).numpy()


def acts(texts):
    out = []
    for i in range(0, len(texts), 16):
        out.append(acts_from_ids([tok.encode(t) for t in texts[i:i+16]]))
    return np.vstack(out)


# train probe on MCPTox-train
texts = [t for t, _ in mcptox]; y = np.array([l for _, l in mcptox])
Xtr, _, ytr, _, ttr, tte = train_test_split(np.arange(len(texts)), y, texts, test_size=0.3,
                                             random_state=SEED, stratify=y)
clf = LogisticRegression(max_iter=2000).fit(acts(ttr), ytr)


def poison_prob(id_lists):
    return clf.predict_proba(acts_from_ids(id_lists))[:, 1]


# caught test poison
test_pois = [t for t, l in zip(tte, y[Xtr.shape[0]:]) if l == 1] if False else \
            [t for t in tte if y[texts.index(t)] == 1]
caught = [t for t in test_pois if poison_prob([tok.encode(t)])[0] > 0.5][:N_ITEMS]
print(f"Optimising suffixes for {len(caught)} caught test-poison (K={K}, rounds={ROUNDS}, pool={POOL}) ...")

# candidate token pool = frequent tokens from clean descriptions
from collections import Counter
cnt = Counter()
for t in clean_texts:
    cnt.update(tok.encode(" " + t))
pool = [tid for tid, _ in cnt.most_common(POOL)]

evaded = 0; drops = []
for t in caught:
    base = tok.encode(t)
    suf = list(np.random.choice(pool, K))
    cur = poison_prob([base + suf])[0]
    start = cur
    for _ in range(ROUNDS):
        for pos in range(K):
            cand = [base + suf[:pos] + [c] + suf[pos+1:] for c in pool]
            probs = np.concatenate([poison_prob(cand[i:i+64]) for i in range(0, len(cand), 64)])
            j = int(probs.argmin())
            if probs[j] < cur:
                cur = probs[j]; suf[pos] = pool[j]
    drops.append(start - cur)
    if cur < 0.5:
        evaded += 1

print(f"\nGreedy adversarial suffix (clean-token pool):")
print(f"  evaded (probe flips poison->clean): {evaded}/{len(caught)} = {evaded/len(caught):.1%}")
print(f"  mean poison-prob after attack: {np.mean([poison_prob([tok.encode(t)+[0]])[0] for t in caught]):.3f} (orig ~>0.5)")
print(f"  vs naive fixed-suffix evasion (exp_adversarial_evasion.py): 0%")
print("Higher evasion => weaker robustness. This is a lower bound (full white-box GCG may be stronger).")
