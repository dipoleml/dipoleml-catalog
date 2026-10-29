#!/usr/bin/env python3
"""Canonical benchmark runner for the activation-scanner product lane."""

from __future__ import annotations

import argparse
import json
import os
import resource
import sys
import time
import warnings
from collections import Counter
from dataclasses import asdict
from pathlib import Path

import numpy as np

try:
    from .datasets import (
        DEFAULT_DATA_DIR,
        Example,
        exact_dataset_inventory,
        load_curated_file,
        load_hand_pool,
        load_routeguard_external_file,
        load_style,
        remove_overlapping_train_examples,
        sample_balanced,
        summarize_examples,
    )
    from .model_registry import (
        SAES,
        SENSORS,
        extract_features,
        extract_sae_features,
        get_sensor,
        parse_layers,
        sae_registry_for_sensor,
        sae_names,
        sensor_names,
    )
    from .family_labels import primary_family
    from .report_writer import (
        DEFAULT_OUTPUT_DIR,
        print_result_table,
        utc_timestamp,
        write_json_report,
        write_markdown_report,
    )
except ImportError:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
    from research.benchmarks.datasets import (  # type: ignore
        DEFAULT_DATA_DIR,
        Example,
        exact_dataset_inventory,
        load_curated_file,
        load_hand_pool,
        load_routeguard_external_file,
        load_style,
        remove_overlapping_train_examples,
        sample_balanced,
        summarize_examples,
    )
    from research.benchmarks.model_registry import (  # type: ignore
        SAES,
        SENSORS,
        extract_features,
        extract_sae_features,
        get_sensor,
        parse_layers,
        sae_registry_for_sensor,
        sae_names,
        sensor_names,
    )
    from research.benchmarks.family_labels import primary_family  # type: ignore
    from research.benchmarks.report_writer import (  # type: ignore
        DEFAULT_OUTPUT_DIR,
        print_result_table,
        utc_timestamp,
        write_json_report,
        write_markdown_report,
    )


SEED = 42
DEFAULT_TOP_K_MAX = 10


def example_key(example: Example) -> tuple[str, str, int]:
    return (example.style, example.source, example.index)


def unique_examples(*groups: list[Example]) -> list[Example]:
    seen: set[tuple[str, str, int]] = set()
    out: list[Example] = []
    for group in groups:
        for example in group:
            key = example_key(example)
            if key in seen:
                continue
            seen.add(key)
            out.append(example)
    return out


def index_map(examples: list[Example]) -> dict[tuple[str, str, int], int]:
    return {example_key(example): idx for idx, example in enumerate(examples)}


def labels_for(examples: list[Example]) -> np.ndarray:
    return np.asarray([example.label for example in examples], dtype=np.int64)


def styles_for(examples: list[Example]) -> np.ndarray:
    return np.asarray([example.style for example in examples], dtype=object)


def family_for_example(example: Example) -> str:
    return example.family or primary_family(example.text)


def primary_families_for(examples: list[Example]) -> np.ndarray:
    return np.asarray([family_for_example(example) for example in examples], dtype=object)


def summarize_primary_families(examples: list[Example]) -> dict[str, dict[str, int]]:
    counts: dict[str, Counter[str]] = {}
    for example in examples:
        label_name = "poisoned" if example.label == 1 else "clean" if example.label == 0 else "other"
        counter = counts.setdefault(family_for_example(example), Counter())
        counter[label_name] += 1
    return {family: dict(counter) for family, counter in sorted(counts.items())}


def selector_group_labels_for(examples: list[Example], selector: str) -> np.ndarray | None:
    if selector == "leave-one-style-out":
        return styles_for(examples)
    if selector == "leave-one-family-out":
        return primary_families_for(examples)
    return None


def indices_for(examples: list[Example], mapping: dict[tuple[str, str, int], int]) -> np.ndarray:
    return np.asarray([mapping[example_key(example)] for example in examples], dtype=np.int64)


def import_sklearn():
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.exceptions import ConvergenceWarning
        from sklearn.linear_model import LogisticRegression
        from sklearn.metrics import accuracy_score, precision_recall_fscore_support
        from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
    except ImportError as exc:
        raise SystemExit(
            "Missing benchmark dependencies. Run with research/.venv-audit/bin/python "
            "or install scikit-learn/numpy from research/requirements-bench.txt."
        ) from exc
    warnings.filterwarnings("ignore", category=ConvergenceWarning)
    return {
        "TfidfVectorizer": TfidfVectorizer,
        "LogisticRegression": LogisticRegression,
        "accuracy_score": accuracy_score,
        "precision_recall_fscore_support": precision_recall_fscore_support,
        "StratifiedKFold": StratifiedKFold,
        "cross_val_score": cross_val_score,
        "train_test_split": train_test_split,
    }


def current_rss_mb() -> float:
    try:
        import psutil

        return float(psutil.Process(os.getpid()).memory_info().rss / (1024 * 1024))
    except Exception:
        # On macOS ru_maxrss is bytes; on Linux it is KB. This repo is currently
        # developed on macOS, so keep this as a local benchmark hint only.
        return float(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / (1024 * 1024))


def binary_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    sk = import_sklearn()
    precision, recall, f1, _ = sk["precision_recall_fscore_support"](
        y_true,
        y_pred,
        average="binary",
        zero_division=0,
        pos_label=1,
    )
    return {
        "accuracy": float(sk["accuracy_score"](y_true, y_pred)),
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
    }


def cv_fold_count(y: np.ndarray, max_folds: int = 5) -> int:
    _, counts = np.unique(y, return_counts=True)
    if len(counts) < 2:
        return 0
    return int(min(max_folds, counts.min()))


def matrix_cv_score(matrix: np.ndarray, train_idx: np.ndarray, y: np.ndarray) -> float | None:
    sk = import_sklearn()
    y_train = y[train_idx]
    folds = cv_fold_count(y_train)
    if folds < 2:
        return None

    cv = sk["StratifiedKFold"](n_splits=folds, shuffle=True, random_state=SEED)
    return float(
        sk["cross_val_score"](
            sk["LogisticRegression"](max_iter=3000),
            matrix[train_idx],
            y_train,
            cv=cv,
        ).mean()
    )


def matrix_leave_one_group_score(
    matrix: np.ndarray,
    train_idx: np.ndarray,
    y: np.ndarray,
    group_labels: np.ndarray | None,
) -> float | None:
    if group_labels is None:
        return None

    sk = import_sklearn()
    train_groups = np.asarray(group_labels)[train_idx]
    groups = sorted(set(str(group) for group in train_groups))
    if len(groups) < 2:
        return None

    scores: list[float] = []
    for group in groups:
        valid_idx = train_idx[train_groups == group]
        fit_idx = train_idx[train_groups != group]
        if len(valid_idx) == 0 or len(fit_idx) == 0:
            continue
        if len(np.unique(y[fit_idx])) < 2 or len(np.unique(y[valid_idx])) < 2:
            continue

        clf = sk["LogisticRegression"](max_iter=3000)
        clf.fit(matrix[fit_idx], y[fit_idx])
        pred = clf.predict(matrix[valid_idx])
        scores.append(binary_metrics(y[valid_idx], pred)["f1"])

    if not scores:
        return None
    return float(np.mean(scores))


