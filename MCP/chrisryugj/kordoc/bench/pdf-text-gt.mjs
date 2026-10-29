// PDF 글 정답지 벤치 — 같은 문서 hwpx↔pdf 쌍에서 HWPX 파싱 글을 정답으로 PDF 파싱 글의 재현율·정밀도·읽기 순서·띄어쓰기를 잰다 (bench:gate 무후퇴 플로어).
//
// 기존 PDF 트랙(score.mjs pdf_cross_coverage)은 pdftotext∩pdfjs 합의 3-gram 대비 커버리지라 두 추출기가 같이 틀린 곳은 못 보고,
// 공백을 지우고 3-gram 가방으로 대조해 순서·띄어쓰기는 원리적으로 못 본다. 원본 HWPX 가 있는 쌍(pdf-table-gt 와 같은 모수)은 참 글을 준다.
//
// 지표 (문서 합산 micro)
//   recall    : HWPX 줄 유닛(공백 뺀 4자 이상)이 PDF 출력에 있는 비율 — score.mjs HWP5 쌍 트랙과 같은 정렬(alignUnits, 부분 매칭 3자 조각)
//   precision : PDF 줄 유닛이 HWPX 출력에 있는 비율 — HWPX 본문에 없는 글(남은 머리말·쪽 표시·그림 속 글)이 섞이면 깎인다
//   order     : 온전히 매칭된 HWPX 유닛의 PDF 출력 위치 시퀀스 LIS / 그 유닛 수 — 읽기 순서(2단·표 칸 순회)
//               같은 글이 여러 번 나오는 유닛은 등장 자리 중 순서가 맞는 곳을 고른다(선택지 LIS, 2026-09-28 채점 기준 변경 — orderLis).
//               글자·숫자 없는 유닛(마스킹·줄)은 순서 모수에서 뺀다(score.mjs 와 같은 정책, 같은 날 변경)
//   spaceF1   : 어절(공백 단위 토큰) multiset F1 — 글자는 같아도 띄어쓰기가 틀리면 깎인다("2 0 , 7 7 5", 줄 이음 공백 누락)
// 양쪽 평문에서 줄 머리 목록 표지("- ")와 각주 감싸개 "(주: …)" 괄호는 걷는다 — 마크업이다(2026-09-28 채점 기준 변경)
// 양쪽 정규화는 같다(mdToPlain → normText). 머리말·꼬리말은 HWPX 파서가 1회만 내고(본문 앞뒤) PDF 파서는 반복을 지우는 정책 차라
// 양쪽 유닛·어절에서 같이 뺀다(참조 추출기 specials.headers/footers). 각주는 HWPX 가 문단 줄 안 "(주: …)", PDF 는 쪽 아래라
// 재현율·정밀도는 조각 매칭이 흡수하고 순서만 조금 깎는다.
// 제외: PDF 텍스트층 한글이 HWPX 한글의 1% 미만인 쌍(글자를 곡선 경로로 그림 — OCR 대상, pdftotext 로 판정). 목록은 출력·JSON 에 남긴다.
//
// lo-pairs(2026-09-24 v4.15): 공공·학술 DOCX 를 LibreOffice 26.2 로 PDF 로 뽑은 짝 — 비한컴 제작기 PDF 를 DOCX 파싱 글(formats 트랙이
// 원본 XML 로 검증하는 파서) 정답으로 잰다. 머리글·바닥글은 DOCX 파서가 안 내므로 word/header*·footer* 글을 양쪽에서 같이 뺀다.
// 사용법: node bench/pdf-text-gt.mjs [--gate] [--doc=부분문자열] [--sets=pairs,korea-kr,korea-kr-pairs,korea-kr-pairs2,rhwp,lo-pairs] [--verbose]
// 산출: bench/out/pdf-text.json. --gate: 무후퇴 플로어(GATES) 미달 시 exit 1 (부분 실행 --doc 은 보고만)

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises"
import { join, relative, basename } from "node:path"
import { fileURLToPath } from "node:url"
import { execFile } from "node:child_process"
import { pdftotextText, layerCharRecall } from "./lib/pdf-layer.mjs"
import { promisify } from "node:util"
import { parse } from "../dist/index.js"
import { extractRef } from "./ref/hwpx-ref.mjs"
import JSZip from "jszip"
import { normKey, normText, mdToPlain } from "./lib/normalize.mjs"
import { alignUnits } from "./lib/align.mjs"

