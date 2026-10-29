# coding: utf-8
"""Dollars per episode: Jev's list price for its input tokens, the chat model's price from OpenRouter's catalogue."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx
from openjiuwen.core.common.logging import logger

from s1a.config import first_env

JEV_USD_PER_INPUT_TOKEN = 0.042 / 1_000_000  # TypeSafe's list price; output tokens are free
OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"


ENV_PRICES = ("CHAT_USD_PER_M_INPUT", "CHAT_USD_PER_M_OUTPUT", "CHAT_USD_PER_M_CACHED_INPUT")


@dataclass(frozen=True)
class ChatPrices:
    usd_per_input_token: float
    usd_per_output_token: float
    usd_per_cached_input_token: float


PRICE_CACHE: dict[str, ChatPrices] = {}  # catalogue prices by model name; a failed lookup is retried on the next call


def prices_from_rows(rows: list[dict[str, Any]], model_name: str) -> ChatPrices | None:
    """The catalogue row whose id is ``model_name`` or ends in ``/model_name``; None when absent."""
    for row in rows:
        row_id = str(row.get("id") or "")
        if row_id == model_name or row_id.endswith("/" + model_name):
            pricing = row.get("pricing") or {}
            prompt = float(pricing.get("prompt") or 0.0)
            return ChatPrices(
                prompt, float(pricing.get("completion") or 0.0), float(pricing.get("input_cache_read") or prompt)
            )
    return None


def env_prices() -> ChatPrices | None:
    """``CHAT_USD_PER_M_INPUT`` and ``CHAT_USD_PER_M_OUTPUT`` together, ``CHAT_USD_PER_M_CACHED_INPUT`` optional; None when unset."""
    per_m_in, per_m_out, per_m_cached = (first_env(name) for name in ENV_PRICES)
    if not (per_m_in or per_m_out or per_m_cached):
        return None
    if not (per_m_in and per_m_out):
        raise ValueError(f"set both {ENV_PRICES[0]} and {ENV_PRICES[1]} (dollars per million tokens), or neither")
    try:
        return ChatPrices(
            float(per_m_in) / 1_000_000, float(per_m_out) / 1_000_000, float(per_m_cached or per_m_in) / 1_000_000
        )
    except ValueError as exc:
        raise ValueError(f"{'/'.join(ENV_PRICES)} must be numbers: {exc}") from exc


def chat_prices(model_name: str) -> ChatPrices | None:
    """The ``CHAT_USD_PER_M_*`` variables when set; otherwise OpenRouter's public catalogue."""
    prices = env_prices()
    if prices is not None:
        return prices
    if not model_name:
        return None
    if model_name in PRICE_CACHE:
        return PRICE_CACHE[model_name]
    try:
        rows = httpx.get(OPENROUTER_MODELS_URL, timeout=10.0).json().get("data") or []
    except (httpx.HTTPError, ValueError, AttributeError):
        logger.warning("[pricing] OpenRouter catalogue unavailable; cost_usd stays unknown", exc_info=True)
        return None
    prices = prices_from_rows(rows, model_name)
    if prices is None:
        logger.warning("[pricing] %s is not in OpenRouter's catalogue; cost_usd stays unknown", model_name)
        return None
    PRICE_CACHE[model_name] = prices
    return prices


def cost_usd(
    jev_input_tokens: int,
    chat_input_tokens: int,
    chat_output_tokens: int,
    chat_cached_tokens: int,
    prices: ChatPrices | None,
) -> float | None:
    """Dollars for one episode; the cached part of the input at the cache rate; None when chat tokens were spent and the price is unknown."""
    jev = jev_input_tokens * JEV_USD_PER_INPUT_TOKEN
    if chat_input_tokens + chat_output_tokens == 0:
        return round(jev, 6)
    if prices is None:
        return None
    cached = min(chat_cached_tokens, chat_input_tokens)
    return round(
        jev
        + (chat_input_tokens - cached) * prices.usd_per_input_token
        + cached * prices.usd_per_cached_input_token
        + chat_output_tokens * prices.usd_per_output_token,
        6,
    )