def matrix_selection_score(
    matrix: np.ndarray,
    train_idx: np.ndarray,
    y: np.ndarray,
    group_labels: np.ndarray | None,
    selector: str,
) -> float | None:
    if selector == "cv":
        return matrix_cv_score(matrix, train_idx, y)
    if selector in {"leave-one-style-out", "leave-one-family-out"}:
        score = matrix_leave_one_group_score(matrix, train_idx, y, group_labels)
        return score if score is not None else matrix_cv_score(matrix, train_idx, y)
    raise ValueError("selector must be cv, leave-one-style-out, or leave-one-family-out")


def rank_layers_by_selector(
    features_by_layer: dict[int, np.ndarray],
    train_idx: np.ndarray,
    y: np.ndarray,
    group_labels: np.ndarray | None,
    selector: str,
) -> list[tuple[int, float | None]]:
    first_layer = next(iter(sorted(features_by_layer)))
    if matrix_selection_score(features_by_layer[first_layer], train_idx, y, group_labels, selector) is None:
        return [(layer, None) for layer in sorted(features_by_layer)]

    ranked: list[tuple[int, float | None]] = []
    for layer in sorted(features_by_layer):
        ranked.append((layer, matrix_selection_score(features_by_layer[layer], train_idx, y, group_labels, selector)))
    return sorted(ranked, key=lambda item: (-(item[1] if item[1] is not None else -1.0), item[0]))


def choose_layer(features_by_layer: dict[int, np.ndarray], train_idx: np.ndarray, y: np.ndarray) -> tuple[int, float | None]:
    layer, score = rank_layers_by_selector(features_by_layer, train_idx, y, None, "cv")[0]
    return layer, score


def layer_mode_arg(value: str) -> str:
    if value in {"best", "best-auto", "best-sweep", "concat"}:
        return value
    if value.startswith("best") and value[4:].isdigit() and int(value[4:]) >= 1:
        return value
    raise argparse.ArgumentTypeError(
        "layer mode must be best, bestN such as best6, best-auto, best-sweep, or concat"
    )


def best_k_for_layer_mode(layer_mode: str) -> int | None:
    if layer_mode in {"best", "best1"}:
        return 1
    if layer_mode.startswith("best") and layer_mode[4:].isdigit():
        return int(layer_mode[4:])
    return None


def best_k_candidates(
    features_by_layer: dict[int, np.ndarray],
    train_idx: np.ndarray,
    y: np.ndarray,
    group_labels: np.ndarray | None,
    selector: str,
    top_k_max: int,
) -> list[tuple[int, str | int, list[int], list[int], float | None, np.ndarray]]:
    candidate_layers = sorted(features_by_layer)
    ranked = rank_layers_by_selector(features_by_layer, train_idx, y, group_labels, selector)
    k_max = max(1, min(top_k_max, len(ranked)))
    candidates = []
    for k in range(1, k_max + 1):
        selected_layers = sorted(layer for layer, _ in ranked[:k])
        matrix = np.concatenate([features_by_layer[layer] for layer in selected_layers], axis=1)
        selection_score = matrix_selection_score(matrix, train_idx, y, group_labels, selector)
        if k == 1:
            layer: str | int = selected_layers[0]
        else:
            layer = f"best{k}:" + ",".join(str(layer) for layer in selected_layers)
        candidates.append((k, layer, candidate_layers, selected_layers, selection_score, matrix))
    return candidates


def feature_matrix_for_layer_mode(
    features_by_layer: dict[int, np.ndarray],
    train_idx: np.ndarray,
    y: np.ndarray,
    layer_mode: str,
    group_labels: np.ndarray | None,
    selector: str,
    top_k_max: int,
) -> tuple[str | int, list[int], list[int], float | None, np.ndarray]:
    candidate_layers = sorted(features_by_layer)
    best_k = best_k_for_layer_mode(layer_mode)
    if best_k is not None:
        candidates = best_k_candidates(features_by_layer, train_idx, y, group_labels, selector, best_k)
        return candidates[min(best_k, len(candidates)) - 1][1:]

    if layer_mode == "best-auto":
        candidates = best_k_candidates(features_by_layer, train_idx, y, group_labels, selector, top_k_max)
        k, layer, candidate_layers, selected_layers, cv_score, matrix = sorted(
            candidates,
            key=lambda item: (-(item[4] if item[4] is not None else -1.0), item[0]),
        )[0]
        if k == 1:
            layer = f"best-auto1:{layer}"
        else:
            layer = f"best-auto{k}:" + ",".join(str(layer) for layer in selected_layers)
        return layer, candidate_layers, selected_layers, cv_score, matrix

    if layer_mode != "concat":
        raise ValueError("layer_mode must be best, bestN, best-auto, best-sweep, or concat")

    matrix = np.concatenate([features_by_layer[layer] for layer in candidate_layers], axis=1)
    cv_score = matrix_selection_score(matrix, train_idx, y, group_labels, selector)
    layer = "concat:" + ",".join(str(layer) for layer in candidate_layers)
    return layer, candidate_layers, candidate_layers, cv_score, matrix


def build_activation_row(
    *,
    block: str,
    method: str,
    train_idx: np.ndarray,
    test_idx: np.ndarray,
    y: np.ndarray,
    layer: str | int,
    layer_mode: str,
    candidate_layers: list[int],
    selected_layers: list[int],
    selection_score: float | None,
    matrix: np.ndarray,
    selector: str,
) -> dict:
    sk = import_sklearn()
    clf = sk["LogisticRegression"](max_iter=3000)
    clf.fit(matrix[train_idx], y[train_idx])
    pred = clf.predict(matrix[test_idx])
    row = {
        "block": block,
        "method": method,
        "layer": layer,
        "layer_mode": layer_mode,
        "candidate_layers": candidate_layers,
        "selected_layers": selected_layers,
        "selected_k": len(selected_layers),
        "feature_dim": int(matrix.shape[1]),
        "selector": selector,
        "selector_score": selection_score,
        "cv_accuracy": selection_score if selector == "cv" else None,
        "n_train": int(len(train_idx)),
        "n_test": int(len(test_idx)),
    }
    row.update(binary_metrics(y[test_idx], pred))
    return row


def family_route_layer_modes(layer_mode: str, top_k_max: int, layer_count: int) -> list[str]:
    if layer_mode == "best-sweep":
        return [f"best{k}" for k in range(1, min(top_k_max, layer_count) + 1)]
    return [layer_mode]


