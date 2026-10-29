"""PDF ユーティリティ CLI."""

from __future__ import annotations

import argparse
import json
import sys

from shinkoku.tools.pdf import extract_text, to_images


def _output(result: dict) -> None:
    json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
    print()
    if result.get("status") == "error":
        sys.exit(1)


def cmd_extract_text(args: argparse.Namespace) -> None:
    _output(extract_text(file_path=args.file_path))


def cmd_to_image(args: argparse.Namespace) -> None:
    _output(to_images(file_path=args.file_path, output_dir=args.output_dir, dpi=args.dpi))


def register(parent_subparsers: argparse._SubParsersAction) -> None:
    """pdf サブコマンドを親パーサーに登録する。"""
    parser = parent_subparsers.add_parser(
        "pdf",
        description="PDF ユーティリティ CLI",
        help="PDF テキスト抽出・画像変換",
    )
    sub = parser.add_subparsers(dest="subcommand")

    # extract-text
    p = sub.add_parser("extract-text", help="PDF からテキストを抽出する")
    p.add_argument("--file-path", required=True)
    p.set_defaults(func=cmd_extract_text)

    # to-image
    p = sub.add_parser("to-image", help="PDF の各ページを PNG 画像に変換する")
    p.add_argument("--file-path", required=True)
    p.add_argument("--output-dir", required=True)
    p.add_argument("--dpi", type=int, default=200)
    p.set_defaults(func=cmd_to_image)

    parser.set_defaults(func=lambda args: parser.print_help() or sys.exit(1))
