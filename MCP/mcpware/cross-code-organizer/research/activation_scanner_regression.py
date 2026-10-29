#!/usr/bin/env python3
"""Regression checks for the cached activation scanner runtime."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

try:
    from .activation_scanner_core import scan_texts
except ImportError:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from research.activation_scanner_core import scan_texts  # type: ignore


RESEARCH_DIR = Path(__file__).resolve().parent
DEFAULT_CASES = RESEARCH_DIR / "fixtures" / "activation_scanner_regression_cases.json"
DEFAULT_SCHEMA = RESEARCH_DIR / "schemas" / "activation_scanner_risk.schema.json"
DEFAULT_ARTIFACT_ROOT = RESEARCH_DIR / "_results" / "activation_scanner_artifacts"
DEFAULT_ARTIFACT_ID = "lexical-smoke-regression"
DECISIONS = {"allow", "warn", "block", "quarantine"}
DECISION_RANK = {
    "allow": 0,
    "warn": 1,
    "block": 2,
    "quarantine": 3,
}
REQUIRED_TOP_LEVEL_KEYS = {
    "decision",
    "risk_score",
    "risk_reasons",
    "activation_score",
    "text_baseline_score",
    "static_score",
    "sae_features",
    "evidence_spans",
    "scanner_version",
    "artifact_id",
    "artifact_path",
    "model_id",
    "sensor_model",
    "sae",
    "mode",
    "training_data",
    "activation_details",
    "thresholds",
    "decision_policy",
    "elapsed_seconds",
}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text())


def artifact_complete(artifact: Path) -> bool:
    return (artifact / "metadata.json").exists() and (artifact / "probe_weights.npz").exists()


def build_lexical_artifact(artifact_root: Path, artifact_id: str) -> None:
    cmd = [
        sys.executable,
        "-m",
        "research.train_probe_artifact",
        "--model",
        "lexical-smoke",
        "--feature-kind",
        "raw",
        "--train-source",
        "pooled-core",
        "--max-train-samples",
        "40",
        "--artifact-id",
        artifact_id,
        "--output-dir",
        str(artifact_root),
        "--overwrite",
    ]
    result = subprocess.run(cmd, cwd=RESEARCH_DIR.parent, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        if result.stdout:
            print(result.stdout, file=sys.stderr)
        if result.stderr:
            print(result.stderr, file=sys.stderr)
        raise SystemExit(result.returncode)


def require_score(output: dict[str, Any], key: str, errors: list[str]) -> None:
    value = output.get(key)
    if not isinstance(value, (int, float)):
        errors.append(f"{key} must be a number")
        return
    if value < 0 or value > 1:
        errors.append(f"{key} must be in [0, 1], got {value}")


def validate_minimal_risk_object(output: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    missing = sorted(REQUIRED_TOP_LEVEL_KEYS - set(output))
    if missing:
        errors.append(f"missing keys: {missing}")

    if output.get("decision") not in DECISIONS:
        errors.append(f"decision must be one of {sorted(DECISIONS)}, got {output.get('decision')!r}")

    for key in ("risk_score", "activation_score", "static_score"):
        require_score(output, key, errors)

    if output.get("text_baseline_score") is not None:
        require_score(output, "text_baseline_score", errors)

    if not isinstance(output.get("risk_reasons"), list) or not all(isinstance(row, str) for row in output.get("risk_reasons", [])):
        errors.append("risk_reasons must be a list of strings")

    if not isinstance(output.get("evidence_spans"), list):
        errors.append("evidence_spans must be a list")
    else:
        for idx, span in enumerate(output["evidence_spans"]):
            for key in ("id", "severity", "reason", "matched_text", "start", "end", "context"):
                if key not in span:
                    errors.append(f"evidence_spans[{idx}] missing {key}")

    if not isinstance(output.get("sae_features"), list):
        errors.append("sae_features must be a list")
    else:
        for idx, feature in enumerate(output["sae_features"]):
            for key in ("feature_index", "activation_value", "probe_weight", "contribution"):
                if key not in feature:
                    errors.append(f"sae_features[{idx}] missing {key}")

    thresholds = output.get("thresholds")
    if not isinstance(thresholds, dict):
        errors.append("thresholds must be an object")
    else:
        for key in ("warn", "block"):
            if not isinstance(thresholds.get(key), (int, float)):
                errors.append(f"thresholds.{key} must be a number")

    decision_policy = output.get("decision_policy")
    if not isinstance(decision_policy, dict):
        errors.append("decision_policy must be an object")
    else:
        for key in ("name", "block_requires", "static_block_bundles", "policy_reasons"):
            if key not in decision_policy:
                errors.append(f"decision_policy missing {key}")

    if isinstance(output.get("risk_score"), (int, float)) and isinstance(output.get("activation_score"), (int, float)):
        expected_min = max(float(output["activation_score"]), float(output.get("static_score", 0)))
        if float(output["risk_score"]) + 1e-9 < expected_min:
            errors.append("risk_score must be at least max(activation_score, static_score)")

    return errors


def validate_with_jsonschema(output: dict[str, Any], schema: dict[str, Any]) -> bool:
    try:
        import jsonschema
    except ImportError:
        return False
    jsonschema.validate(instance=output, schema=schema)
    return True


def validate_case(case: dict[str, Any], output: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    expected_decision = case.get("expected_decision")
    if expected_decision is not None and output.get("decision") != expected_decision:
        errors.append(f"expected decision {expected_decision!r}, got {output.get('decision')!r}")

    min_decision = case.get("min_decision")
    if min_decision is not None:
        if min_decision not in DECISION_RANK:
            errors.append(f"unknown min_decision {min_decision!r}")
        elif DECISION_RANK.get(str(output.get("decision")), -1) < DECISION_RANK[min_decision]:
            errors.append(f"decision {output.get('decision')!r} below min_decision {min_decision!r}")

    max_decision = case.get("max_decision")
    if max_decision is not None:
        if max_decision not in DECISION_RANK:
            errors.append(f"unknown max_decision {max_decision!r}")
        elif DECISION_RANK.get(str(output.get("decision")), 99) > DECISION_RANK[max_decision]:
            errors.append(f"decision {output.get('decision')!r} above max_decision {max_decision!r}")

    forbidden_decisions = set(case.get("forbidden_decisions", []))
    if output.get("decision") in forbidden_decisions:
        errors.append(f"decision {output.get('decision')!r} is forbidden for this case")

    if "min_risk_score" in case and output.get("risk_score", 0) < case["min_risk_score"]:
        errors.append(f"risk_score {output.get('risk_score')} below {case['min_risk_score']}")
    if "max_risk_score" in case and output.get("risk_score", 1) > case["max_risk_score"]:
        errors.append(f"risk_score {output.get('risk_score')} above {case['max_risk_score']}")
    if "min_static_score" in case and output.get("static_score", 0) < case["min_static_score"]:
        errors.append(f"static_score {output.get('static_score')} below {case['min_static_score']}")
    if "max_static_score" in case and output.get("static_score", 1) > case["max_static_score"]:
        errors.append(f"static_score {output.get('static_score')} above {case['max_static_score']}")

    finding_ids = {row.get("id") for row in output.get("evidence_spans", [])}
    for finding_id in case.get("required_static_findings", []):
        if finding_id not in finding_ids:
            errors.append(f"missing required static finding {finding_id}")
    if case.get("required_static_findings") == [] and finding_ids:
        errors.append(f"expected no static findings, got {sorted(finding_ids)}")
    return errors


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cases", type=Path, default=DEFAULT_CASES)
    parser.add_argument("--schema", type=Path, default=DEFAULT_SCHEMA)
    parser.add_argument("--artifact", type=Path, default=DEFAULT_ARTIFACT_ROOT / DEFAULT_ARTIFACT_ID)
    parser.add_argument("--artifact-root", type=Path, default=DEFAULT_ARTIFACT_ROOT)
    parser.add_argument("--artifact-id", default=DEFAULT_ARTIFACT_ID)
    parser.add_argument("--rebuild-artifact", action="store_true")
    parser.add_argument("--no-build", action="store_true")
    parser.add_argument("--pretty", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    artifact = args.artifact
    if args.artifact == DEFAULT_ARTIFACT_ROOT / DEFAULT_ARTIFACT_ID:
        artifact = args.artifact_root / args.artifact_id

    if args.rebuild_artifact or (not args.no_build and not artifact_complete(artifact)):
        build_lexical_artifact(args.artifact_root, args.artifact_id)

    cases = load_json(args.cases)
    schema = load_json(args.schema)
    results = []
    failures = []
    schema_validator = "minimal"

    outputs = scan_texts([case["text"] for case in cases], artifact)
    for case, output in zip(cases, outputs, strict=True):
        try:
            if validate_with_jsonschema(output, schema):
                schema_validator = "jsonschema"
        except Exception as exc:
            failures.append({"case_id": case["id"], "errors": [f"jsonschema validation failed: {exc}"]})

        errors = validate_minimal_risk_object(output)
        errors.extend(validate_case(case, output))
        result = {
            "case_id": case["id"],
            "decision": output["decision"],
            "risk_score": output["risk_score"],
            "activation_score": output["activation_score"],
            "static_score": output["static_score"],
            "errors": errors,
        }
        results.append(result)
        if errors:
            failures.append({"case_id": case["id"], "errors": errors})

    summary = {
        "passed": not failures,
        "case_count": len(cases),
        "failure_count": len(failures),
        "artifact": str(artifact),
        "schema": str(args.schema),
        "schema_validator": schema_validator,
        "results": results,
        "failures": failures,
    }
    print(json.dumps(summary, indent=2 if args.pretty else None, ensure_ascii=False))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
