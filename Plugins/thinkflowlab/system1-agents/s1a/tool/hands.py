# coding: utf-8
"""Eyes and hands for page games: openJiuwen's Playwright runtime for navigate, evaluate and key presses."""

from __future__ import annotations

import asyncio
import functools
import http.server
import json
import shutil
import socketserver
import threading
from contextlib import AbstractAsyncContextManager, asynccontextmanager
from pathlib import Path
from typing import Any, AsyncIterator, Protocol

from openjiuwen.harness.tools.browser_move.playwright_runtime.browser_capabilities import CORE_BROWSER_TOOL_NAMES
from openjiuwen.harness.tools.browser_move.playwright_runtime.config import (
    BrowserInstanceConfig,
    build_browser_guardrails,
    build_playwright_mcp_config,
)
from openjiuwen.harness.tools.browser_move.playwright_runtime.runtime import BrowserAgentRuntime

from s1a.config import browser_launch_args


class _QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: Any) -> None:
        return None


class _Server(socketserver.TCPServer):
    allow_reuse_address = True


def serve_static(directory: Path) -> _Server:
    """Serve a directory on 127.0.0.1 from a daemon thread on a free port (``server_address[1]``); see ``serving``."""
    server = _Server(("127.0.0.1", 0), functools.partial(_QuietHandler, directory=str(directory)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


@asynccontextmanager
async def serving(server: _Server, session: AbstractAsyncContextManager[None]) -> AsyncIterator[None]:
    """``session`` while ``server`` is up; the server is shut down however the session ends."""
    try:
        async with session:
            yield
    finally:
        await asyncio.to_thread(server.shutdown)
        server.server_close()


class Hands(Protocol):
    """What a page game needs from the browser; ``BrowserHands`` is the runtime-backed one."""

    async def wait_ready(self, selector: str, timeout_s: float) -> None: ...
    async def read(self, source: str, args: Any) -> Any: ...
    async def press(self, key: str) -> None: ...
    async def frame(self, path: Path) -> None: ...


class BrowserHands:
    """navigate, read JSON from the page, press keys. No chat model is ever called."""

    def __init__(self, *, headless: bool) -> None:
        # The runtime validates model settings at start; the games never make a chat call.
        self.runtime = BrowserAgentRuntime(
            provider="openai",
            api_key="unused",
            api_base="https://api.openai.com/v1",
            model_name="unused",
            mcp_cfg=build_playwright_mcp_config(BrowserInstanceConfig(launch_args=browser_launch_args(headless))),
            guardrails=build_browser_guardrails(),
            instance=None,
            allowed_tool_names=CORE_BROWSER_TOOL_NAMES,
        )

    async def start(self, url: str, *, ready_selector: str, timeout_s: float) -> None:
        """Needs a started ``Runner``; the caller owns the Runner's lifetime."""
        await self.runtime.acquire_task_resources()
        await self.runtime.ensure_started()
        # ponytail: _call_playwright_tool and _execute_probe_json are private; public navigate, evaluate and
        # press on the runtime is the upstream ask.
        await self.runtime._call_playwright_tool("browser_navigate", {"url": url})
        await self.wait_ready(ready_selector, timeout_s)

    async def wait_ready(self, selector: str, timeout_s: float) -> None:
        """Poll until the document is complete and ``selector`` exists; navigate returns before load."""
        probe = f"(args) => document.readyState === 'complete' && !!document.querySelector({selector!r})"
        deadline = asyncio.get_event_loop().time() + timeout_s
        last: RuntimeError | None = None
        while True:
            try:
                if await self.read(probe, {}) is True:
                    return
            except RuntimeError as exc:
                last = exc
            if asyncio.get_event_loop().time() > deadline:
                raise RuntimeError(f"page not ready within {timeout_s}s: {selector}") from last
            await asyncio.sleep(0.2)

    async def read(self, source: str, args: Any) -> Any:
        """Evaluate a page function ``(args) => ...`` with ``args`` (JSON); a JSON string result is decoded."""
        code = f"async (page) => ({{ value: await page.evaluate(({source}), {json.dumps(args)}) }})"
        parsed, _audit, _retries = await self.runtime._execute_probe_json(code, artifact_kind="evals_read")
        if "value" not in parsed:
            raise RuntimeError(f"evaluate failed: {parsed}")
        value = parsed["value"]
        if isinstance(value, str):
            try:
                return json.loads(value)
            except ValueError:
                return value
        return value

    async def press(self, key: str) -> None:
        await self.runtime._call_playwright_tool("browser_press_key", {"key": key})

    async def frame(self, path: Path) -> None:
        """One PNG of the whole page at ``path``, written by the browser process; headless or headed alike."""
        code = (
            f"async (page) => {{ await page.screenshot({{ path: {json.dumps(str(path))}, type: 'png', fullPage: true }}); "
            "return { ok: true }; }"
        )
        parsed, _audit, _retries = await self.runtime._execute_probe_json(code, artifact_kind="evals_frame")
        if parsed.get("ok") is not True:
            raise RuntimeError(f"frame failed: {parsed}")

    async def stop(self) -> None:
        await self.runtime.release_task_resources()
        await self.runtime.shutdown()

    @asynccontextmanager
    async def session(self, url: str, *, ready_selector: str, timeout_s: float) -> AsyncIterator[None]:
        """``start`` on entry, ``stop`` on exit, also after a failed start; runs inside a started ``Runner``."""
        try:
            await self.start(url, ready_selector=ready_selector, timeout_s=timeout_s)
            yield
        finally:
            await self.stop()


class Frames:
    """Numbered PNGs of one episode in one directory: ``reset`` empties it and takes frame 000, ``take`` the next."""

    def __init__(self, hands: Hands, directory: Path) -> None:
        self._hands = hands
        self.directory = directory
        self._count = 0

    async def reset(self) -> None:
        shutil.rmtree(self.directory, ignore_errors=True)
        self.directory.mkdir(parents=True)
        self._count = 0
        await self.take()

    async def take(self) -> None:
        await self._hands.frame(self.directory / f"{self._count:03d}.png")
        self._count += 1
