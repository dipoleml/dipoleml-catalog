/**
 * PDF 텍스트층이 정답 글을 담았나 — 모수 정책(pdf-text-gt·pdf-table-gt 공용)에만 쓴다.
 * 정답(HWPX/DOCX 평문) 글자 멀티셋 중 PDF 텍스트층(pdftotext) 글자로 채워지는 비율. 순서·칸 경계와 무관해 렌더 누락만 잡는다.
 */

import { execFile } from "node:child_process"
import { promisify } from "node:util"

const execFileP = promisify(execFile)

export async function pdftotextText(file) {
  for (const bin of ["/opt/homebrew/bin/pdftotext", "pdftotext"]) {
    try {
      return (await execFileP(bin, ["-enc", "UTF-8", "-q", file, "-"], { maxBuffer: 256 * 1024 * 1024 })).stdout
    } catch { /* 다음 후보 */ }
  }
  return null
}

export function layerCharRecall(refPlain, layerText) {
  const bag = new Map()
  for (const c of layerText.replace(/\s+/g, "").normalize("NFC")) bag.set(c, (bag.get(c) ?? 0) + 1)
  let hit = 0, n = 0
  for (const c of refPlain.replace(/\s+/g, "").normalize("NFC")) {
    n++
    const k = bag.get(c) ?? 0
    if (k > 0) { hit++; bag.set(c, k - 1) }
  }
  return n ? hit / n : 1
}