def family_routed_activation_row(
    *,
    block: str,
    method: str,
    features_by_layer: dict[int, np.ndarray],
    train_idx: np.ndarray,
    test_idx: np.ndarray,
    y: np.ndarray,
    family_labels: np.ndarray,
    layer_mode: str,
    group_labels: np.ndarray | None = None,
    selector: str = "cv",
    top_k_max: int = DEFAULT_TOP_K_MAX,
    min_family_train: int = 8,
) -> dict:
    sk = import_sklearn()
    family_labels = np.asarray(family_labels)
    layer, candidate_layers, selected_layers, selection_score, matrix = feature_matrix_for_layer_mode(
        features_by_layer,
        train_idx,
        y,
        layer_mode,
        group_labels,
        selector,
        top_k_max,
    )
    global_policy = {
        "layer": layer,
        "selected_layers": selected_layers,
        "selected_k": len(selected_layers),
        "selector": selector,
        "selector_score": selection_score,
        "n_family_train": None,
        "fallback": False,
    }

    pred = np.zeros(len(test_idx), dtype=np.int64)
    family_policy: dict[str, dict] = {"__global_fallback__": global_policy}
    test_families = sorted(set(str(family) for family in family_labels[test_idx]))
    routed_family_count = 0
    fallback_family_count = 0

    for family in test_families:
        local_positions = np.flatnonzero(family_labels[test_idx] == family)
        family_test_idx = test_idx[local_positions]
        family_train_idx = train_idx[family_labels[train_idx] == family]
        can_select_family = len(family_train_idx) >= min_family_train and cv_fold_count(y[family_train_idx]) >= 2

        if can_select_family:
            (
                route_layer,
                route_candidate_layers,
                route_selected_layers,
                route_score,
                route_matrix,
            ) = feature_matrix_for_layer_mode(
                features_by_layer,
                family_train_idx,
                y,
                layer_mode,
                None,
                "cv",
                top_k_max,
            )
            routed_family_count += 1
            policy = {
                "layer": route_layer,
                "selected_layers": route_selected_layers,
                "selected_k": len(route_selected_layers),
                "selector": "within-family-cv",
                "selector_score": route_score,
                "candidate_layers": route_candidate_layers,
                "n_family_train": int(len(family_train_idx)),
                "fallback": False,
            }
        else:
            route_matrix = matrix
            route_layer = layer
            route_selected_layers = selected_layers
            route_score = selection_score
            fallback_family_count += 1
            policy = {
                "layer": route_layer,
                "selected_layers": route_selected_layers,
                "selected_k": len(route_selected_layers),
                "selector": selector,
                "selector_score": route_score,
                "candidate_layers": candidate_layers,
                "n_family_train": int(len(family_train_idx)),
                "fallback": True,
            }

        clf = sk["LogisticRegression"](max_iter=3000)
        clf.fit(route_matrix[train_idx], y[train_idx])
        pred[local_positions] = clf.predict(route_matrix[family_test_idx])
        family_policy[family] = policy

    y_test = y[test_idx]
    row = {
        "block": block,
        "method": f"{method}_family_routed",
        "layer": "family-routed",
        "layer_mode": f"family-routed:{layer_mode}",
        "candidate_layers": candidate_layers,
        "selected_layers": sorted({layer for policy in family_policy.values() for layer in policy["selected_layers"]}),
        "selected_k": None,
        "feature_dim": None,
        "selector": selector,
        "selector_score": selection_score,
        "family_route_min_train": min_family_train,
        "routed_family_count": routed_family_count,
        "fallback_family_count": fallback_family_count,
        "family_policy": family_policy,
        "n_train": int(len(train_idx)),
        "n_test": int(len(test_idx)),
    }
    row.update(binary_metrics(y_test, pred))

    family_metrics = {}
    for family in test_families:
        positions = np.flatnonzero(family_labels[test_idx] == family)
        family_metrics[family] = {
            "n_test": int(len(positions)),
            **binary_metrics(y_test[positions], pred[positions]),
        }
    row["family_metrics"] = family_metrics
    return row


def family_routed_activation_rows(
    *,
    block: str,
    method: str,
    features_by_layer: dict[int, np.ndarray],
    train_idx: np.ndarray,
    test_idx: np.ndarray,
    y: np.ndarray,
    family_labels: np.ndarray,
    layer_mode: str,
    group_labels: np.ndarray | None = None,
    selector: str = "cv",
    top_k_max: int = DEFAULT_TOP_K_MAX,
    min_family_train: int = 8,
) -> list[dict]:
    rows = []
    for mode in family_route_layer_modes(layer_mode, top_k_max, len(features_by_layer)):
        rows.append(
            family_routed_activation_row(
                block=block,
                method=method,
                features_by_layer=features_by_layer,
                train_idx=train_idx,
                test_idx=test_idx,
                y=y,
                family_labels=family_labels,
                layer_mode=mode,
                group_labels=group_labels,
                selector=selector,
                top_k_max=top_k_max,
                min_family_train=min_family_train,
            )
        )
    return rows


def activation_block_row(
    *,
    block: str,
    method: str,
    features_by_layer: dict[int, np.ndarray],
    train_idx: np.ndarray,
    test_idx: np.ndarray,
    y: np.ndarray,
    layer_mode: str,
    group_labels: np.ndarray | None = None,
    selector: str = "cv",
    top_k_max: int = DEFAULT_TOP_K_MAX,
) -> dict:
    layer, candidate_layers, selected_layers, cv_score, matrix = feature_matrix_for_layer_mode(
        features_by_layer,
        train_idx,
        y,
        layer_mode,
        group_labels,
        selector,
        top_k_max,
    )
    return build_activation_row(
        block=block,
        method=method,
        train_idx=train_idx,
        test_idx=test_idx,
        y=y,
        layer=layer,
        layer_mode=layer_mode,
        candidate_layers=candidate_layers,
        selected_layers=selected_layers,
        selection_score=cv_score,
        matrix=matrix,
        selector=selector,
    )


def activation_block_rows(
    *,
    block: str,
    method: str,
    features_by_layer: dict[int, np.ndarray],
    train_idx: np.ndarray,
    test_idx: np.ndarray,
    y: np.ndarray,
    layer_mode: str,
    group_labels: np.ndarray | None = None,
    selector: str = "cv",
    top_k_max: int = DEFAULT_TOP_K_MAX,
) -> list[dict]:
    if layer_mode != "best-sweep":
        return [
            activation_block_row(
                block=block,
                method=method,
                features_by_layer=features_by_layer,
                train_idx=train_idx,
                test_idx=test_idx,
                y=y,
                layer_mode=layer_mode,
                group_labels=group_labels,
                selector=selector,
                top_k_max=top_k_max,
            )
        ]

    rows = []
    for k, layer, candidate_layers, selected_layers, cv_score, matrix in best_k_candidates(
        features_by_layer,
        train_idx,
        y,
        group_labels,
        selector,
        top_k_max,
    ):
        rows.append(
            build_activation_row(
                block=block,
                method=method,
                train_idx=train_idx,
                test_idx=test_idx,
                y=y,
                layer=layer,
                layer_mode=f"best{k}",
                candidate_layers=candidate_layers,
                selected_layers=selected_layers,
                selection_score=cv_score,
                matrix=matrix,
                selector=selector,
            )
        )
    return rows


