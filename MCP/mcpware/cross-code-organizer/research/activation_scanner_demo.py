#!/usr/bin/env python3
"""Single-text activation scanner demo for the research preview.

This is not the final packaged scanner. It trains a small probe from the local
research dataset at runtime, then emits the JSON risk-object shape that the
product scanner should eventually expose from cached probe weights.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import numpy as np

try:
    from .benchmarks.activation_scanner_benchmark import choose_layer, import_sklearn, labels_for
    from .benchmarks.datasets import DEFAULT_DATA_DIR, Example, load_hand_pool, sample_balanced, summarize_examples
    from .benchmarks.model_registry import SAES, SENSORS, extract_features, extract_sae_features, get_sensor, parse_layers
    from .scanner_static import choose_decision, static_scan, static_score
except ImportError:
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from research.benchmarks.activation_scanner_benchmark import choose_layer, import_sklearn, labels_for  # type: ignore
    from research.benchmarks.datasets import (  # type: ignore
        DEFAULT_DATA_DIR,
        Example,
        load_hand_pool,
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
    )
    from research.scanner_static import choose_decision, static_scan, static_score  # type: ignore


SCANNER_VERSION = "activation-demo-2026-06-01"


def positive_probability(classifier, matrix: np.ndarray) -> float:
    classes = list(classifier.classes_)
    if 1 not in classes:
        return 0.0
    idx = classes.index(1)
    return float(classifier.predict_proba(matrix)[0][idx])


def read_input_text(args: argparse.Namespace) -> str:
    if args.text and args.file:
        raise SystemExit("Use either --text or --file, not both.")
    if args.text:
        return args.text
    if args.file:
        return Path(args.file).read_text()
    raise SystemExit("Provide --text or --file.")


def train_text_baseline(train: list[Example], target_text: str) -> float:
    sk = import_sklearn()
    vectorizer = sk["TfidfVectorizer"](ngram_range=(1, 2), min_df=1, max_features=5000)
    train_matrix = vectorizer.fit_transform([example.text for example in train])
    target_matrix = vectorizer.transform([target_text])
    classifier = sk["LogisticRegression"](max_iter=3000)
    classifier.fit(train_matrix, labels_for(train))
    return positive_probability(classifier, target_matrix)


def train_activation_probe(args: argparse.Namespace, train: list[Example], target_text: str) -> tuple[float, dict]:
    sk = import_sklearn()
    texts = [example.text for example in train] + [target_text]
    y_train = labels_for(train)
    train_idx = np.arange(len(train), dtype=np.int64)
    y_with_dummy_target = np.concatenate([y_train, np.asarray([0], dtype=np.int64)])

    if args.feature_kind == "sae":
        bundle = extract_sae_features(
            args.model,
            args.sae,
            texts,
            batch_size=args.batch_size,
            max_length=args.max_length,
            device=args.device,
            dtype=args.dtype,
            local_files_only=args.local_files_only,
        )
    else:
        bundle = extract_features(
            args.model,
            texts,
            layers=parse_layers(args.layers),
            layer_sweep=args.layer_sweep,
            batch_size=args.batch_size,
            max_length=args.max_length,
            device=args.device,
            dtype=args.dtype,
            local_files_only=args.local_files_only,
        )

    layer, cv_score = choose_layer(bundle.features_by_layer, train_idx, y_with_dummy_target)
    classifier = sk["LogisticRegression"](max_iter=3000)
    train_matrix = bundle.features_by_layer[layer][: len(train)]
    target_matrix = bundle.features_by_layer[layer][len(train) :]
    classifier.fit(train_matrix, y_train)
    score = positive_probability(classifier, target_matrix)

    return score, {
        "feature_kind": bundle.feature_kind,
        "layer": layer,
        "candidate_layers": list(bundle.layers),
        "cv_accuracy": cv_score,
        "feature_elapsed_seconds": bundle.elapsed_seconds,
        "feature_details": bundle.details,
    }


def build_reasons(
    *,
    activation_score: float,
    text_score: float | None,
    static_findings: list[dict],
    feature_kind: str,
) -> list[str]:
    reasons = [f"{feature_kind} activation probe score={activation_score:.3f}"]
    if text_score is not None:
        reasons.append(f"tfidf text baseline score={text_score:.3f}")
    for finding in static_findings:
        reasons.append(f"{finding['severity']} static finding {finding['id']}: {finding['reason']}")
    if not static_findings and activation_score < 0.5 and (text_score is None or text_score < 0.5):
        reasons.append("No strong activation, text-baseline, or static keyword signal in this preview scanner.")
    return reasons


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--text", help="Tool, MCP, skill, plugin, or hook description to scan.")
    parser.add_argument("--file", type=Path, help="Read text to scan from a local file.")
    parser.add_argument("--model", choices=sorted(SENSORS), default="pythia-70m")
    parser.add_argument("--feature-kind", choices=("sae", "raw"), default="sae")
    parser.add_argument("--sae", choices=sorted(SAES), default="pythia-70m-deduped-l2")
    parser.add_argument("--train-pool", choices=("core", "all"), default="core")
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR)
    parser.add_argument("--max-train-samples", type=int, default=None)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--layers", default=None, help="Comma-separated raw-activation layers.")
    parser.add_argument("--layer-sweep", action="store_true")
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--max-length", type=int, default=256)
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--dtype", choices=("auto", "float32", "bfloat16"), default="float32")
    parser.add_argument("--local-files-only", action="store_true")
    parser.add_argument("--no-text-baseline", action="store_true")
    parser.add_argument("--warn-threshold", type=float, default=0.50)
    parser.add_argument("--block-threshold", type=float, default=0.85)
    parser.add_argument("--pretty", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    target_text = read_input_text(args)
    started = time.perf_counter()

    train = load_hand_pool(args.train_pool, args.data_dir)
    train = sample_balanced(train, args.max_train_samples, args.seed)

    static_findings = static_scan(target_text)
    text_score = None if args.no_text_baseline else train_text_baseline(train, target_text)
    activation_score, activation_details = train_activation_probe(args, train, target_text)
    static_risk_score = static_score(static_findings)
    risk_score = max(activation_score, text_score or 0.0, static_risk_score)
    decision = choose_decision(risk_score, args.warn_threshold, args.block_threshold)

    sensor = get_sensor(args.model)
    output = {
        "decision": decision,
        "risk_score": risk_score,
        "risk_reasons": build_reasons(
            activation_score=activation_score,
            text_score=text_score,
            static_findings=static_findings,
            feature_kind=activation_details["feature_kind"],
        ),
        "activation_score": activation_score,
        "text_baseline_score": text_score,
        "static_score": static_risk_score,
        "evidence_spans": static_findings,
        "scanner_version": SCANNER_VERSION,
        "model_id": sensor.hf_model_id,
        "sensor_model": args.model,
        "sae": args.sae if args.feature_kind == "sae" else None,
        "mode": "research_preview_trains_probe_at_runtime",
        "training_data": summarize_examples(train),
        "activation_details": activation_details,
        "thresholds": {
            "warn": args.warn_threshold,
            "block": args.block_threshold,
        },
        "elapsed_seconds": time.perf_counter() - started,
    }
    print(json.dumps(output, indent=2 if args.pretty else None, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
