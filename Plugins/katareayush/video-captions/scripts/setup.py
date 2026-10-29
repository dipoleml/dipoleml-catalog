#!/usr/bin/env python3
"""One-shot, cross-platform setup for the video-captions skill.

Makes sure three things are ready:
  1. faster-whisper (pip)                -> speech-to-text
  2. an ffmpeg build WITH libass         -> burning styled subtitles
  3. a `video-captions` launcher on PATH -> one command every agent can call

On macOS the default Homebrew `ffmpeg` lacks libass, so this installs `ffmpeg-full`
automatically. Windows/Linux ffmpeg builds already include libass.

The Whisper model downloads itself on first use, so there is nothing to fetch here.
Safe to run repeatedly.
"""
import os
import platform
import shutil
import stat
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from ffmpeg_tools import find_ffmpeg


def module_available(name):
    try:
        __import__(name)
        return True
    except ImportError:
        return False


def ensure_faster_whisper():
    if module_available("faster_whisper"):
        print("[ok] faster-whisper installed")
        return
    print("Installing faster-whisper (pip)...")
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "faster-whisper"], check=True)
        print("[ok] faster-whisper installed")
    except subprocess.CalledProcessError:
        print(f"[!!] Failed. Run manually: {sys.executable} -m pip install faster-whisper")


def ensure_ffmpeg():
    ffmpeg, _ = find_ffmpeg()
    if ffmpeg:
        print(f"[ok] ffmpeg with subtitle support: {ffmpeg}")
        return

    system = platform.system()
    if system == "Darwin" and shutil.which("brew"):
        print("ffmpeg is missing libass. Installing ffmpeg-full via Homebrew...")
        try:
            subprocess.run(["brew", "install", "ffmpeg-full"], check=True)
        except subprocess.CalledProcessError:
            print("[!!] brew install ffmpeg-full failed. Run it manually.")
        if find_ffmpeg()[0]:
            print("[ok] ffmpeg-full installed with subtitle support")
        else:
            print("[!!] Still no subtitle-capable ffmpeg found.")
        return

    hints = {
        "Darwin": "brew install ffmpeg-full",
        "Windows": "winget install Gyan.FFmpeg   (or: choco install ffmpeg-full)",
        "Linux": "sudo apt install ffmpeg",
    }
    print("[!!] No ffmpeg with subtitle support found. Install one:")
    print(f"     {hints.get(system, 'install a full ffmpeg build (with libass)')}")


def bin_dir():
    """Where to drop the launcher, per-platform, without needing admin rights."""
    if platform.system() == "Windows":
        return Path(os.environ.get("LOCALAPPDATA", Path.home())) / "video-captions" / "bin"
    return Path.home() / ".local" / "bin"


def ensure_launcher():
    """Put a `video-captions` command on PATH pointing at this checkout's caption.py.

    This is what makes the skill host-agnostic: Claude Code expands
    ${CLAUDE_PLUGIN_ROOT} and Gemini expands ${extensionPath}, but Codex, Copilot,
    Cursor and friends expand neither. A real command sidesteps all of it.
    """
    caption = HERE / "caption.py"
    target = bin_dir()
    target.mkdir(parents=True, exist_ok=True)

    if platform.system() == "Windows":
        launcher = target / "video-captions.cmd"
        launcher.write_text(
            f'@echo off\r\n"{sys.executable}" "{caption}" %*\r\n', encoding="utf-8"
        )
    else:
        launcher = target / "video-captions"
        launcher.write_text(
            f'#!/bin/sh\nexec "{sys.executable}" "{caption}" "$@"\n', encoding="utf-8"
        )
        launcher.chmod(launcher.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)

    print(f"[ok] launcher installed: {launcher}")
    if not shutil.which("video-captions"):
        print(f"[!!] {target} is not on your PATH. Add it:")
        if platform.system() == "Windows":
            print(f'     setx PATH "%PATH%;{target}"')
        else:
            print(f'     echo \'export PATH="{target}:$PATH"\' >> ~/.zshrc && exec zsh')
        print("     (Until then, agents fall back to calling caption.py by path — still works.)")


def main():
    print(f"Python {sys.version.split()[0]} on {platform.system()}\n")
    ensure_faster_whisper()
    ensure_ffmpeg()
    ensure_launcher()
    print("\nReady. The Whisper model downloads automatically the first time you caption a video.")


if __name__ == "__main__":
    main()