const execFileP = promisify(execFile)
const root = fileURLToPath(new URL(".", import.meta.url))
const args = process.argv.slice(2)
const verbose = args.includes("--verbose")
const gateMode = args.includes("--gate")
// 무후퇴 플로어 — 2026-09-24 읽기 품질 2차(줄 꺾임 이음·비한컴 선 표·자간 숫자) 뒤 417쌍 실측
// recall 0.99359·precision 0.96072·order 0.97652·spaceF1 0.97069 바로 아래. 모수 하한은 pdf-table-gt 와 같은 여유 비율
// v4.15.0: 751쌍 실측 .99446/.96933/.97672/.97799. 기존 세트 지표 무후퇴 확인 후 상향.
// 새 세트의 정답지 부족 1쌍 제외 효과와 파서의 띄어쓰기 개선 효과는 별도로 보고한다.
// 2026-09-28(채점 기준 변경 뒤): 751쌍 실측 .99699/.99471/.99094/.98556 바로 아래로 상향
// 2026-09-28 텍스트층 글 누락 제외(7쌍, 채점 기준 변경) 뒤 744쌍 실측 .99814/.99527/.99116/.98713 바로 아래로 상향
const GATES = { recall: 0.9978, precision: 0.9950, order: 0.9909, spaceF1: 0.9868, parseErrors: 0, minPairs: 744 }
const flagValue = (k, d) => (args.find(a => a.startsWith(`--${k}=`)) ?? "").split("=")[1] || d
const docFilter = flagValue("doc", null)
const SETS = flagValue("sets", "pairs,korea-kr,korea-kr-pairs,korea-kr-pairs2,rhwp,lo-pairs").split(",").filter(Boolean)
const round = (x, d = 5) => (x === null || x === undefined ? null : +x.toFixed(d))

async function* walkFiles(d) {
  let entries
  try { entries = await readdir(d, { withFileTypes: true }) } catch { return }
  for (const e of entries) {
    const p = join(d, e.name)
    if (e.isDirectory()) yield* walkFiles(p)
    else yield p
  }
}

const corpusRoot = join(root, "corpus")
const pairs = []
for (const set of SETS) {
  const files = new Set()
  for await (const f of walkFiles(join(corpusRoot, set))) files.add(f)
  for (const f of files) {
    if (!f.endsWith(".pdf")) continue
    const base = f.slice(0, -4)
    // 정답 원본: HWPX(한컴 PDF 짝) 또는 DOCX(lo-pairs: LibreOffice 로 뽑은 비한컴 PDF 짝)
    const gtExt = files.has(base + ".hwpx") ? ".hwpx" : files.has(base + ".docx") ? ".docx" : null
    if (!gtExt) continue
    const rel = relative(corpusRoot, base)
    if (docFilter && !rel.includes(docFilter)) continue
    pairs.push({ set, base, rel, gtExt })
  }
}
pairs.sort((a, b) => a.rel.localeCompare(b.rel))

const hangulCount = s => (s.match(/[가-힣]/g) ?? []).length

/** PDF 텍스트층(pdftotext) 한글 자수·공백 뺀 글자 수 — 둘 다 모수 정책(아래 제외 규칙)에만 쓴다 */
async function pdftotextCounts(file) {
  for (const bin of ["/opt/homebrew/bin/pdftotext", "pdftotext"]) {
    try {
      const { stdout } = await execFileP(bin, ["-enc", "UTF-8", "-q", file, "-"], { maxBuffer: 256 * 1024 * 1024 })
      return { hangul: hangulCount(stdout), chars: stdout.replace(/\s+/g, "").length }
    } catch { /* 다음 후보 */ }
  }
  return null
}

