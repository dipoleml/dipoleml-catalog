# coding: utf-8
"""Append ladders to ``questions.json``: ``python evals/millionaire/fetch_questions.py --ladders 5``.

The first Millionaire run fetches the file itself; this script adds more ladders to it. The questions are
CC BY-SA 4.0 (see NOTICE).
"""

from __future__ import annotations

import argparse
import json

from s1a.agents.millionaire import PER_DIFFICULTY, QUESTIONS, fetch_ladders


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ladders", type=int, required=True, help="how many new ladders to append")
    args = parser.parse_args()
    ladders = json.loads(QUESTIONS.read_text(encoding="utf-8")) if QUESTIONS.exists() else []
    ladders.extend(fetch_ladders(args.ladders))
    QUESTIONS.write_text(json.dumps(ladders, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(ladders)} ladders of {PER_DIFFICULTY * 3} questions in {QUESTIONS}")


if __name__ == "__main__":
    main()