def activation_per_layer_rows(
    *,
    block: str,
    method: str,
    features_by_layer: dict[int, np.ndarray],
    train_idx: np.ndarray,
    test_idx: np.ndarray,
    y: np.ndarray,
    group_labels: np.ndarray | None = None,
    selector: str = "cv",
) -> list[dict]:
    rows = []
    for layer in sorted(features_by_layer):
        row = activation_block_row(
            block=block,
            method=f"{method}_per_layer",
            features_by_layer={layer: features_by_layer[layer]},
            train_idx=train_idx,
            test_idx=test_idx,
            y=y,
            layer_mode="best",
            group_labels=group_labels,
            selector=selector,
        )
        row["layer_mode"] = "fixed"
        row["candidate_layers"] = [layer]
        row["selected_layers"] = [layer]
        rows.append(row)
    return rows


def tfidf_block_row(block: str, train: list[Example], test: list[Example]) -> dict:
    sk = import_sklearn()
    vectorizer = sk["TfidfVectorizer"](ngram_range=(1, 2), min_df=1, max_features=5000)
    X_train = vectorizer.fit_transform([example.text for example in train])
    X_test = vectorizer.transform([example.text for example in test])
    y_train = labels_for(train)
    y_test = labels_for(test)
    clf = sk["LogisticRegression"](max_iter=3000)
    clf.fit(X_train, y_train)
    pred = clf.predict(X_test)
    row = {
        "block": block,
        "method": "tfidf_logreg",
        "layer": "-",
        "n_train": len(train),
        "n_test": len(test),
        "vocab_size": len(vectorizer.vocabulary_),
    }
    row.update(binary_metrics(y_test, pred))
    return row


def deberta_rows(blocks: list[tuple[str, list[Example]]]) -> list[dict]:
    from transformers import pipeline

    pipe = pipeline(
        "text-classification",
        model="protectai/deberta-v3-base-prompt-injection-v2",
        top_k=None,
        truncation=True,
    )
    rows = []
    for block, test in blocks:
        preds = []
        for result in pipe([example.text for example in test], batch_size=16):
            score = next((row["score"] for row in result if row["label"] == "INJECTION"), 0.0)
            preds.append(1 if score > 0.9 else 0)
        y_test = labels_for(test)
        row = {
            "block": block,
            "method": "deberta_pi_zero_shot",
            "layer": "-",
            "n_train": 0,
            "n_test": len(test),
            "threshold": 0.9,
        }
        row.update(binary_metrics(y_test, np.asarray(preds, dtype=np.int64)))
        rows.append(row)
    return rows


def maybe_add_text_baselines(
    rows: list[dict],
    blocks: list[tuple[str, list[Example], list[Example]]],
    baseline: str,
) -> None:
    if baseline in {"tfidf", "all"}:
        for block, train, test in blocks:
            rows.append(tfidf_block_row(block, train, test))
    if baseline in {"deberta", "all"}:
        rows.extend(deberta_rows([(block, test) for block, _train, test in blocks]))


