# coding: utf-8
"""Agents by name: load a module's SPEC and run it through the front it belongs to."""

from __future__ import annotations

import argparse
import importlib
import pkgutil
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Any

from openjiuwen.core.runner import Runner

import s1a.agents
from s1a import rails
from s1a.browser import browse
from s1a.jobs import RESULTS_DIR, SHOWCASE_DIR
from s1a.spec import BrowserAgentSpec, Json, RailSpec, ToolAgentSpec
from s1a.tool import series

Spec = ToolAgentSpec | BrowserAgentSpec | RailSpec
EXTRAS = {"blackjack": "blackjack", "alfworld": "alfworld"}  # agent -> the extra that installs its packages


@asynccontextmanager
async def started_runner() -> AsyncIterator[None]:
    """The process-global Runner, started once by whichever entry point runs agents."""
    await Runner.start()
    try:
        yield
    finally:
        await Runner.stop()


class MissingPackage(RuntimeError):
    """An agent's optional package is not installed; the message names the package and the extra to install."""


class UnknownAgent(LookupError):
    """No module of that name under ``s1a.agents``; the message lists the registered names."""


@dataclass(frozen=True)
class Front:
    """One front: its label, the flag parser for a spec, and the play function that returns a JSON-able result."""

    label: str
    parser: Callable[..., argparse.ArgumentParser]
    play: Callable[..., Awaitable[Json]]


def _play_tool(spec: ToolAgentSpec, args: argparse.Namespace) -> Awaitable[Json]:
    return series.play(spec, args, results_dir=SHOWCASE_DIR if args.showcase else RESULTS_DIR)


def _play_rail(spec: RailSpec, args: argparse.Namespace) -> Awaitable[Json]:
    return rails.play(spec, args, results_dir=RESULTS_DIR)


FRONTS: dict[type, Front] = {
    ToolAgentSpec: Front("tool", series.parser, _play_tool),
    BrowserAgentSpec: Front("browser", browse.parser, browse.play),
    RailSpec: Front("rail", rails.parser, _play_rail),
}


def names() -> list[str]:
    """The registered agents, without importing them: every module under ``s1a.agents`` not starting with ``_``."""
    return sorted(m.name for m in pkgutil.iter_modules(s1a.agents.__path__) if not m.name.startswith("_"))


def load(name: str) -> Spec:
    """One agent's SPEC; a missing optional dependency fails here, loudly, and only for that agent."""
    if name not in names():
        raise UnknownAgent(f"unknown agent {name!r}; one of {', '.join(names())}")
    try:
        spec = importlib.import_module(f"s1a.agents.{name}").SPEC
    except ModuleNotFoundError as exc:
        extra = EXTRAS.get(name)
        hint = f": uv sync --extra {extra}" if extra else ""
        raise MissingPackage(f"agent {name!r} needs the {exc.name} package{hint}") from exc
    if type(spec) not in FRONTS:
        raise TypeError(f"s1a.agents.{name}.SPEC is a {type(spec).__name__}, not a spec")
    if spec.name != name:
        raise ValueError(f"s1a.agents.{name}.SPEC.name is {spec.name!r}; the name must be the module name")
    return spec


def flags(spec: Spec) -> list[dict[str, Any]]:
    """The agent's command-line options as data, for a host that never sees ``--help``."""
    rows: list[dict[str, Any]] = []
    for action in FRONTS[type(spec)].parser(spec)._actions:  # argparse keeps its actions private; the one read
        if not action.option_strings or action.option_strings == ["-h", "--help"]:
            continue
        takes_value = action.nargs != 0  # a store_true switch is passed alone; every other flag takes one value
        rows.append(
            {
                "flag": action.option_strings[-1],
                "takes_value": takes_value,
                "required": bool(action.required),
                "choices": list(action.choices) if action.choices else None,
                "default": str(action.default)
                if takes_value and action.default not in (None, argparse.SUPPRESS)
                else None,
                "help": action.help or "",
            }
        )
    return rows


async def run_by_name(name: str, argv: list[str]) -> Json:
    """One run inside an already started Runner: the summary with its job folder for a tool agent, the answer for a
    browser agent, the evaluation summary for a rail."""
    spec = load(name)
    front = FRONTS[type(spec)]
    return await front.play(spec, front.parser(spec).parse_args(argv))
