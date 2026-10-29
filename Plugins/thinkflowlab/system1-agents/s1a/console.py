# coding: utf-8
"""The process console: the harness logs go to files under ``S1A_HOME/runs/logs`` when this module is imported, and
stdout and stderr write UTF-8 on request, so stdout holds results and the MCP protocol, nothing else."""

from __future__ import annotations

import io
import logging
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from openjiuwen.core.common.logging.log_config import configure_log_config, log_config
from openjiuwen.core.common.logging.manager import LogManager

ROOT = Path(__file__).resolve().parents[1]
if not (ROOT / "pyproject.toml").is_file():  # site-packages: a wheel install has no evals/ data next to the package
    sys.exit(
        "s1a runs from a git checkout of system1-agents (git clone ... && uv sync); a wheel install has no evals/ data. "
        "See README.md, Install for development."
    )
load_dotenv(ROOT / ".env", override=False)  # S1A_HOME from the checkout's .env, before anything reads it
# config.HOME, restated: importing config imports openjiuwen, which logs to the console before the routing below
LOG_DIR = Path(os.environ.get("S1A_HOME") or ROOT) / "runs" / "logs"


def logs_to_files(log_dir: Path) -> None:
    """Every harness log type writes under ``log_dir``, nothing to the console, nothing to the root logger's handlers."""
    try:
        log_dir.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        sys.exit(f"s1a: cannot create the log folder {log_dir} ({exc}); set S1A_HOME to a writable folder")
    config = log_config.get_snapshot()
    config["log_path"] = f"{log_dir}/"
    for key in ("output", "interface_output", "performance_output"):
        config[key] = ["file"]
    configure_log_config(config)  # loggers already realised rebind on their next use
    # ponytail: the four built-in log types only; a custom log type created later keeps propagating
    for log_type in LogManager.get_all_loggers():
        logging.getLogger(log_type).propagate = False


def utf8_console() -> None:
    """Stdout and stderr write UTF-8 whatever the console code page.

    The result line is JSON with the page's own characters, and a Windows pipe defaults to the ANSI code page, which
    cannot encode a superscript two: the run would finish and the print would raise. The MCP transport wraps the
    binary buffer itself and is untouched.
    """
    for stream in (sys.stdout, sys.stderr):
        if isinstance(stream, io.TextIOWrapper):  # pytest's capture streams are TextIOWrappers too
            stream.reconfigure(encoding="utf-8")


logs_to_files(LOG_DIR)