def run_cross_style(args: argparse.Namespace) -> dict:
    mcptox = sample_balanced(load_style("mcptox", args.data_dir), args.max_samples, args.seed)
    hand = sample_balanced(load_hand_pool(args.hand_pool, args.data_dir), args.max_samples, args.seed + 1)

    a_train, a_removed = remove_overlapping_train_examples(mcptox, hand) if args.dedupe else (mcptox, 0)
    b_train, b_removed = remove_overlapping_train_examples(hand, mcptox) if args.dedupe else (hand, 0)
    a_test = hand
    b_test = mcptox

    combined = unique_examples(a_train, a_test, b_train, b_test)
    mapping = index_map(combined)
    y = labels_for(combined)
    group_labels = selector_group_labels_for(combined, args.selector)
    family_labels = primary_families_for(combined)
    feature_bundle = extract_features(
        args.model,
        [example.text for example in combined],
        layers=parse_layers(args.layers),
        layer_sweep=args.layer_sweep,
        batch_size=args.batch_size,
        max_length=args.max_length,
        device=args.device,
        dtype=args.dtype,
        local_files_only=args.local_files_only,
    )
    rows = []
    rows.extend(
        activation_block_rows(
            block="A train MCPTox -> test hand",
            method=f"{args.model}_{feature_bundle.feature_kind}",
            features_by_layer=feature_bundle.features_by_layer,
            train_idx=indices_for(a_train, mapping),
            test_idx=indices_for(a_test, mapping),
            y=y,
            layer_mode=args.layer_mode,
            group_labels=group_labels,
            selector=args.selector,
            top_k_max=args.top_k_max,
        )
    )
    rows.extend(
        activation_block_rows(
            block="B train hand -> test MCPTox",
            method=f"{args.model}_{feature_bundle.feature_kind}",
            features_by_layer=feature_bundle.features_by_layer,
            train_idx=indices_for(b_train, mapping),
            test_idx=indices_for(b_test, mapping),
            y=y,
            layer_mode=args.layer_mode,
            group_labels=group_labels,
            selector=args.selector,
            top_k_max=args.top_k_max,
        )
    )
    if args.with_family_routing:
        rows.extend(
            family_routed_activation_rows(
                block="A train MCPTox -> test hand",
                method=f"{args.model}_{feature_bundle.feature_kind}",
                features_by_layer=feature_bundle.features_by_layer,
                train_idx=indices_for(a_train, mapping),
                test_idx=indices_for(a_test, mapping),
                y=y,
                family_labels=family_labels,
                layer_mode=args.layer_mode,
                group_labels=group_labels,
                selector=args.selector,
                top_k_max=args.top_k_max,
                min_family_train=args.family_route_min_train,
            )
        )
        rows.extend(
            family_routed_activation_rows(
                block="B train hand -> test MCPTox",
                method=f"{args.model}_{feature_bundle.feature_kind}",
                features_by_layer=feature_bundle.features_by_layer,
                train_idx=indices_for(b_train, mapping),
                test_idx=indices_for(b_test, mapping),
                y=y,
                family_labels=family_labels,
                layer_mode=args.layer_mode,
                group_labels=group_labels,
                selector=args.selector,
                top_k_max=args.top_k_max,
                min_family_train=args.family_route_min_train,
            )
        )
    if args.per_layer and len(feature_bundle.features_by_layer) > 1:
        rows.extend(
            activation_per_layer_rows(
                block="A train MCPTox -> test hand",
                method=f"{args.model}_{feature_bundle.feature_kind}",
                features_by_layer=feature_bundle.features_by_layer,
                train_idx=indices_for(a_train, mapping),
                test_idx=indices_for(a_test, mapping),
                y=y,
                group_labels=group_labels,
                selector=args.selector,
            )
        )
        rows.extend(
            activation_per_layer_rows(
                block="B train hand -> test MCPTox",
                method=f"{args.model}_{feature_bundle.feature_kind}",
                features_by_layer=feature_bundle.features_by_layer,
                train_idx=indices_for(b_train, mapping),
                test_idx=indices_for(b_test, mapping),
                y=y,
                group_labels=group_labels,
                selector=args.selector,
            )
        )
    feature_bundles = [feature_bundle]

    if args.with_sae:
        sae_bundle = extract_sae_features(
            args.model,
            args.sae,
            [example.text for example in combined],
            batch_size=args.batch_size,
            max_length=args.max_length,
            device=args.device,
            dtype=args.dtype,
            local_files_only=args.local_files_only,
        )
        feature_bundles.append(sae_bundle)
        rows.extend(
            activation_block_rows(
                block="A train MCPTox -> test hand",
                method=f"{args.model}_{sae_bundle.feature_kind}",
                features_by_layer=sae_bundle.features_by_layer,
                train_idx=indices_for(a_train, mapping),
                test_idx=indices_for(a_test, mapping),
                y=y,
                layer_mode=args.layer_mode,
                group_labels=group_labels,
                selector=args.selector,
                top_k_max=args.top_k_max,
            )
        )
        rows.extend(
            activation_block_rows(
                block="B train hand -> test MCPTox",
                method=f"{args.model}_{sae_bundle.feature_kind}",
                features_by_layer=sae_bundle.features_by_layer,
                train_idx=indices_for(b_train, mapping),
                test_idx=indices_for(b_test, mapping),
                y=y,
                layer_mode=args.layer_mode,
                group_labels=group_labels,
                selector=args.selector,
                top_k_max=args.top_k_max,
            )
        )
        if args.with_family_routing:
            rows.extend(
                family_routed_activation_rows(
                    block="A train MCPTox -> test hand",
                    method=f"{args.model}_{sae_bundle.feature_kind}",
                    features_by_layer=sae_bundle.features_by_layer,
                    train_idx=indices_for(a_train, mapping),
                    test_idx=indices_for(a_test, mapping),
                    y=y,
                    family_labels=family_labels,
                    layer_mode=args.layer_mode,
                    group_labels=group_labels,
                    selector=args.selector,
                    top_k_max=args.top_k_max,
                    min_family_train=args.family_route_min_train,
                )
            )
            rows.extend(
                family_routed_activation_rows(
                    block="B train hand -> test MCPTox",
                    method=f"{args.model}_{sae_bundle.feature_kind}",
                    features_by_layer=sae_bundle.features_by_layer,
                    train_idx=indices_for(b_train, mapping),
                    test_idx=indices_for(b_test, mapping),
                    y=y,
                    family_labels=family_labels,
                    layer_mode=args.layer_mode,
                    group_labels=group_labels,
                    selector=args.selector,
                    top_k_max=args.top_k_max,
                    min_family_train=args.family_route_min_train,
                )
            )
        if args.per_layer and len(sae_bundle.features_by_layer) > 1:
            rows.extend(
                activation_per_layer_rows(
                    block="A train MCPTox -> test hand",
                    method=f"{args.model}_{sae_bundle.feature_kind}",
                    features_by_layer=sae_bundle.features_by_layer,
                    train_idx=indices_for(a_train, mapping),
                    test_idx=indices_for(a_test, mapping),
                    y=y,
                    group_labels=group_labels,
                    selector=args.selector,
                )
            )
            rows.extend(
                activation_per_layer_rows(
                    block="B train hand -> test MCPTox",
                    method=f"{args.model}_{sae_bundle.feature_kind}",
                    features_by_layer=sae_bundle.features_by_layer,
                    train_idx=indices_for(b_train, mapping),
                    test_idx=indices_for(b_test, mapping),
                    y=y,
                    group_labels=group_labels,
                    selector=args.selector,
                )
            )

    maybe_add_text_baselines(
        rows,
        [
            ("A train MCPTox -> test hand", a_train, a_test),
            ("B train hand -> test MCPTox", b_train, b_test),
        ],
        args.text_baseline,
    )

    return {
        "feature_bundle": feature_bundle,
        "feature_bundles": feature_bundles,
        "datasets": {
            "mcptox": summarize_examples(mcptox)
            | {"removed_duplicates": b_removed, "primary_families": summarize_primary_families(mcptox)},
            f"hand_{args.hand_pool}": summarize_examples(hand)
            | {"removed_duplicates": a_removed, "primary_families": summarize_primary_families(hand)},
            "combined_feature_set": summarize_examples(combined)
            | {"removed_duplicates": 0, "primary_families": summarize_primary_families(combined)},
        },
        "results": rows,
        "notes": [
            "Cross-style numbers are the main generalization gate; same-split scores are not enough.",
            f"Hand pool: {args.hand_pool}.",
            f"Layer selector: {args.selector}.",
            "Family labels are heuristic scaffolding, not final dataset truth.",
        ],
    }


