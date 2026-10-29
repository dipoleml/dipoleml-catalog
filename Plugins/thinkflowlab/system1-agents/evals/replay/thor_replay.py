# coding: utf-8
"""Replay one ALFWorld trial's actions in AI2-THOR and save a frame per step under ``<trial>/agent/frames/``.

ALFWorld's ``AlfredThorEnv`` takes the text game's commands ("go to shelf 1", "take pencil 1 from desk 1") through
its oracle controller and renders the embodied scene the text game was generated from. The ``alfworld-visual`` extra
installs ``ai2thor==2.1.0`` (a 2019 Unity build, x86_64 on macOS, Rosetta on Apple silicon; ai2thor downloads the
400 MB build under ``~/.ai2thor`` on the first run) beside the ``alfworld`` extra.

    uv sync --extra alfworld-visual
    uv run python evals/replay/thor_replay.py evals/showcase/alfworld/<job>/<trial>

The trial's ``agent/episode.json`` names the game file (``extra.game_file``); ``traj_data.json`` beside it holds the
scene, looked up under ``ALFWORLD_DATA`` when the recorded path belongs to another machine. The first frame is the
start position; frame ``i`` follows action ``i`` of the acts the env played.
"""

from __future__ import annotations

import argparse
import json
import os
import queue
import sys
import time
from pathlib import Path

from evals.replay.trial import read_trial

try:
    import cv2
    from alfworld.agents.environment.alfred_thor_env import AlfredThorEnv
except ImportError as exc:  # alfworld re-raises a missing ai2thor as a plain ImportError
    raise SystemExit(f"evals/replay/thor_replay.py needs ai2thor ({exc}): uv sync --extra alfworld-visual") from exc

SCREEN = 600


def config(frames_dir: Path, max_steps: int) -> dict:
    return {
        "env": {
            "thor": {
                "screen_height": SCREEN,
                "screen_width": SCREEN,
                "smooth_nav": False,
                "save_frames_to_disk": False,
                "save_frames_path": str(frames_dir),
            },
            "goal_desc_human_anns_prob": 0.0,
        },
        "controller": {"type": "oracle", "load_receps": True, "debug": False},
        "general": {"training_method": "dagger"},
        "dagger": {"training": {"max_nb_steps_per_episode": max_steps}},
        "mask_rcnn": {"pretrained_model_path": ""},
    }


def resolve_task_file(game_file: str) -> Path:
    """``traj_data.json`` beside the recorded game file, or the same game under this machine's ``ALFWORLD_DATA``."""
    recorded = Path(game_file).parent / "traj_data.json"
    if recorded.is_file():
        return recorded
    parts = Path(game_file).parts
    data = os.environ.get("ALFWORLD_DATA")
    if data and "json_2.1.1" in parts:
        rebased = Path(data).joinpath(*parts[parts.index("json_2.1.1") :]).parent / "traj_data.json"
        if rebased.is_file():
            return rebased
    raise SystemExit(f"no traj_data.json at {recorded} or under ALFWORLD_DATA; pass --task-file <traj_data.json>")


def replay(trial: Path, *, frames_dir: Path, task_file: Path | None) -> int:
    """Replays the acts the env played; returns the number of frames written."""
    episode = json.loads((trial / "agent" / "episode.json").read_text(encoding="utf-8"))
    actions = [str(decision["key"]) for decision in read_trial(trial).decisions]
    if task_file is None:
        game_file = str(episode.get("extra", {}).get("game_file") or "")
        if not game_file:
            raise SystemExit("the trial records no game_file; pass --task-file <traj_data.json>")
        task_file = resolve_task_file(game_file)
    elif not task_file.is_file():
        raise SystemExit(f"no such file: {task_file}")
    frames_dir.mkdir(parents=True, exist_ok=True)
    started = time.time()
    thor = AlfredThorEnv.Thor(queue.Queue(), train_eval="eval")
    thor.init_env(config(frames_dir, len(actions) + 10))
    print(f"THOR up in {time.time() - started:.1f}s; {task_file}", flush=True)
    thor.reset(str(task_file))
    cv2.imwrite(str(frames_dir / "000.png"), thor.get_last_frame())
    written = 1
    for index, action in enumerate(actions, 1):
        thor.step(action)
        feedback, done, _commands, won, _progress, _expert = thor.get_results()
        cv2.imwrite(str(frames_dir / f"{index:03d}.png"), thor.get_last_frame())
        written += 1
        print(f"{index:>3} {action:<40} {str(feedback)[:60]!r} won={won}", flush=True)
        if done:
            break
    try:
        thor.env.stop()
    except Exception as exc:  # noqa: BLE001  # the Unity process may already be gone
        print(f"stop: {exc}", file=sys.stderr)
    return written


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("trial", type=Path, help="a trial folder with agent/episode.json")
    parser.add_argument("--task-file", type=Path, default=None, help="traj_data.json, when the trial names no game")
    parser.add_argument("--frames-dir", type=Path, default=None, help="default: <trial>/agent/frames")
    args = parser.parse_args()
    frames_dir = args.frames_dir or args.trial / "agent" / "frames"
    print(f"{replay(args.trial, frames_dir=frames_dir, task_file=args.task_file)} frames in {frames_dir}")


if __name__ == "__main__":
    main()
