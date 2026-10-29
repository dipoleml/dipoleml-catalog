#!/usr/bin/env python3
"""Execute a signed Citadel operation plan through a pinned ROMA checkout.

The bridge is deliberately thin. Citadel owns policy and reconciliation; ROMA
owns decomposition and execution. The emitted observation separates configured
controls from modules that were actually exercised in the observed DAG.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
import time
import urllib.request
from dataclasses import asdict, is_dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List
from urllib.parse import urlparse


MODULE_NAMES = ("atomizer", "planner", "executor", "aggregator", "verifier")


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def load_input(path: Path) -> Dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    require(isinstance(payload, dict), "bridge input must be an object")
    require(set(payload) == {"schema", "plan", "task", "roma_root", "work_dir"}, "bridge input fields are invalid")
    require(payload["schema"] == 1, "bridge input schema is invalid")
    require(isinstance(payload["task"], str) and payload["task"], "task is invalid")
    plan = payload["plan"]
    require(isinstance(plan, dict), "plan is invalid")
    require(plan.get("schema") == 1, "plan schema is invalid")
    require(plan.get("policy_id") == "citadel-whole-operation", "plan policy is invalid")
    modules = plan.get("modules")
    require(isinstance(modules, list), "plan modules are invalid")
    require([module.get("name") for module in modules] == list(MODULE_NAMES), "plan module order is invalid")
    controls = plan.get("controls")
    require(isinstance(controls, dict), "plan controls are invalid")
    require(controls.get("tools") == [], "ROMA proof bridge does not permit external tools")
    for module in modules:
        endpoint = urlparse(module.get("endpoint", ""))
        require(endpoint.scheme == "http", "local model endpoint must use http")
        require(endpoint.hostname in {"127.0.0.1", "localhost"}, "local model endpoint must be loopback")
        require(module.get("provider") == "ollama", "ROMA proof bridge currently requires Ollama modules")
    return payload


def git_commit(root: Path) -> str:
    result = subprocess.run(
        ["git", "-c", f"safe.directory={root}", "rev-parse", "HEAD"],
        cwd=root,
        check=True,
        capture_output=True,
        text=True,
        timeout=30,
    )
    commit = result.stdout.strip().lower()
    require(len(commit) == 40 and all(character in "0123456789abcdef" for character in commit), "ROMA commit is invalid")
    return commit


def model_inventory(endpoint: str) -> List[Dict[str, str]]:
    with urllib.request.urlopen(f"{endpoint.rstrip('/')}/api/tags", timeout=10) as response:
        body = json.loads(response.read().decode("utf-8"))
    inventory = []
    for model in body.get("models", []):
        name = model.get("name") or model.get("model")
        digest = model.get("digest")
        if isinstance(name, str) and isinstance(digest, str) and len(digest) == 64:
            inventory.append({"name": name, "digest": f"sha256:{digest.lower()}"})
    return sorted(inventory, key=lambda item: item["name"])


def roma_model_name(model: str) -> str:
    return model if model.startswith("ollama_chat/") else f"ollama_chat/{model}"


def canonical_model_name(model: Any) -> Any:
    if not isinstance(model, str):
        return None
    return model.split("/")[-1]


def plain(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {str(key): plain(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set, frozenset)):
        return [plain(item) for item in value]
    if hasattr(value, "model_dump"):
        return plain(value.model_dump(mode="json"))
    if is_dataclass(value):
        return plain(asdict(value))
    if hasattr(value, "toDict"):
        return plain(value.toDict())
    if hasattr(value, "__dict__"):
        safe = {key: item for key, item in vars(value).items() if not key.startswith("_")}
        if safe:
            return plain(safe)
    return str(value)


def output_text(result: Any) -> str:
    converted = plain(result)
    if isinstance(converted, str):
        return converted
    return json.dumps(converted, ensure_ascii=False, sort_keys=True)


def enum_value(value: Any) -> str:
    raw = getattr(value, "value", value)
    return str(raw)


def agent_business_config(name: str, max_subtasks: int) -> Dict[str, Any]:
    if name == "atomizer":
        return {"confidence_threshold": 0.8}
    if name == "planner":
        return {"max_subtasks": max_subtasks}
    if name == "executor":
        return {"max_executions": 5}
    if name == "aggregator":
        return {"synthesis_strategy": "hierarchical"}
    return {"verification_depth": "moderate"}


def build_config(plan: Dict[str, Any], work_dir: Path):
    from roma_dspy.config import AgentConfig, AgentsConfig, LLMConfig, ROMAConfig, RuntimeConfig
    from roma_dspy.config.schemas.base import CacheConfig
    from roma_dspy.config.schemas.resilience import ResilienceConfig
    from roma_dspy.config.schemas.storage import StorageConfig

    controls = plan["controls"]
    agent_configs: Dict[str, AgentConfig] = {}
    for module in plan["modules"]:
        llm = LLMConfig(
            model=roma_model_name(module["model"]),
            temperature=0.0,
            max_tokens=controls["module_max_tokens"][module["name"]],
            timeout=controls["operation_timeout_seconds"],
            base_url=module["endpoint"],
            num_retries=controls["llm_retries"],
            cache=False,
            adapter_type="chat",
            use_native_function_calling=False,
        )
        agent_configs[module["name"]] = AgentConfig(
            llm=llm,
            prediction_strategy="chain_of_thought",
            toolkits=[],
            agent_config=agent_business_config(module["name"], controls["max_subtasks"]),
            strategy_config={},
            enabled=True,
        )

    cache_dir = work_dir / "dspy-cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    storage_dir = work_dir / "roma-storage"
    storage_dir.mkdir(parents=True, exist_ok=True)
    checkpoint_dir = work_dir / "checkpoints"

    return ROMAConfig(
        project="citadel-operation-control-proof",
        environment="testing",
        agents=AgentsConfig(**agent_configs),
        runtime=RuntimeConfig(
            max_concurrency=controls["max_concurrency"],
            timeout=controls["operation_timeout_seconds"],
            verbose=False,
            max_depth=controls["max_depth"],
            enable_logging=False,
            log_level="ERROR",
            cache=CacheConfig(
                enabled=False,
                enable_disk_cache=False,
                enable_memory_cache=False,
                disk_cache_dir=str(cache_dir),
                disk_size_limit_bytes=100_000_000,
                memory_max_entries=1000,
            ),
        ),
        resilience=ResilienceConfig(
            max_retries=controls["llm_retries"],
            checkpoint={
                "enabled": False,
                "storage_path": checkpoint_dir,
                "periodic_checkpoints_enabled": False,
            },
        ),
        storage=StorageConfig(base_path=str(storage_dir)),
    )


def configured_modules(solver: Any, plan: Dict[str, Any], inventory: Iterable[Dict[str, str]]) -> List[Dict[str, str]]:
    inventory_map = {item["name"].lower(): item["digest"] for item in inventory}
    observed: Dict[str, Dict[str, str]] = {}
    planned = {item["name"]: item for item in plan["modules"]}
    for agent_type, task_type, module in solver.registry.iter_agents():
        if task_type is not None:
            continue
        name = enum_value(agent_type).lower()
        if name not in planned or not hasattr(module, "get_model_config"):
            continue
        config = module.get_model_config(redact_secrets=True)
        model = canonical_model_name(config.get("model"))
        kwargs = config.get("kwargs") if isinstance(config.get("kwargs"), dict) else {}
        endpoint = kwargs.get("base_url") or planned[name]["endpoint"]
        observed[name] = {
            "name": name,
            "provider": "ollama",
            "model": model,
            "model_digest": inventory_map.get(str(model).lower(), f"sha256:{'0' * 64}"),
            "endpoint": endpoint,
        }
    return [observed.get(name, {
        "name": name,
        "provider": "unknown",
        "model": planned[name]["model"],
        "model_digest": f"sha256:{'0' * 64}",
        "endpoint": planned[name]["endpoint"],
    }) for name in MODULE_NAMES]


def observed_nodes(dag: Any) -> List[Dict[str, Any]]:
    tasks = list(dag.get_all_tasks(include_subgraphs=True)) if dag is not None else []
    tasks.sort(key=lambda task: (task.depth, str(getattr(task, "created_at", "")), task.goal, task.task_id))
    nodes = []
    for index, task in enumerate(tasks):
        modules = []
        for name, result in task.execution_history.items():
            metrics = result.token_metrics
            prompt = int(metrics.prompt_tokens) if metrics else 0
            completion = int(metrics.completion_tokens) if metrics else 0
            modules.append({
                "name": name,
                "model": canonical_model_name(metrics.model) if metrics else None,
                "prompt_tokens": prompt,
                "completion_tokens": completion,
                "total_tokens": prompt + completion,
                "duration_ms": max(0, int(round(float(result.duration or 0) * 1000))),
                "error": str(result.error)[:2048] if result.error else None,
            })
        modules.sort(key=lambda item: MODULE_NAMES.index(item["name"]) if item["name"] in MODULE_NAMES else len(MODULE_NAMES))
        nodes.append({
            "index": index,
            "depth": int(task.depth),
            "status": enum_value(task.status),
            "node_type": enum_value(task.node_type) if task.node_type is not None else None,
            "modules": modules,
        })
    return nodes


def provider_calls(solver: Any) -> List[Dict[str, Any]]:
    calls = []
    for agent_type, task_type, module in solver.registry.iter_agents():
        if task_type is not None or not hasattr(module, "lm"):
            continue
        name = enum_value(agent_type).lower()
        if name not in MODULE_NAMES:
            continue
        for entry in getattr(module.lm, "history", []):
            usage = entry.get("usage") if isinstance(entry.get("usage"), dict) else {}
            prompt = int(usage.get("prompt_tokens") or 0)
            completion = int(usage.get("completion_tokens") or 0)
            timestamp = str(entry.get("timestamp") or iso_now())
            if not timestamp.endswith("Z"):
                timestamp = f"{timestamp}Z"
            calls.append({
                "module": name,
                "model": str(entry.get("model")),
                "response_model": str(entry["response_model"]) if entry.get("response_model") else None,
                "prompt_tokens": prompt,
                "completion_tokens": completion,
                "total_tokens": prompt + completion,
                "timestamp": timestamp,
            })
    calls.sort(key=lambda item: (item["timestamp"], MODULE_NAMES.index(item["module"])))
    return calls


def configured_tools(solver: Any) -> List[Dict[str, str]]:
    tools = []
    for agent_type, task_type, module in solver.registry.iter_agents():
        if task_type is not None:
            continue
        name = enum_value(agent_type).lower()
        if name not in MODULE_NAMES:
            continue
        for toolkit in getattr(module.__class__, "MANDATORY_TOOLKIT_NAMES", []):
            tools.append({"module": name, "toolkit": str(toolkit), "kind": "mandatory-internal"})
        for config in getattr(module, "_toolkit_configs", []) or []:
            toolkit = getattr(config, "class_name", None)
            if toolkit:
                tools.append({"module": name, "toolkit": str(toolkit), "kind": "external-configured"})
    return sorted(tools, key=lambda item: (MODULE_NAMES.index(item["module"]), item["kind"], item["toolkit"]))


def observed_tool_calls(solver: Any) -> List[Dict[str, str]]:
    calls = []
    for agent_type, task_type, module in solver.registry.iter_agents():
        if task_type is not None or not hasattr(module, "lm"):
            continue
        module_name = enum_value(agent_type).lower()
        if module_name not in MODULE_NAMES:
            continue
        mandatory_names = {"register_artifact"} if "ArtifactToolkit" in getattr(module.__class__, "MANDATORY_TOOLKIT_NAMES", []) else set()
        for entry in getattr(module.lm, "history", []):
            response = plain(entry.get("response"))
            choices = response.get("choices", []) if isinstance(response, dict) else []
            for choice in choices:
                message = choice.get("message", {}) if isinstance(choice, dict) else {}
                for tool_call in message.get("tool_calls", []) or []:
                    function = tool_call.get("function", {}) if isinstance(tool_call, dict) else {}
                    name = function.get("name")
                    if not isinstance(name, str) or not name:
                        continue
                    calls.append({
                        "module": module_name,
                        "name": name,
                        "kind": "mandatory-internal" if name in mandatory_names else "external-configured",
                    })
    return calls


def totals(nodes: List[Dict[str, Any]], calls: List[Dict[str, Any]], dag: Any) -> Dict[str, int]:
    modules = [module for node in nodes for module in node["modules"]]
    retries = 0
    if dag is not None:
        retries = sum(int(task.metrics.retry_count) for task in dag.get_all_tasks(include_subgraphs=True))
    return {
        "node_count": len(nodes),
        "max_depth_observed": max((node["depth"] for node in nodes), default=0),
        "module_calls": len(modules),
        "provider_call_count": len(calls),
        "prompt_tokens": sum(call["prompt_tokens"] for call in calls),
        "completion_tokens": sum(call["completion_tokens"] for call in calls),
        "total_tokens": sum(call["total_tokens"] for call in calls),
        "retry_count": retries,
    }


def atomic_write(path: Path, value: Dict[str, Any]) -> None:
    temporary = path.with_name(f"{path.name}.tmp")
    temporary.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    temporary.replace(path)


def run(payload: Dict[str, Any], progress_path: Path) -> Dict[str, Any]:
    plan = payload["plan"]
    roma_root = Path(payload["roma_root"]).resolve(strict=True)
    work_dir = Path(payload["work_dir"]).resolve(strict=True)
    require(roma_root.is_dir(), "roma_root must be a directory")
    require(work_dir.is_dir(), "work_dir must be a directory")
    commit = git_commit(roma_root)
    require(commit == plan["stack"]["upstream_commit"], "ROMA checkout does not match signed plan")
    endpoint = plan["modules"][0]["endpoint"]
    inventory = model_inventory(endpoint)
    for module in plan["modules"]:
        match = next((item for item in inventory if item["name"].lower() == module["model"].lower()), None)
        require(match is not None, f"planned model is unavailable: {module['model']}")
        require(match["digest"] == module["model_digest"], f"planned model digest changed: {module['model']}")

    import_cache = work_dir / "dspy-import-cache"
    import_cache.mkdir(parents=True, exist_ok=True)
    os.environ["DSPY_CACHEDIR"] = str(import_cache)

    from loguru import logger
    logger.remove()
    logger.add(sys.stderr, level="WARNING")

    from roma_dspy.core.engine.solve import RecursiveSolver

    config = build_config(plan, work_dir)
    solver = RecursiveSolver(config=config, enable_logging=False, enable_checkpoints=False)
    configured = configured_modules(solver, plan, inventory)
    tool_inventory = configured_tools(solver)
    started_at = iso_now()
    started = time.perf_counter()

    def snapshot(status: str, result_text: Any, error: Any, include_nodes: bool) -> Dict[str, Any]:
        calls = provider_calls(solver)
        dag = solver.last_dag if include_nodes else None
        nodes = observed_nodes(dag) if dag is not None else []
        return {
            "schema": 1,
            "adapter_id": "roma-dspy-python",
            "upstream_commit": commit,
            "started_at": started_at,
            "duration_ms": max(0, int(round((time.perf_counter() - started) * 1000))),
            "status": status,
            "output_text": result_text,
            "applied_controls": plan["controls"],
            "configured_modules": configured,
            "configured_tools": tool_inventory,
            "tool_calls": observed_tool_calls(solver),
            "provider_calls": calls,
            "nodes": nodes,
            "totals": totals(nodes, calls, dag),
            "model_inventory": inventory,
            "error": error,
        }

    stop_heartbeat = threading.Event()

    def heartbeat() -> None:
        while not stop_heartbeat.wait(2.0):
            try:
                atomic_write(progress_path, snapshot("unknown", None, "execution_in_progress", False))
            except Exception:
                pass

    atomic_write(progress_path, snapshot("unknown", None, "execution_initializing", False))
    heartbeat_thread = threading.Thread(target=heartbeat, name="citadel-roma-receipt-heartbeat", daemon=True)
    heartbeat_thread.start()
    try:
        completed = solver.event_solve(
            payload["task"],
            concurrency=plan["controls"]["max_concurrency"],
        )
        status = "completed" if enum_value(completed.status).upper() == "COMPLETED" else "failed"
        final = snapshot(
            status,
            output_text(completed.result),
            None if status == "completed" else f"ROMA completed with status {enum_value(completed.status)}",
            True,
        )
    except Exception as error:
        final = snapshot("failed", None, f"{type(error).__name__}: {error}"[:4096], True)
    finally:
        stop_heartbeat.set()
        heartbeat_thread.join(timeout=3.0)
    atomic_write(progress_path, final)
    return final


def main() -> int:
    if len(sys.argv) != 3:
        raise ValueError("usage: roma-operation-bridge.py INPUT_JSON OUTPUT_JSON")
    input_path = Path(sys.argv[1]).resolve(strict=True)
    output_path = Path(sys.argv[2]).resolve()
    payload = load_input(input_path)
    run(payload, output_path)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:  # The parent runner records bounded stderr as failure evidence.
        print(f"ROMA operation bridge failed: {type(error).__name__}: {error}", file=sys.stderr)
        raise SystemExit(1)
