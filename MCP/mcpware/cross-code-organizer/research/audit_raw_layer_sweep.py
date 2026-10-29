#!/usr/bin/env python3
"""Audit-only layer and duplicate-leakage stress tests for the research report."""
import json
import os
import re

import numpy as np
import torch
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from sklearn.model_selection import StratifiedKFold, cross_val_score
from transformers import AutoModel, AutoTokenizer

SEED = 42
DATA = os.path.join(os.path.dirname(__file__), "datasets")
torch.set_grad_enabled(False)
np.random.seed(SEED)


def load_file(name, label):
    with open(os.path.join(DATA, name)) as f:
        rows = json.load(f)
    out = []
    for row in rows:
        text = row.get("description") if isinstance(row, dict) else row
        if text:
            out.append((text, label, name))
    return out


def norm(text):
    return re.sub(r"\s+", " ", text.strip().lower())


STYLES = {
    "mcptox": (
        load_file("mcptox_clean_descriptions_labeled.json", 0)
        + load_file("mcptox_poisoned_descriptions_labeled.json", 1)
    ),
    "hard": load_file("hard_clean.json", 0) + load_file("hard_poisoned.json", 1),
    "hard_v2": load_file("hard_v2_clean.json", 0) + load_file("hard_v2_poisoned.json", 1),
    "hard_v3": load_file("hard_v3_clean.json", 0) + load_file("hard_v3_poisoned.json", 1),
    "matched": load_file("hard_v3_matched_clean.json", 0)
    + load_file("hard_v3_matched_poisoned.json", 1),
    "neutral": load_file("neutral_clean.json", 0) + load_file("neutral_poisoned.json", 1),
}
EXTRA = (
    load_file("adversarial_poisoned.json", 1)
    + load_file("adversarial_poisoned_v2.json", 1)
    + load_file("adversarial_poisoned_v3.json", 1)
)


def metrics(y_true, y_pred):
    precision, recall, f1, _ = precision_recall_fscore_support(
        y_true, y_pred, average="binary", zero_division=0, pos_label=1
    )
    return accuracy_score(y_true, y_pred), precision, recall, f1


def evaluate(X, y, train_idx, test_idx):
    clf = LogisticRegression(max_iter=3000).fit(X[train_idx], y[train_idx])
    return metrics(y[test_idx], clf.predict(X[test_idx]))


def print_metric(name, values):
    acc, precision, recall, f1 = values
    print(f"{name:24} acc={acc:6.1%} prec={precision:6.1%} rec={recall:6.1%} F1={f1:6.1%}")


def extract_model(model_name, batch_size=16):
    print(f"\nLoading {model_name} ...", flush=True)
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    model = AutoModel.from_pretrained(model_name, output_hidden_states=True).eval()

    records = []
    for style, items in STYLES.items():
        records.extend((text, label, style, source) for text, label, source in items)
    records.extend((text, label, "_adv", source) for text, label, source in EXTRA)

    texts = [r[0] for r in records]
    y = np.array([r[1] for r in records])
    styles = np.array([r[2] for r in records])
    norms = np.array([norm(r[0]) for r in records])

    num_layers = model.config.num_hidden_layers
    feats = {layer: [] for layer in range(num_layers + 1)}
    print(f"Extracting hidden states for {len(texts)} texts, layers 0..{num_layers} ...", flush=True)
    for start in range(0, len(texts), batch_size):
        enc = tokenizer(
            texts[start : start + batch_size],
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=256,
        )
        with torch.no_grad():
            out = model(**enc)
        mask = enc["attention_mask"].unsqueeze(-1).float()
        for layer, hidden in enumerate(out.hidden_states):
            mean = (hidden * mask).sum(1) / mask.sum(1)
            feats[layer].append(mean.numpy())
        if start and start % 256 == 0:
            print(f"  encoded {start}/{len(texts)}", flush=True)
    feats = {layer: np.vstack(chunks) for layer, chunks in feats.items()}
    return texts, y, styles, norms, feats


def crossstyle_layer_sweep(model_name, y, styles, feats):
    mcptox = styles == "mcptox"
    hand = styles != "mcptox"
    print(f"\n=== Raw layer sweep: {model_name} ===")
    print(f"{'layer':>5} | {'MCPTox -> hand rec/F1':>23} | {'hand -> MCPTox rec/F1':>24}")
    print("-" * 62)
    best_a = None
    best_b = None
    for layer, X in feats.items():
        a = evaluate(X, y, np.where(mcptox)[0], np.where(hand)[0])
        b = evaluate(X, y, np.where(hand)[0], np.where(mcptox)[0])
        print(f"{layer:5d} | {a[2]:7.1%}/{a[3]:6.1%}        | {b[2]:7.1%}/{b[3]:6.1%}")
        if best_a is None or a[3] > best_a[1][3]:
            best_a = (layer, a)
        if best_b is None or b[3] > best_b[1][3]:
            best_b = (layer, b)
    print("Best by F1:")
    print_metric(f"A layer {best_a[0]}", best_a[1])
    print_metric(f"B layer {best_b[0]}", best_b[1])


def deduped_mixedstyle(model_name, y, styles, norms, feats):
    print(f"\n=== Deduped mixed-style leave-one-out: {model_name} ===")
    print(
        f"{'held':>8} {'test_n':>6} {'removed':>7} {'layer':>5} "
        f"{'acc':>7} {'prec':>7} {'rec':>7} {'F1':>7}"
    )
    print("-" * 64)
    for held in STYLES:
        test_idx = np.where(styles == held)[0]
        held_norms = set(norms[test_idx])
        train_idx = np.where((styles != held) & ~np.isin(norms, list(held_norms)))[0]
        removed = int(np.sum((styles != held) & np.isin(norms, list(held_norms))))
        best_layer = None
        best_score = -1.0
        skf = StratifiedKFold(5, shuffle=True, random_state=SEED)
        for layer, X in feats.items():
            score = cross_val_score(
                LogisticRegression(max_iter=3000), X[train_idx], y[train_idx], cv=skf
            ).mean()
            if score > best_score:
                best_score = score
                best_layer = layer
        result = evaluate(feats[best_layer], y, train_idx, test_idx)
        print(
            f"{held:>8} {len(test_idx):6d} {removed:7d} {best_layer:5d} "
            f"{result[0]:7.1%} {result[1]:7.1%} {result[2]:7.1%} {result[3]:7.1%}"
        )


def main():
    for model_name, batch_size in [("gpt2", 16), ("EleutherAI/pythia-70m-deduped", 16)]:
        _texts, y, styles, norms, feats = extract_model(model_name, batch_size=batch_size)
        crossstyle_layer_sweep(model_name, y, styles, feats)
        if model_name == "gpt2":
            deduped_mixedstyle(model_name, y, styles, norms, feats)


if __name__ == "__main__":
    main()