def run_mcptox_samesplit(args: argparse.Namespace) -> dict:
    sk = import_sklearn()
    examples = sample_balanced(load_style("mcptox", args.data_dir), args.max_samples, args.seed)
    y = labels_for(examples)
    group_labels = selector_group_labels_for(examples, args.selector)
    family_labels = primary_families_for(examples)
    indices = np.arange(len(examples))
    train_idx, test_idx = sk["train_test_split"](
        indices,
        test_size=args.test_size,
        random_state=args.seed,
        stratify=y,
    )

    train = [examples[idx] for idx in train_idx]
    test = [examples[idx] for idx in test_idx]
    removed = 0
    if args.dedupe:
        full_mapping = index_map(examples)
        train, removed = remove_overlapping_train_examples(train, test)
        train_idx = np.asarray([full_mapping[example_key(example)] for example in train], dtype=np.int64)

    feature_bundle = extract_features(
        args.model,
        [example.text for example in examples],
        layers=parse_layers(args.layers),
        layer_sweep=args.layer_sweep,
        batch_size=args.batch_size,
        max_length=args.max_length,
        device=args.device,
        dtype=args.dtype,
        local_files_only=args.local_files_only,
    )
    rows = activation_block_rows(
        block="MCPTox same split",
        method=f"{args.model}_{feature_bundle.feature_kind}",
        features_by_layer=feature_bundle.features_by_layer,
        train_idx=np.asarray(train_idx, dtype=np.int64),
        test_idx=np.asarray(test_idx, dtype=np.int64),
        y=y,
        layer_mode=args.layer_mode,
        group_labels=group_labels,
        selector=args.selector,
        top_k_max=args.top_k_max,
    )
    if args.with_family_routing:
        rows.extend(
            family_routed_activation_rows(
                block="MCPTox same split",
                method=f"{args.model}_{feature_bundle.feature_kind}",
                features_by_layer=feature_bundle.features_by_layer,
                train_idx=np.asarray(train_idx, dtype=np.int64),
                test_idx=np.asarray(test_idx, dtype=np.int64),
                y=y,
                family_labels=family_labels,
                layer_mode=args.layer_mode,
                group_labels=group_labels,
                selector=args.selector,
                top_k_max=args.top_k_max,
                min_family_train=args.family_route_min_train,
            )
        )
    if args.per_layer and len(feature_bundle.features_by_layer) > 1:
        rows.extend(
            activation_per_layer_rows(
                block="MCPTox same split",
                method=f"{args.model}_{feature_bundle.feature_kind}",
                features_by_layer=feature_bundle.features_by_layer,
                train_idx=np.asarray(train_idx, dtype=np.int64),
                test_idx=np.asarray(test_idx, dtype=np.int64),
                y=y,
                group_labels=group_labels,
                selector=args.selector,
            )
        )
    feature_bundles = [feature_bundle]
    if args.with_sae:
        sae_bundle = extract_sae_features(
            args.model,
            args.sae,
            [example.text for example in examples],
            batch_size=args.batch_size,
            max_length=args.max_length,
            device=args.device,
            dtype=args.dtype,
            local_files_only=args.local_files_only,
        )
        feature_bundles.append(sae_bundle)
        rows.extend(
            activation_block_rows(
                block="MCPTox same split",
                method=f"{args.model}_{sae_bundle.feature_kind}",
                features_by_layer=sae_bundle.features_by_layer,
                train_idx=np.asarray(train_idx, dtype=np.int64),
                test_idx=np.asarray(test_idx, dtype=np.int64),
                y=y,
                layer_mode=args.layer_mode,
                group_labels=group_labels,
                selector=args.selector,
                top_k_max=args.top_k_max,
            )
        )
        if args.with_family_routing:
            rows.extend(
                family_routed_activation_rows(
                    block="MCPTox same split",
                    method=f"{args.model}_{sae_bundle.feature_kind}",
                    features_by_layer=sae_bundle.features_by_layer,
                    train_idx=np.asarray(train_idx, dtype=np.int64),
                    test_idx=np.asarray(test_idx, dtype=np.int64),
                    y=y,
                    family_labels=family_labels,
                    layer_mode=args.layer_mode,
                    group_labels=group_labels,
                    selector=args.selector,
                    top_k_max=args.top_k_max,
                    min_family_train=args.family_route_min_train,
                )
            )
        if args.per_layer and len(sae_bundle.features_by_layer) > 1:
            rows.extend(
                activation_per_layer_rows(
                    block="MCPTox same split",
                    method=f"{args.model}_{sae_bundle.feature_kind}",
                    features_by_layer=sae_bundle.features_by_layer,
                    train_idx=np.asarray(train_idx, dtype=np.int64),
                    test_idx=np.asarray(test_idx, dtype=np.int64),
                    y=y,
                    group_labels=group_labels,
                    selector=args.selector,
                )
            )
    maybe_add_text_baselines(rows, [("MCPTox same split", train, test)], args.text_baseline)
    return {
        "feature_bundle": feature_bundle,
        "feature_bundles": feature_bundles,
        "datasets": {
            "mcptox": summarize_examples(examples)
            | {"removed_duplicates": removed, "primary_families": summarize_primary_families(examples)},
        },
        "results": rows,
        "notes": [
            "Same-split is useful for regression, but should not be used as the product headline.",
        ],
    }


def run_curated_family_holdout(args: argparse.Namespace) -> dict:
    examples = load_curated_file(args.data_dir)
    if args.max_samples is not None:
        examples = sample_balanced(examples, args.max_samples, args.seed)

    families = sorted({family_for_example(example) for example in examples})
    mapping = index_map(examples)
    y = labels_for(examples)
    group_labels = primary_families_for(examples)
    rows = []
    skipped = []

    feature_bundle = extract_features(
        args.model,
        [example.text for example in examples],
        layers=parse_layers(args.layers),
        layer_sweep=args.layer_sweep,
        batch_size=args.batch_size,
        max_length=args.max_length,
        device=args.device,
        dtype=args.dtype,
        local_files_only=args.local_files_only,
    )
    feature_bundles = [feature_bundle]
    text_baseline_blocks = []

    for family in families:
        train = [example for example in examples if family_for_example(example) != family]
        test = [example for example in examples if family_for_example(example) == family]
        train_labels = set(labels_for(train).tolist()) if train else set()
        test_labels = set(labels_for(test).tolist()) if test else set()
        if train_labels != {0, 1} or test_labels != {0, 1}:
            skipped.append(
                {
                    "family": family,
                    "train_labels": sorted(train_labels),
                    "test_labels": sorted(test_labels),
                }
            )
            continue

        block = f"hold out {family}"
        train_idx = indices_for(train, mapping)
        test_idx = indices_for(test, mapping)
        rows.extend(
            activation_block_rows(
                block=block,
                method=f"{args.model}_{feature_bundle.feature_kind}",
                features_by_layer=feature_bundle.features_by_layer,
                train_idx=train_idx,
                test_idx=test_idx,
                y=y,
                layer_mode=args.layer_mode,
                group_labels=group_labels,
                selector=args.selector,
                top_k_max=args.top_k_max,
            )
        )
        if args.per_layer and len(feature_bundle.features_by_layer) > 1:
            rows.extend(
                activation_per_layer_rows(
                    block=block,
                    method=f"{args.model}_{feature_bundle.feature_kind}",
                    features_by_layer=feature_bundle.features_by_layer,
                    train_idx=train_idx,
                    test_idx=test_idx,
                    y=y,
                    group_labels=group_labels,
                    selector=args.selector,
                )
            )
        text_baseline_blocks.append((block, train, test))

    if args.with_sae:
        sae_bundle = extract_sae_features(
            args.model,
            args.sae,
            [example.text for example in examples],
            batch_size=args.batch_size,
            max_length=args.max_length,
            device=args.device,
            dtype=args.dtype,
            local_files_only=args.local_files_only,
        )
        feature_bundles.append(sae_bundle)
        for family in families:
            train = [example for example in examples if family_for_example(example) != family]
            test = [example for example in examples if family_for_example(example) == family]
            train_labels = set(labels_for(train).tolist()) if train else set()
            test_labels = set(labels_for(test).tolist()) if test else set()
            if train_labels != {0, 1} or test_labels != {0, 1}:
                continue
            rows.extend(
                activation_block_rows(
                    block=f"hold out {family}",
                    method=f"{args.model}_{sae_bundle.feature_kind}",
                    features_by_layer=sae_bundle.features_by_layer,
                    train_idx=indices_for(train, mapping),
                    test_idx=indices_for(test, mapping),
                    y=y,
                    layer_mode=args.layer_mode,
                    group_labels=group_labels,
                    selector=args.selector,
                    top_k_max=args.top_k_max,
                )
            )

    maybe_add_text_baselines(rows, text_baseline_blocks, args.text_baseline)
    notes = [
        "Curated-family-holdout is a tiny v0 gate; it tests metadata plumbing and obvious transfer failures, not final product quality.",
        "Rows use explicit family metadata where available instead of heuristic family labels.",
        "Pair split groups keep clean/poison twins together for future split-aware training.",
    ]
    if skipped:
        notes.append(f"Skipped families without both clean and poisoned rows: {skipped}")
    if args.with_family_routing:
        notes.append("Family routing is ignored for curated-family-holdout because the held-out family has no same-family training rows.")

    return {
        "feature_bundle": feature_bundle,
        "feature_bundles": feature_bundles,
        "datasets": {
            "family_curated_v0": summarize_examples(examples)
            | {
                "removed_duplicates": 0,
                "primary_families": summarize_primary_families(examples),
            },
        },
        "results": rows,
        "notes": notes,
    }


