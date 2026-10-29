/**
 * 가로 쪽 두 쪽 모아찍기(2-up) — 서식 두 쪽을 가로 한 면에 나란히 찍은 쪽(행정업무운영 편람 부록 별지 서식)은 왼쪽 쪽을 다 읽고
 * 오른쪽 쪽을 읽는다. 블록은 쪽 위→아래로 서 있어, 오른쪽 서식 표의 윗변이 왼쪽 서식 제목보다 높으면 오른쪽 표가 먼저 나왔다.
 * 가로 쪽이고, 가운데 띠를 가로지르는 블록이 없고(쪽 번호 꼴 제외), 좌우 반쪽 모두 쪽 높이 절반 넘게 내용이 찰 때만 좌 → 우로 다시 선다
 */

import type { IRBlock } from "../types.js"

export function orderTwoUpPage(blocks: IRBlock[], pageWidth: number, pageHeight: number): IRBlock[] {
  if (pageWidth < pageHeight * 1.2 || blocks.length < 2) return blocks
  const mid = pageWidth / 2, tol = pageWidth * 0.01
  const left: IRBlock[] = [], right: IRBlock[] = [], rest: IRBlock[] = []
  for (const b of blocks) {
    if (!b.bbox) return blocks
    if (b.type === "paragraph" && /^[-–—－\s\d]+$/.test(b.text ?? "")) rest.push(b)
    else if (b.bbox.x + b.bbox.width <= mid + tol) left.push(b)
    else if (b.bbox.x >= mid - tol) right.push(b)
    else return blocks
  }
  const span = (bs: IRBlock[]) => Math.max(...bs.map(b => b.bbox!.y + b.bbox!.height)) - Math.min(...bs.map(b => b.bbox!.y))
  if (!left.length || !right.length || span(left) < pageHeight * 0.5 || span(right) < pageHeight * 0.5) return blocks
  return [...left, ...right, ...rest]
}
