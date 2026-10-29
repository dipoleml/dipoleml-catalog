#!/usr/bin/env python3
"""HwpForge HWPX/HWP → Markdown 예측 생성기 (측정용 — 게이트 아님, 제품 의존성 아님).

사용법:
    python3 -m venv .venv-hwpforge && .venv-hwpforge/bin/pip install hwpforge==0.16.6
    .venv-hwpforge/bin/python bench/hwpforge-bench.py <출력 디렉토리>
    node bench/compare-md-parsers.mjs <출력 디렉토리>

bench/corpus 아래 .hwpx 는 Document.open().to_md("lossy"), .hwp(HWP5) 는 convert_hwp5().document.to_md("lossy")
로 옮겨 <출력>/<코퍼스 상대경로>.md 에 쓴다. 실패는 <상대경로>.err 에 사유를 남기고 빈 결과로 센다.
"""

import sys
import time
from pathlib import Path

import hwpforge

ROOT = Path(__file__).resolve().parent / "corpus"


def to_md(path: Path) -> str:
    if path.suffix.lower() == ".hwpx":
        doc = hwpforge.Document.open(str(path))
    else:
        doc = hwpforge.convert_hwp5(path.read_bytes()).document
    result = doc.to_md(mode="lossy")
    return result.text if hasattr(result, "text") else str(result)


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit("사용법: python bench/hwpforge-bench.py <출력 디렉토리>")
    out = Path(sys.argv[1])
    files = sorted(p for p in ROOT.rglob("*") if p.suffix.lower() in (".hwpx", ".hwp") and p.is_file())
    ok = fail = 0
    t0 = time.perf_counter()
    for path in files:
        rel = path.relative_to(ROOT)
        dest = out / (str(rel) + ".md")
        dest.parent.mkdir(parents=True, exist_ok=True)
        try:
            dest.write_text(to_md(path), encoding="utf-8")
            ok += 1
        except Exception as exc:  # noqa: BLE001 — 실패 사유만 기록하고 다음 파일로
            dest.write_text("", encoding="utf-8")
            (out / (str(rel) + ".err")).write_text(f"{type(exc).__name__}: {exc}"[:500], encoding="utf-8")
            fail += 1
    print(f"hwpforge {hwpforge.__version__ if hasattr(hwpforge, '__version__') else ''} ok={ok} fail={fail} "
          f"elapsed={time.perf_counter() - t0:.1f}s → {out}")


if __name__ == "__main__":
    main()