def run_routeguard_external(args: argparse.Namespace) -> dict:
    sk = import_sklearn()
    external = load_routeguard_external_file(args.data_dir)
    local_train = unique_examples(
        load_style("mcptox", args.data_dir),
        load_hand_pool(args.hand_pool, args.data_dir),
        load_curated_file(args.data_dir),
    )
    if args.max_samples is not None:
        external = sample_balanced(external, args.max_samples, args.seed)
        local_train = sample_balanced(local_train, args.max_samples, args.seed + 1)

    combined = unique_examples(local_train, external)
    mapping = index_map(combined)
    y = labels_for(combined)
    group_labels = selector_group_labels_for(combined, args.selector)
    feature_bundle = extract_features(
        args.model,
        [example.text for example in combined],
        layers=parse_layers(args.layers),
        layer_sweep=args.layer_sweep,
        batch_size=args.batch_size,
        max_length=args.max_length,
        device=args.device,
        dtype=args.dtype,
        local_files_only=args.local_files_only,
    )
    feature_bundles = [feature_bundle]
    rows = []
    text_baseline_blocks: list[tuple[str, list[Example], list[Example]]] = []
    block_specs: list[tuple[str, list[Example], list[Example]]] = []

    external_y = labels_for(external)
    if len(set(external_y.tolist())) == 2 and len(external) >= 4:
        external_indices = np.arange(len(external))
        train_pos, test_pos = sk["train_test_split"](
            external_indices,
            test_size=args.test_size,
            random_state=args.seed,
            stratify=external_y,
        )
        train = [external[idx] for idx in train_pos]
        test = [external[idx] for idx in test_pos]
        block = "RouteGuard external same split"
        rows.extend(
            activation_block_rows(
                block=block,
                method=f"{args.model}_{feature_bundle.feature_kind}",
                features_by_layer=feature_bundle.features_by_layer,
                train_idx=indices_for(train, mapping),
                test_idx=indices_for(test, mapping),
                y=y,
                layer_mode=args.layer_mode,
                group_labels=group_labels,
                selector=args.selector,
                top_k_max=args.top_k_max,
            )
        )
        if args.per_layer and len(feature_bundle.features_by_layer) > 1:
            rows.extend(
                activation_per_layer_rows(
                    block=block,
                    method=f"{args.model}_{feature_bundle.feature_kind}",
                    features_by_layer=feature_bundle.features_by_layer,
                    train_idx=indices_for(train, mapping),
                    test_idx=indices_for(test, mapping),
                    y=y,
                    group_labels=group_labels,
                    selector=args.selector,
                )
        )
        text_baseline_blocks.append((block, train, test))
        block_specs.append((block, train, test))

    styles = sorted({example.style for example in external})
    for style in styles:
        test = [example for example in external if example.style == style]
        train = [example for example in external if example.style != style]
        if len(set(labels_for(train).tolist())) == 2 and test:
            block = f"RouteGuard external hold out {style}"
            rows.extend(
                activation_block_rows(
                    block=block,
                    method=f"{args.model}_{feature_bundle.feature_kind}",
                    features_by_layer=feature_bundle.features_by_layer,
                    train_idx=indices_for(train, mapping),
                    test_idx=indices_for(test, mapping),
                    y=y,
                    layer_mode=args.layer_mode,
                    group_labels=group_labels,
                    selector=args.selector,
                    top_k_max=args.top_k_max,
                )
            )
            text_baseline_blocks.append((block, train, test))
            block_specs.append((block, train, test))

    local_labels = set(labels_for(local_train).tolist())
    if local_labels == {0, 1}:
        for style in ["__all_external__", *styles]:
            test = external if style == "__all_external__" else [example for example in external if example.style == style]
            if not test:
                continue
            block = "Local train -> all RouteGuard external" if style == "__all_external__" else f"Local train -> external {style}"
            rows.extend(
                activation_block_rows(
                    block=block,
                    method=f"{args.model}_{feature_bundle.feature_kind}",
                    features_by_layer=feature_bundle.features_by_layer,
                    train_idx=indices_for(local_train, mapping),
                    test_idx=indices_for(test, mapping),
                    y=y,
                    layer_mode=args.layer_mode,
                    group_labels=group_labels,
                    selector=args.selector,
                    top_k_max=args.top_k_max,
                )
            )
            text_baseline_blocks.append((block, local_train, test))
            block_specs.append((block, local_train, test))

    if args.with_sae:
        sae_bundle = extract_sae_features(
            args.model,
            args.sae,
            [example.text for example in combined],
            batch_size=args.batch_size,
            max_length=args.max_length,
            device=args.device,
            dtype=args.dtype,
            local_files_only=args.local_files_only,
        )
        feature_bundles.append(sae_bundle)
        sae_rows = []
        for block, train, test in block_specs:
            if len(set(labels_for(train).tolist())) != 2 or not test:
                continue
            sae_rows.extend(
                activation_block_rows(
                    block=block,
                    method=f"{args.model}_{sae_bundle.feature_kind}",
                    features_by_layer=sae_bundle.features_by_layer,
                    train_idx=indices_for(train, mapping),
                    test_idx=indices_for(test, mapping),
                    y=y,
                    layer_mode=args.layer_mode,
                    group_labels=group_labels,
                    selector=args.selector,
                    top_k_max=args.top_k_max,
                )
            )
        rows.extend(sae_rows)

    maybe_add_text_baselines(rows, text_baseline_blocks, args.text_baseline)

    return {
        "feature_bundle": feature_bundle,
        "feature_bundles": feature_bundles,
        "datasets": {
            "local_train_pool": summarize_examples(local_train)
            | {"removed_duplicates": 0, "primary_families": summarize_primary_families(local_train)},
            "routeguard_external_v0": summarize_examples(external)
            | {"removed_duplicates": 0, "primary_families": summarize_primary_families(external)},
            "combined_feature_set": summarize_examples(combined)
            | {"removed_duplicates": 0, "primary_families": summarize_primary_families(combined)},
        },
        "results": rows,
        "notes": [
            "RouteGuard external v0 imports public RouteGuard-related benchmark sources into inert scanner rows.",
            "Skill-Inject rows are constructed SKILL.md text; BIPIA rows are ordinary indirect-prompt-injection text.",
            "MaliciousAgentSkillsBench rows are currently metadata-only unless a later importer resolves SKILL.md package contents.",
            f"Hand pool used for local-transfer training: {args.hand_pool}.",
        ],
    }


