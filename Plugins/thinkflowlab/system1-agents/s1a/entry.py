# coding: utf-8
"""Console entry points: the ``s1a`` and ``s1a-mcp`` commands."""

from __future__ import annotations

from s1a import console  # first: routes the harness logs to files before openjiuwen loads and logs to the console
from s1a import cli, mcp_server


def s1a() -> None:
    console.utf8_console()
    cli.entry()


def s1a_mcp() -> None:
    console.utf8_console()
    mcp_server.main()