/** 평문 → 줄 유닛 (공백 제거 4자 이상, 머리말·꼬리말 줄 제외) */
function lineUnits(plain, chrome) {
  const out = []
  for (const line of plain.split(/\n+/)) {
    const k = normKey(line)
    if (k.length < 4 || chrome.has(k)) continue
    out.push({ id: out.length, kind: "x", text: k })
  }
  return out
}

/** 평문 → 어절 multiset (머리말·꼬리말 줄 제외, 글자·숫자 없는 토큰 제외) */
function wordBag(plain, chrome) {
  const bag = new Map()
  for (const line of plain.split(/\n+/)) {
    if (chrome.has(normKey(line))) continue
    for (const w of normText(line).split(" ")) {
      if (!/[\p{L}\p{N}]/u.test(w)) continue
      bag.set(w, (bag.get(w) ?? 0) + 1)
    }
  }
  return bag
}

function bagOverlap(a, b) {
  let inter = 0, na = 0, nb = 0
  for (const [k, n] of a) { na += n; inter += Math.min(n, b.get(k) ?? 0) }
  for (const [, n] of b) nb += n
  return { inter, na, nb }
}

function coverage(units, targetKey) {
  const { perUnit } = alignUnits(units, targetKey)
  let matched = 0, total = 0
  const whole = [] // 온전히 매칭된 유닛의 위치 (문서 순서)
  const wholeText = [] // 그 유닛의 글 — 같은 글이 여러 번 나오면 순서 채점이 등장 자리를 고른다 (orderLis)
  const misses = []
  for (const r of perUnit) {
    matched += r.matched; total += r.total
    if (r.total && r.matched === r.total && r.pos >= 0) { whole.push(r.pos); wholeText.push(units[perUnit.indexOf(r)].text) }
    else if (r.total && r.matched < r.total && r.missSnippet) misses.push(r.missSnippet)
  }
  return { matched, total, whole, wholeText, misses }
}

/**
 * 각주 감싸개 걷기 — kordoc 은 각주를 참조 문단 끝에 " (주: …)" 로 끼운다(HWPX·HWP5·PDF 공통 마크업). 감싸개 괄호는 원문 글이 아니라
 * 첫·끝 어절에 붙어 한쪽만 각주를 끼운 문서(PDF 가 각주를 질문 아래에 찍은 SO-SUEOP: "있다.)" 대 "있다.")의 어절을 깎았다.
 * "(주: " 와 짝이 맞는 ")" 만 지우고 각주 글은 남긴다 (2026-09-28 채점 기준 변경)
 */
