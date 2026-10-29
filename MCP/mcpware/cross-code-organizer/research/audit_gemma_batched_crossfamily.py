#!/usr/bin/env python3
"""Batched version of exp_sae_gemma_crossfamily.py for local CPU auditing."""
import gc
import json
import os

import numpy as np
import torch
from sae_lens import SAE
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from transformers import AutoModel, AutoTokenizer

DATA = os.path.join(os.path.dirname(__file__), "datasets")
LAYER = 15
HS_IDX = LAYER + 1
BATCH_SIZE = int(os.environ.get("GEMMA_BATCH_SIZE", "4"))
rng = np.random.default_rng(42)
torch.set_grad_enabled(False)


def load_file(name, label):
    data = json.load(open(os.path.join(DATA, name)))
    return [
        (item["description"], label)
        for item in data
        if isinstance(item, dict) and item.get("description")
    ]


mt_all = (
    load_file("mcptox_clean_descriptions_labeled.json", 0)
    + load_file("mcptox_poisoned_descriptions_labeled.json", 1)
)
clean = [item for item in mt_all if item[1] == 0]
poison = [item for item in mt_all if item[1] == 1]
rng.shuffle(clean)
rng.shuffle(poison)
mcptox = clean[:100] + poison[:100]

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


def masked_mean(values, attention_mask):
    mask = attention_mask.to(values.dtype).unsqueeze(-1)
    denom = mask.sum(dim=1).clamp_min(1)
    return (values * mask).sum(dim=1) / denom


print("Loading Gemma Scope SAE (layer 15, 16k canonical) ...", flush=True)
sae_result = SAE.from_pretrained(
    "gemma-scope-2b-pt-res-canonical",
    f"layer_{LAYER}/width_16k/canonical",
    device="cpu",
)
sae = sae_result[0] if isinstance(sae_result, tuple) else sae_result
print(f"SAE d_in={sae.cfg.d_in} d_sae={sae.cfg.d_sae} hook={sae.cfg.metadata.hook_name}", flush=True)

print("Loading gemma-2-2b via HF (bf16, low_cpu_mem_usage) ...", flush=True)
tok = AutoTokenizer.from_pretrained("google/gemma-2-2b")
model = AutoModel.from_pretrained(
    "google/gemma-2-2b",
    torch_dtype=torch.bfloat16,
    low_cpu_mem_usage=True,
    output_hidden_states=True,
).eval()
print("model loaded.", flush=True)


def encode_items(items, tag):
    raw_features = []
    sae_features = []
    labels = []
    with torch.inference_mode():
        for start in range(0, len(items), BATCH_SIZE):
            batch = items[start : start + BATCH_SIZE]
            texts = [text for text, _ in batch]
            enc = tok(
                texts,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=256,
            )
            hs = model(**enc).hidden_states[HS_IDX].float()
            raw = masked_mean(hs, enc["attention_mask"])

            flat = hs.reshape(-1, hs.shape[-1])
            sae_flat = sae.encode(flat).float()
            sae_hidden = sae_flat.reshape(hs.shape[0], hs.shape[1], -1)
            sae_mean = masked_mean(sae_hidden, enc["attention_mask"])

            raw_features.append(raw.numpy())
            sae_features.append(sae_mean.numpy())
            labels.extend(label for _, label in batch)

            done = min(start + len(batch), len(items))
            print(f"  [{tag}] {done}/{len(items)}", flush=True)
            del enc, hs, raw, flat, sae_flat, sae_hidden, sae_mean
            gc.collect()

    return (
        np.concatenate(raw_features, axis=0),
        np.concatenate(sae_features, axis=0),
        np.array(labels),
    )


def evaluate(x_train, y_train, x_test, y_test):
    pred = LogisticRegression(max_iter=3000).fit(x_train, y_train).predict(x_test)
    _, recall, f1, _ = precision_recall_fscore_support(
        y_test,
        pred,
        average="binary",
        zero_division=0,
        pos_label=1,
    )
    return accuracy_score(y_test, pred), recall, f1


print(f"Encoding hand ({len(hand)}) + MCPTox ({len(mcptox)}) with batch={BATCH_SIZE} ...", flush=True)
hand_raw, hand_sae, hand_y = encode_items(hand, "hand")
mcptox_raw, mcptox_sae, mcptox_y = encode_items(mcptox, "mcptox")

print(f"\n{'direction (gemma-2-2b L15)':30} {'RAW acc/rec/F1':>22} {'SAE acc/rec/F1':>22}", flush=True)
print("-" * 78, flush=True)


def line(name, raw_result, sae_result):
    print(
        f"{name:30} "
        f"{raw_result[0]:6.1%}/{raw_result[1]:5.1%}/{raw_result[2]:5.1%}    "
        f"{sae_result[0]:6.1%}/{sae_result[1]:5.1%}/{sae_result[2]:5.1%}",
        flush=True,
    )


line(
    "A train MCPTox -> test hand",
    evaluate(mcptox_raw, mcptox_y, hand_raw, hand_y),
    evaluate(mcptox_sae, mcptox_y, hand_sae, hand_y),
)
line(
    "B train hand -> test MCPTox",
    evaluate(hand_raw, hand_y, mcptox_raw, mcptox_y),
    evaluate(hand_sae, hand_y, mcptox_sae, mcptox_y),
)
print("\nGPT-2 ref: B raw 14% -> SAE 84%. Pythia-70m(L2): B raw 88% -> SAE 100%.", flush=True)
