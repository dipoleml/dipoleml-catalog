"""PDF ユーティリティ（テキスト抽出・画像変換）."""

from __future__ import annotations

from pathlib import Path


def extract_text(*, file_path: str) -> dict:
    """pdfplumber で PDF からテキストを抽出する。

    ページ単位のテキストと全体テキストを返す。
    """
    path = Path(file_path)
    if not path.exists():
        return {"status": "error", "message": f"File not found: {file_path}"}
    if path.suffix.lower() != ".pdf":
        return {"status": "error", "message": f"Not a PDF file: {file_path}"}

    try:
        import pdfplumber

        pages: list[dict] = []
        with pdfplumber.open(file_path) as pdf:
            for i, page in enumerate(pdf.pages, start=1):
                page_text = page.extract_text() or ""
                pages.append({"page": i, "text": page_text})

        full_text = "\n".join(p["text"] for p in pages if p["text"])
        return {
            "status": "ok",
            "file_path": file_path,
            "total_pages": len(pages),
            "pages": pages,
            "full_text": full_text,
        }
    except Exception as e:
        return {"status": "error", "message": f"PDF read error: {e}"}


def to_images(*, file_path: str, output_dir: str, dpi: int = 200) -> dict:
    """pypdfium2 で PDF の各ページを PNG 画像に変換する。"""
    path = Path(file_path)
    if not path.exists():
        return {"status": "error", "message": f"File not found: {file_path}"}
    if path.suffix.lower() != ".pdf":
        return {"status": "error", "message": f"Not a PDF file: {file_path}"}

    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    try:
        import pypdfium2 as pdfium

        pdf = pdfium.PdfDocument(file_path)
        try:
            image_paths: list[str] = []
            stem = path.stem

            for i in range(len(pdf)):
                page = pdf[i]
                # scale = dpi / 72（PDF のデフォルト解像度は 72 DPI）
                scale = dpi / 72
                bitmap = page.render(scale=scale)
                pil_image = bitmap.to_pil()
                image_name = f"{stem}_page{i + 1}.png"
                image_path = out / image_name
                pil_image.save(str(image_path))
                image_paths.append(str(image_path))
        finally:
            pdf.close()
        return {
            "status": "ok",
            "file_path": file_path,
            "output_dir": output_dir,
            "total_pages": len(image_paths),
            "images": image_paths,
        }
    except Exception as e:
        return {"status": "error", "message": f"PDF to image error: {e}"}