function unwrapNotes(md) {
  // 감싸개는 문단·칸 끝에 붙는다 — 같은 줄에서 다음 감싸개·칸 경계 앞의 마지막 ")" 가 닫는 괄호("(주: 1) 글 (괄호) 끝.)" 의 번호 ")" 는 아님)
  let out = "", i = 0
  for (let at = md.indexOf("(주: "); at >= 0; at = md.indexOf("(주: ", i)) {
    out += md.slice(i, at) + " "
    const rest = md.slice(at + 4)
    const bound = rest.search(/\(주: |\n| \||<br|<\/t[dh]>/)
    const seg = bound < 0 ? rest : rest.slice(0, bound)
    const close = seg.lastIndexOf(")")
    out += close < 0 ? seg : seg.slice(0, close) + " " + seg.slice(close + 1)
    i = at + 4 + seg.length
  }
  return out + md.slice(i)
}

/**
 * 순서 LIS — 온전히 매칭된 유닛이 PDF 출력에서 문서 순서대로 놓인 최장 부분열. 같은 글이 출력에 여러 번 나오는 유닛(쪽마다 되풀이되는
 * 서식 칸 "해당없음"·"예외기준 1. …")은 정렬기가 고른 한 자리가 아니라 등장 자리 가운데 순서가 가장 길게 맞는 곳으로 본다 — 같은 글은
 * 구별할 수 없어, 정렬기의 임의 배정이 순서가 멀쩡한 출력을 깎았다(규제영향분석서 80168: 표 순서가 HWPX 와 같은데 order 0.956).
 * 한 유닛은 한 자리만 쓴다(후보를 내림차순으로 넣는 선택지 LIS, 엄격 증가). 2026-09-28 채점 기준 변경
 */
function orderLis(rec, key, floating) {
  const tails = []
  let n = 0
  rec.whole.forEach((pos, k) => {
    const text = rec.wholeText[k]
    // 글자·숫자 없는 유닛(마스킹 "*****"·줄 "-----")은 순서 모수에서 뺀다 — score.mjs HWPX 트랙 순서 채점과 같은 정책
    if (floating.has(text) || !/[\p{L}\p{N}]/u.test(text)) return
    n++
    const cands = []
    for (let at = key.indexOf(text); at >= 0 && cands.length < 200; at = key.indexOf(text, at + 1)) cands.push(at)
    if (!cands.length) cands.push(pos)
    for (const x of cands.sort((a, b) => b - a)) {
      let lo = 0, hi = tails.length
      while (lo < hi) { const m = (lo + hi) >> 1; if (tails[m] < x) lo = m + 1; else hi = m }
      tails[lo] = x
    }
  })
  return { lis: tails.length, n }
}

/**
 * 떠 있는 글상자 글(normKey) — DOCX w:txbxContent 문단, HWPX 글자처럼 취급하지 않는(treatAsChar="0") 그리기 개체의 hp:drawText 문단.
 * 쪽 위에 자리만 잡힌 개체라 본문 흐름 속 순서가 원본에 없다 — 정답의 순서는 작성 순서다(KS 표준안 개념도: 아래 상자부터 거꾸로,
 * 서로 다른 빈 문단에 앵커돼 위치도 문단 기준 상대값). 순서 채점에서만 빼고 재현율·정밀도·어절에는 그대로 둔다 (2026-09-28 채점 기준 변경)
 */
async function floatingTexts(bytes, gtExt) {
  const out = new Set()
  const zip = await JSZip.loadAsync(bytes)
  const addParas = (xml, pSplit, tRe) => {
    for (const para of xml.split(pSplit)) { const k = normKey([...para.matchAll(tRe)].map(m => m[1]).join("")); if (k) out.add(k) }
  }
  if (gtExt === ".docx") {
    const xml = await zip.file("word/document.xml")?.async("string")
    for (const m of xml?.matchAll(/<w:txbxContent\b[\s\S]*?<\/w:txbxContent>/g) ?? []) addParas(m[0], /<\/w:p>/, /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)
    return out
  }
  for (const name of Object.keys(zip.files).filter(n => /^Contents\/section\d+\.xml$/.test(n))) {
    const xml = await zip.file(name).async("string")
    for (const m of xml.matchAll(/<hp:(rect|ellipse|polygon|arc|curve)\b[\s\S]*?<\/hp:\1>/g)) {
      if (!/<hp:pos\b[^>]*treatAsChar="0"/.test(m[0])) continue
      for (const d of m[0].matchAll(/<hp:drawText\b[\s\S]*?<\/hp:drawText>/g)) addParas(d[0], /<\/hp:p>/, /<hp:t(?:\s[^>]*)?>([^<]*)<\/hp:t>/g)
    }
  }
  return out
}

const t0 = performance.now()
const rows = []
const excluded = []
const agg = { pairs: 0, recallM: 0, recallT: 0, precM: 0, precT: 0, orderLis: 0, orderN: 0, wInter: 0, wRef: 0, wOut: 0 }
const setAgg = new Map(SETS.map(s => [s, { ...agg }]))
let parseErrors = 0

for (const { set, base, rel, gtExt } of pairs) {
  const row = { pair: rel, set }
  try {
    const hwpxBytes = await readFile(base + gtExt)
    const hwpx = await parse(Buffer.from(hwpxBytes), { filename: basename(base) + gtExt })
    // 암호를 모르는 실문서 HWPX(같은 보도자료의 PDF·HWP 는 평문)는 정답지가 없다 — ENCRYPTED 거절만 확인하고 모수에서 뺀다
    if (!hwpx.success && hwpx.code === "ENCRYPTED") { excluded.push({ pair: rel, reason: "HWPX 암호(암호 모름) — 정답지 없음" }); continue }
    const pdf = await parse(await readFile(base + ".pdf"), { filename: basename(base) + ".pdf", ocr: false })
    if (!hwpx.success) throw new Error(`hwpx 파싱 실패: ${hwpx.error}`)
    if (!pdf.success) throw new Error(`pdf 파싱 실패: ${pdf.error}`)
    // 줄 머리 목록 표지("- ")는 마크업이다(제목 "#" 처럼) — 같은 항목을 PDF 는 목록 블록("- 가. …"), HWPX 는 문단("가. …")으로
    // 낼 때 표지 글자만 한쪽 가짜 글이 됐다(2025 행정업무운영 편람 652자). 양쪽 다 kordoc 출력이라 둘 다 걷는다 (2026-09-28 채점 기준 변경)
    const plainOf = md => mdToPlain(unwrapNotes(md)).text.replace(/^[ \t]*[-*+][ \t]+/gm, "")
    const hwpxPlain = plainOf(hwpx.markdown)
    const pdfPlain = plainOf(pdf.markdown)

    const refHangul = hangulCount(hwpxPlain)
    const layer = await pdftotextCounts(base + ".pdf")
    const layerHangul = layer?.hangul ?? null
    if (refHangul >= 50 && layerHangul !== null && layerHangul < refHangul * 0.01) {
      excluded.push({ pair: rel, refHangul, pdfLayerHangul: layerHangul, reason: "PDF 텍스트층 한글 없음(글자 곡선) — OCR 대상" })
      continue
    }
    // 정답지가 PDF 를 다 담지 못한 쌍 — PDF 텍스트층 글자(공백 제외)가 HWPX 글의 3배를 넘으면 HWPX 에 없는 부록이 PDF 에 붙은 것이다
    // (2026-09-24 korea-kr-pairs2/156775700 가계동향조사: HWPX 는 보도자료 본문·표 7개, PDF 는 뒤에 통계표 수십 쪽 — 같은 표는 별도 xlsx
    // 첨부. 한 쌍이 PDF 글 어절 F1 손실의 25%·precision 0.32 였다). 752쌍 분포: 이 쌍 3.14배, 다음이 수식 많은 2단 시험지 4건 2.5~2.6배
    // (정답 평문이 수식 스팬을 빼는 다른 원인 — 모수 유지), 나머지는 1.3배 이하
    const refChars = hwpxPlain.replace(/\s+/g, "").length
    if (refChars >= 200 && layer && layer.chars > refChars * 3) {
      excluded.push({ pair: rel, reason: `정답지 부족 — PDF 텍스트층 ${layer.chars}자가 HWPX ${refChars}자의 3배 초과(HWPX 에 없는 부록)` })
      continue
    }
    // PDF 텍스트층 글 누락 — 정답 글자의 93% 를 PDF 텍스트층(pdftotext) 글자가 채우지 못하면 PDF 에 글이 없는 것이다(렌더 결함
    // 재현본 "칸 분할로 본문 누락"·곡선·그림으로만 찍힌 글). 파서는 텍스트층에 없는 글자를 낼 수 없다 — 위 한글 1% 규칙과 같은 논리.
    // 765쌍 분포(2026-09-28): 0.912 다음이 0.948 로 틈이 있다 (채점 기준 변경)
    const layerRecall = refChars >= 50 ? layerCharRecall(hwpxPlain, (await pdftotextText(base + ".pdf")) ?? "") : 1
    if (layerRecall < 0.93) {
      excluded.push({ pair: rel, reason: `PDF 텍스트층 글 누락 — 정답 글자의 ${(layerRecall * 100).toFixed(1)}% 만 텍스트층에 있음` })
      continue
    }

    // 머리말·꼬리말 — HWPX 파서 1회·PDF 파서 반복 제거의 정책 차라 양쪽에서 같이 뺀다
    const chrome = new Set()
    try {
      if (gtExt === ".docx") {
        // DOCX 머리글·바닥글(word/header*.xml·footer*.xml) — kordoc DOCX 파서는 본문만 내고 PDF 는 쪽마다 찍는다
        const zip = await JSZip.loadAsync(hwpxBytes)
        for (const name of Object.keys(zip.files).filter(n => /^word\/(header|footer)\d*\.xml$/.test(n))) {
          const xml = await zip.file(name).async("string")
          for (const para of xml.split(/<\/w:p>/)) {
            const k = normKey([...para.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map(m => m[1]).join(""))
            if (k) chrome.add(k)
            // DOCX 파서는 쪽 번호 필드(PAGE·NUMPAGES·SECTIONPAGES) 표시값을 빼고 낸다("페이지 1 / 19" → "페이지 / 19") — 그 꼴도 뺀다
            const noPage = para.replace(/<w:fldChar w:fldCharType="begin"\/>(?:(?!<w:fldChar w:fldCharType="end"\/>)[\s\S])*?<w:instrText[^>]*>\s*(?:PAGE|NUMPAGES|SECTIONPAGES)\b[\s\S]*?<w:fldChar w:fldCharType="end"\/>/g, "")
            const k2 = normKey([...noPage.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map(m => m[1]).join(""))
            if (k2) chrome.add(k2)
          }
        }
      } else {
        const ref = await extractRef(hwpxBytes)
        for (const parts of [...ref.specials.headers, ...ref.specials.footers]) {
          for (const p of parts) for (const line of p.split(/\n+/)) { const k = normKey(line); if (k) chrome.add(k) }
        }
      }
    } catch { /* 참조 추출 실패(깨진 ZIP) — 머리말 제외 없이 채점 */ }

    const hwpxUnits = lineUnits(hwpxPlain, chrome)
    const pdfUnits = lineUnits(pdfPlain, chrome)
    // 대조 대상은 짧은 줄까지 전부(머리말·꼬리말 줄만 뺌) — 표 칸이 한쪽에선 한 줄, 다른 쪽에선 3자 미만 줄 여럿일 수 있다
    const keyOf = plain => plain.split(/\n+/).map(l => normKey(l)).filter(k => k && !chrome.has(k)).join("")
    const hwpxKey = keyOf(hwpxPlain)
    const pdfKey = keyOf(pdfPlain)
    const rec = coverage(hwpxUnits, pdfKey)
    const prec = coverage(pdfUnits, hwpxKey)
    let floating = new Set()
    try { floating = await floatingTexts(hwpxBytes, gtExt) } catch { /* 깨진 ZIP — 순서 채점 제외 없이 */ }
    const { lis, n: orderN } = orderLis(rec, pdfKey, floating)
    const words = bagOverlap(wordBag(hwpxPlain, chrome), wordBag(pdfPlain, chrome))

    Object.assign(row, {
      ok: true,
      refChars: rec.total,
      recall: round(rec.total ? rec.matched / rec.total : 1),
      precision: round(prec.total ? prec.matched / prec.total : 1),
      order: round(orderN ? lis / orderN : 1),
      spaceF1: round(words.na + words.nb ? (2 * words.inter) / (words.na + words.nb) : 1),
    })
    if (verbose) { row.recallMiss = rec.misses.slice(0, 5); row.precisionMiss = prec.misses.slice(0, 5) }
    for (const a of [agg, setAgg.get(set)]) {
      a.pairs++
      a.recallM += rec.matched; a.recallT += rec.total
      a.precM += prec.matched; a.precT += prec.total
      a.orderLis += lis; a.orderN += orderN
      a.wInter += words.inter; a.wRef += words.na; a.wOut += words.nb
    }
  } catch (err) {
    parseErrors++
    row.ok = false
    row.error = String(err?.message ?? err).slice(0, 160)
  }
  rows.push(row)
}

const summarize = a => ({
  pairs: a.pairs,
  refChars: a.recallT,
  recall: round(a.recallT ? a.recallM / a.recallT : 1),
  precision: round(a.precT ? a.precM / a.precT : 1),
  order: round(a.orderN ? a.orderLis / a.orderN : 1),
  spaceF1: round(a.wRef + a.wOut ? (2 * a.wInter) / (a.wRef + a.wOut) : 1),
})
const summary = { ...summarize(agg), parseErrors, excluded: excluded.length }
const bySet = Object.fromEntries([...setAgg].filter(([, a]) => a.pairs > 0).map(([s, a]) => [s, summarize(a)]))

const elapsed = ((performance.now() - t0) / 1000).toFixed(0)
console.log(`\n══ PDF 글 정답지 — hwpx↔pdf ${summary.pairs}쌍 채점 (${elapsed}s, 제외 ${excluded.length}) ══`)
console.log(`  recall ${summary.recall} | precision ${summary.precision} | order ${summary.order} | spaceF1 ${summary.spaceF1} | HWPX 글자 ${summary.refChars}`)
for (const [s, v] of Object.entries(bySet)) {
  console.log(`  [${s}] ${v.pairs}쌍 | recall ${v.recall} precision ${v.precision} order ${v.order} spaceF1 ${v.spaceF1}`)
}
for (const e of excluded) console.log(`  (제외) ${e.pair} — ${e.pdfLayerHangul !== undefined ? `PDF 텍스트층 한글 ${e.pdfLayerHangul} / HWPX ${e.refHangul}` : e.reason}`)
const worst = rows.filter(r => r.ok).sort((a, b) => (a.recall + a.precision + a.order + a.spaceF1) - (b.recall + b.precision + b.order + b.spaceF1))
for (const r of worst.slice(0, 25)) {
  console.log(`  ${r.pair.slice(0, 90)}: recall ${r.recall} precision ${r.precision} order ${r.order} spaceF1 ${r.spaceF1}`)
}
for (const r of rows.filter(r => !r.ok)) console.log(`  ❌ ${r.pair}: ${r.error}`)

const gates = {
  recall: { value: summary.recall, threshold: GATES.recall, pass: summary.recall >= GATES.recall },
  precision: { value: summary.precision, threshold: GATES.precision, pass: summary.precision >= GATES.precision },
  order: { value: summary.order, threshold: GATES.order, pass: summary.order >= GATES.order },
  spaceF1: { value: summary.spaceF1, threshold: GATES.spaceF1, pass: summary.spaceF1 >= GATES.spaceF1 },
  parseErrors: { value: parseErrors, threshold: GATES.parseErrors, pass: parseErrors <= GATES.parseErrors },
  population: { value: summary.pairs, threshold: GATES.minPairs, pass: summary.pairs >= GATES.minPairs },
}
const pass = docFilter != null || Object.values(gates).every(g => g.pass)
for (const [k, g] of Object.entries(gates)) if (!g.pass) console.log(`  ❌ ${k} ${g.value} (기준 ${g.threshold})`)

await mkdir(join(root, "out"), { recursive: true })
await writeFile(join(root, "out", "pdf-text.json"), JSON.stringify({ generatedAt: new Date().toISOString(), sets: SETS, summary, bySet, pass, gates, excluded, rows }, null, 1))
console.log(`report → bench/out/pdf-text.json | ${pass ? "PASS ✅" : "FAIL ❌"}${gateMode ? "" : " (보고 전용 — --gate 시 exit code 반영)"}`)
if (gateMode && !pass) process.exit(1)