def dataset_summary(args: argparse.Namespace) -> dict:
    inventory = exact_dataset_inventory(args.data_dir)
    datasets = {
        "inventory": {
            "n": sum(row["rows"] for row in inventory),
            "usable_text_rows": sum(row["usable_text_rows"] for row in inventory),
            "labels": {},
            "styles": {},
            "sources": {row["file"]: row["rows"] for row in inventory},
            "usable_sources": {row["file"]: row["usable_text_rows"] for row in inventory},
            "removed_duplicates": 0,
        }
    }
    return {
        "feature_bundle": None,
        "datasets": datasets,
        "results": [],
        "notes": ["Dataset inventory only; no model was loaded."],
    }


def report_from_result(args: argparse.Namespace, result: dict, elapsed_seconds: float) -> dict:
    run_id = f"{utc_timestamp()}-{args.suite}-{args.model}".replace("/", "_")
    feature_bundle = result.get("feature_bundle")
    config = vars(args).copy()
    config["data_dir"] = str(config["data_dir"])
    config["output_dir"] = str(config["output_dir"])
    report = {
        "run_id": run_id,
        "created_at": utc_timestamp(),
        "config": config,
        "sensor": get_sensor(args.model).to_dict(),
        "sae_registry": [asdict(spec) for spec in sae_registry_for_sensor(args.model)],
        "datasets": result["datasets"],
        "results": result["results"],
        "notes": result.get("notes", []),
        "elapsed_seconds": elapsed_seconds,
    }
    if getattr(args, "measure_runtime", False):
        report["runtime"] = {
            "elapsed_seconds": elapsed_seconds,
            "rss_mb_at_report": current_rss_mb(),
        }
    if feature_bundle is not None:
        report["feature_kind"] = feature_bundle.feature_kind
        report["feature_layers"] = list(feature_bundle.layers)
        report["feature_elapsed_seconds"] = feature_bundle.elapsed_seconds
        report["feature_details"] = feature_bundle.details
    if result.get("feature_bundles"):
        report["feature_bundles"] = [
            {
                "model_name": bundle.model_name,
                "feature_kind": bundle.feature_kind,
                "layers": list(bundle.layers),
                "elapsed_seconds": bundle.elapsed_seconds,
                "details": bundle.details,
            }
            for bundle in result["feature_bundles"]
        ]
    return report


def print_model_registry() -> None:
    print("Sensors:")
    for name in sensor_names():
        spec = SENSORS[name]
        gated = " gated" if spec.gated else ""
        print(f"  {name:16} {spec.kind:12} {spec.hf_model_id or '-'}{gated}")
        if spec.notes:
            print(f"    {spec.notes}")
    print("\nSAEs:")
    for name in sae_names():
        spec = SAES[name]
        print(f"  {name:24} sensor={spec.sensor:14} release={spec.release} id={spec.sae_id}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--suite",
        choices=(
            "cross-style",
            "mcptox-samesplit",
            "curated-family-holdout",
            "routeguard-external",
            "dataset-summary",
        ),
        default="cross-style",
    )
    parser.add_argument("--model", choices=sensor_names(), default="lexical-smoke")
    parser.add_argument("--text-baseline", choices=("none", "tfidf", "deberta", "all"), default="tfidf")
    parser.add_argument("--hand-pool", choices=("core", "all"), default="core")
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--max-samples", type=int, default=None, help="Balanced cap per corpus for smoke runs.")
    parser.add_argument("--test-size", type=float, default=0.30)
    parser.add_argument("--seed", type=int, default=SEED)
    parser.add_argument("--dedupe", action="store_true", help="Remove exact normalized train texts that appear in test.")
    parser.add_argument(
        "--selector",
        choices=("cv", "leave-one-style-out", "leave-one-family-out"),
        default="cv",
        help=(
            "How to score candidate layers/k values before final training. "
            "cv uses stratified train-fold CV; leave-one-style-out holds out "
            "each training style; leave-one-family-out holds out each heuristic "
            "risk family. Group selectors average held-out F1 and fall back to CV "
            "when there are too few usable groups."
        ),
    )
    parser.add_argument(
        "--layer-mode",
        type=layer_mode_arg,
        default="best",
        help=(
            "Layer policy: best single layer by selector score; bestN such as best6; "
            "best-auto chooses k by selector score; best-sweep reports best1..bestN; "
            "or concat all selected layers."
        ),
    )
    parser.add_argument(
        "--top-k-max",
        type=int,
        default=DEFAULT_TOP_K_MAX,
        help="Maximum k for --layer-mode best-sweep or best-auto.",
    )
    parser.add_argument(
        "--with-family-routing",
        action="store_true",
        help=(
            "Also report heuristic family-routed rows: each risk family chooses "
            "layers by within-family CV when enough training data exists, otherwise "
            "falls back to the global layer policy."
        ),
    )
    parser.add_argument(
        "--family-route-min-train",
        type=int,
        default=8,
        help="Minimum same-family training examples before family-routed rows choose family-specific layers.",
    )
    parser.add_argument("--per-layer", action="store_true", help="Also report fixed-layer rows for every selected layer.")
    parser.add_argument("--layer-sweep", action="store_true", help="Use every hidden layer as a candidate.")
    parser.add_argument("--layers", default=None, help="Comma-separated fixed hidden-state layers, e.g. 3 or 2,4,6.")
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--max-length", type=int, default=256)
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--dtype", choices=("auto", "float32", "bfloat16"), default="float32")
    parser.add_argument("--local-files-only", action="store_true")
    parser.add_argument("--measure-runtime", action="store_true", help="Record elapsed time and process RSS in the report.")
    parser.add_argument("--with-sae", action="store_true")
    parser.add_argument("--sae", choices=sae_names(), default=None, help="SAE registry name; defaults to first SAE for the model.")
    parser.add_argument("--no-write", action="store_true", help="Print only; do not write JSON/Markdown reports.")
    parser.add_argument("--list-models", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.top_k_max < 1:
        parser.error("--top-k-max must be at least 1")
    if args.family_route_min_train < 1:
        parser.error("--family-route-min-train must be at least 1")

    if args.list_models:
        print_model_registry()
        return 0

    started = time.perf_counter()
    if args.suite == "cross-style":
        result = run_cross_style(args)
    elif args.suite == "mcptox-samesplit":
        result = run_mcptox_samesplit(args)
    elif args.suite == "curated-family-holdout":
        result = run_curated_family_holdout(args)
    elif args.suite == "routeguard-external":
        result = run_routeguard_external(args)
    elif args.suite == "dataset-summary":
        result = dataset_summary(args)
    else:
        raise AssertionError(args.suite)

    elapsed = time.perf_counter() - started
    report = report_from_result(args, result, elapsed)
    print_result_table(report["results"])

    if not args.no_write:
        json_path = write_json_report(report, args.output_dir)
        markdown_path = write_markdown_report(report, args.output_dir)
        print(f"\nWrote:\n  {json_path}\n  {markdown_path}")
    else:
        print(json.dumps({"run_id": report["run_id"], "datasets": report["datasets"]}, indent=2))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
