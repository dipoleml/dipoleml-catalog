#!/usr/bin/env python3
"""Train and save a cached activation-scanner probe artifact."""

from __future__ import annotations

import argparse
import json
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import numpy as np

try:
    from .activation_scanner_core import CORE_VERSION
    from .benchmarks.activation_scanner_benchmark import (
        binary_metrics,
        feature_matrix_for_layer_mode,
        import_sklearn,
        labels_for,
        layer_mode_arg,
        selector_group_labels_for,
        unique_examples,
    )
    from .benchmarks.datasets import (
        DEFAULT_DATA_DIR,
        Example,
        load_curated_file,
        load_all_balanced_styles,
        load_hand_pool,
        load_style,
        sample_balanced,
        summarize_examples,
    )
    from .benchmarks.model_registry import SAES, SENSORS, extract_features, extract_sae_features, get_sae, get_sensor, parse_layers
except ImportError:
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from research.activation_scanner_core import CORE_VERSION  # type: ignore
    from research.benchmarks.activation_scanner_benchmark import (  # type: ignore
        binary_metrics,
        feature_matrix_for_layer_mode,
        import_sklearn,
        labels_for,
        layer_mode_arg,
        selector_group_labels_for,
        unique_examples,
    )
    from research.benchmarks.datasets import (  # type: ignore
        DEFAULT_DATA_DIR,
        Example,
        load_curated_file,
        load_all_balanced_styles,
        load_hand_pool,
        load_style,
        sample_balanced,
        summarize_examples,
    )
    from research.benchmarks.model_registry import (  # type: ignore
        SAES,
        SENSORS,
        extract_features,
        extract_sae_features,
        get_sae,
        get_sensor,
        parse_layers,
    )


ARTIFACT_VERSION = "activation-probe-artifact-v1"
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent / "_results" / "activation_scanner_artifacts"


def utc_now() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def timestamp_slug() -> str:
    return datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")


def safe_slug(value: str) -> str:
    value = re.sub(r"[^A-Za-z0-9._-]+", "-", value.strip())
    return re.sub(r"-+", "-", value).strip("-").lower()


def load_training_examples(train_source: str, data_dir: Path) -> list[Example]:
    if train_source == "hand-core":
        return load_hand_pool("core", data_dir)
    if train_source == "hand-all":
        return load_hand_pool("all", data_dir)
    if train_source == "mcptox":
        return load_style("mcptox", data_dir)
    if train_source == "pooled-core":
        return unique_examples(load_style("mcptox", data_dir), load_hand_pool("core", data_dir))
    if train_source == "pooled-all":
        return unique_examples(load_style("mcptox", data_dir), load_hand_pool("all", data_dir))
    if train_source == "balanced-styles":
        return unique_examples(load_all_balanced_styles(data_dir))
    if train_source == "family-curated-v0":
        return load_curated_file(data_dir)
    if train_source == "pooled-curated-core":
        return unique_examples(load_style("mcptox", data_dir), load_hand_pool("core", data_dir), load_curated_file(data_dir))
    raise ValueError(f"Unknown train source: {train_source}")


def require_two_classes(labels: np.ndarray) -> None:
    classes = sorted(set(int(label) for label in labels))
    if len(classes) < 2:
        raise SystemExit(f"Probe training needs both clean and poisoned labels; got classes={classes}")


def extract_training_matrix(args: argparse.Namespace, train: list[Example]) -> tuple[np.ndarray, dict[str, Any]]:
    texts = [example.text for example in train]
    y = labels_for(train)
    train_idx = np.arange(len(train), dtype=np.int64)

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
        layer = bundle.layers[0]
        matrix = bundle.features_by_layer[layer]
        selected_layers = [int(layer)]
        candidate_layers = selected_layers
        selection_score = None
        layer_policy = {
            "mode": "fixed_sae_layer",
            "selector": None,
            "layer": int(layer),
            "candidate_layers": candidate_layers,
            "selected_layers": selected_layers,
            "selected_k": 1,
            "selection_score": selection_score,
        }
    else:
        if args.layer_mode == "best-sweep":
            raise SystemExit("--layer-mode best-sweep is a report mode, not a releasable artifact policy.")
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
        group_labels = selector_group_labels_for(train, args.selector)
        layer, candidate_layers, selected_layers, selection_score, matrix = feature_matrix_for_layer_mode(
            bundle.features_by_layer,
            train_idx,
            y,
            args.layer_mode,
            group_labels,
            args.selector,
            args.top_k_max,
        )
        layer_policy = {
            "mode": args.layer_mode,
            "selector": args.selector,
            "layer": layer,
            "candidate_layers": [int(layer_id) for layer_id in candidate_layers],
            "selected_layers": [int(layer_id) for layer_id in selected_layers],
            "selected_k": int(len(selected_layers)),
            "selection_score": selection_score,
        }

    feature_details = dict(bundle.details)
    feature_details["extract_elapsed_seconds"] = bundle.elapsed_seconds
    metadata = {
        "extractor": args.feature_kind,
        "feature_kind": bundle.feature_kind,
        "feature_dim": int(matrix.shape[1]),
        "feature_details": feature_details,
        "layer_policy": layer_policy,
    }
    return matrix, metadata


def train_probe(matrix: np.ndarray, y: np.ndarray) -> tuple[Any, dict[str, Any]]:
    sk = import_sklearn()
    classifier = sk["LogisticRegression"](max_iter=3000)
    classifier.fit(matrix, y)
    pred = classifier.predict(matrix)
    metrics = binary_metrics(y, pred)
    return classifier, {
        "algorithm": "logistic_regression",
        "max_iter": 3000,
        "classes": [int(value) for value in classifier.classes_],
        "train_metrics": metrics,
    }


def save_artifact(
    *,
    artifact_dir: Path,
    metadata: dict[str, Any],
    classifier: Any,
    overwrite: bool,
) -> None:
    if artifact_dir.exists() and any(artifact_dir.iterdir()) and not overwrite:
        raise SystemExit(f"Artifact directory already exists and is not empty: {artifact_dir}")
    artifact_dir.mkdir(parents=True, exist_ok=True)

    weights_path = artifact_dir / "probe_weights.npz"
    metadata_path = artifact_dir / "metadata.json"
    np.savez(
        weights_path,
        coef=np.asarray(classifier.coef_, dtype=np.float64),
        intercept=np.asarray(classifier.intercept_, dtype=np.float64),
        classes=np.asarray(classifier.classes_, dtype=np.int64),
    )
    metadata_path.write_text(json.dumps(metadata, indent=2, sort_keys=True) + "\n")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", choices=sorted(SENSORS), default="pythia-70m")
    parser.add_argument("--feature-kind", choices=("raw", "sae"), default="sae")
    parser.add_argument("--sae", choices=sorted(SAES), default="pythia-70m-deduped-l2")
    parser.add_argument(
        "--train-source",
        choices=(
            "hand-core",
            "hand-all",
            "mcptox",
            "pooled-core",
            "pooled-all",
            "balanced-styles",
            "family-curated-v0",
            "pooled-curated-core",
        ),
        default="pooled-core",
    )
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR)
    parser.add_argument("--max-train-samples", type=int, default=None)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--layers", default=None, help="Comma-separated raw-activation layers.")
    parser.add_argument("--layer-sweep", action="store_true")
    parser.add_argument("--layer-mode", type=layer_mode_arg, default="best")
    parser.add_argument(
        "--selector",
        choices=("cv", "leave-one-style-out", "leave-one-family-out"),
        default="cv",
    )
    parser.add_argument("--top-k-max", type=int, default=10)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--max-length", type=int, default=256)
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--dtype", choices=("auto", "float32", "bfloat16"), default="float32")
    parser.add_argument("--local-files-only", action="store_true")
    parser.add_argument("--warn-threshold", type=float, default=0.30)
    parser.add_argument("--block-threshold", type=float, default=0.85)
    parser.add_argument("--artifact-id", default=None)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--overwrite", action="store_true")
    parser.add_argument("--pretty", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.top_k_max < 1:
        raise SystemExit("--top-k-max must be at least 1")

    sensor = get_sensor(args.model)
    if args.feature_kind == "sae":
        sae = get_sae(args.sae)
        if sae.sensor != args.model:
            raise SystemExit(f"SAE {args.sae} belongs to {sae.sensor}, not {args.model}")
    else:
        sae = None

    train = load_training_examples(args.train_source, args.data_dir)
    train = sample_balanced(train, args.max_train_samples, args.seed)
    y = labels_for(train)
    require_two_classes(y)

    matrix, feature_metadata = extract_training_matrix(args, train)
    classifier, probe_metadata = train_probe(matrix, y)

    layer_policy = feature_metadata["layer_policy"]
    default_id = "-".join(
        safe_slug(part)
        for part in (
            timestamp_slug(),
            args.model,
            feature_metadata["feature_kind"],
            str(layer_policy["mode"]),
            str(layer_policy["layer"]),
        )
    )
    artifact_id = safe_slug(args.artifact_id) if args.artifact_id else default_id
    artifact_dir = args.output_dir / artifact_id

    metadata: dict[str, Any] = {
        "artifact_version": ARTIFACT_VERSION,
        "artifact_id": artifact_id,
        "created_at": utc_now(),
        "scanner_version": CORE_VERSION,
        "sensor_model": args.model,
        "model_id": sensor.hf_model_id,
        "sensor": sensor.to_dict(),
        "sae": sae.to_dict() if sae else None,
        "dataset": {
            "train_source": args.train_source,
            "summary": summarize_examples(train),
            "max_train_samples": args.max_train_samples,
            "seed": args.seed,
        },
        "probe": probe_metadata,
        "thresholds": {
            "warn": args.warn_threshold,
            "block": args.block_threshold,
        },
    }
    metadata.update(feature_metadata)

    save_artifact(artifact_dir=artifact_dir, metadata=metadata, classifier=classifier, overwrite=args.overwrite)
    output = {
        "artifact_dir": str(artifact_dir),
        "metadata_path": str(artifact_dir / "metadata.json"),
        "weights_path": str(artifact_dir / "probe_weights.npz"),
        "metadata": metadata,
    }
    print(json.dumps(output, indent=2 if args.pretty else None, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
