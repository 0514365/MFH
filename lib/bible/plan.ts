// MFH-BIBLE-PLAN-V1
// 성경통독 계획 알고리즘(순수 함수, 서버·클라이언트 공용).
//   · readingDates      — 시작~종료일 중 제외 요일을 뺀 읽기 가능일
//   · orderedChapters   — 읽기 순서(구약부터 / 신약부터)로 1,189장 나열
//   · splitByChapters   — 장수 균등 분배(README 6-1)
//   · splitByChars      — 글자수 균등 분배(README 6-2, 편차제곱합 최소 DP)
//   · buildSchedule     — 위를 조합해 하루 1행 일정 + 통계 생성(계획 저장·미리보기 공용)
//   · rangeLabel        — "창세기 1~15장" / "베드로후서 3장 ~ 요한계시록 6장" (README 8절)
//   · planProgress      — 진행률·밀림·오늘 분량 계산(홈 카드·/bible 공용)
import { BIBLE_BOOKS, CHAPTER_CHARS, TOTAL_CHAPTERS, type BibleBook } from './data'

export type ReadOrder = 'ot_first' | 'nt_first'
export type SplitMode = 'chapters' | 'chars'

export const READ_ORDER_LABEL: Record<ReadOrder, string> = {
  ot_first: '구약부터',
  nt_first: '신약부터',
}
export const SPLIT_MODE_LABEL: Record<SplitMode, string> = {
  chapters: '장 균등',
  chars: '글자 균등',
}

// 요일 — JS Date#getDay 기준(0=일 … 6=토). exclude_weekdays 저장값과 동일.
export const WEEKDAY_KR = ['일', '월', '화', '수', '목', '금', '토'] as const

// 보통 묵독 속도(자/분, 공백 제외) — README 7절.
export const CHARS_PER_MINUTE = 500
export const estimateMinutes = (chars: number): number => Math.max(1, Math.round(chars / CHARS_PER_MINUTE))

// ── 장 목록 ────────────────────────────────────────────────────────────────

export type ChapterRef = {
  seq: number // 읽기 순서상 위치(0-based) — DB start_seq/end_seq 가 가리키는 값
  book: BibleBook
  chapter: number // 1-based
  chars: number
}

// 정경 순서 평탄 목록(캐시). 인덱스 = 정경 인덱스(0=창1).
let canonicalCache: Omit<ChapterRef, 'seq'>[] | null = null
function canonical(): Omit<ChapterRef, 'seq'>[] {
  if (canonicalCache) return canonicalCache
  const out: Omit<ChapterRef, 'seq'>[] = []
  let idx = 0
  for (const book of BIBLE_BOOKS) {
    for (let c = 1; c <= book.chapters; c++) {
      out.push({ book, chapter: c, chars: CHAPTER_CHARS[idx] })
      idx++
    }
  }
  canonicalCache = out
  return out
}

// 읽기 순서로 정렬된 1,189장. 신약부터 = 마태복음~계시록 뒤에 창세기~말라기.
export function orderedChapters(order: ReadOrder): ChapterRef[] {
  const base = canonical()
  const list = order === 'nt_first'
    ? [...base.filter((c) => c.book.testament === 'nt'), ...base.filter((c) => c.book.testament === 'ot')]
    : base
  return list.map((c, seq) => ({ seq, ...c }))
}

// ── 날짜 ───────────────────────────────────────────────────────────────────

// 'YYYY-MM-DD' ↔ UTC 자정 Date (타임존 영향 제거).
export function parseYmd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? '')
  if (!m) return null
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  return Number.isNaN(d.getTime()) ? null : d
}
export const toYmd = (d: Date): string => d.toISOString().slice(0, 10)
export const weekdayOf = (ymd: string): number => parseYmd(ymd)?.getUTCDay() ?? 0
export const addDays = (ymd: string, n: number): string => {
  const d = parseYmd(ymd)!
  d.setUTCDate(d.getUTCDate() + n)
  return toYmd(d)
}

// 시작~종료(포함) 중 제외 요일이 아닌 날짜 목록.
export function readingDates(start: string, end: string, excludeWeekdays: number[]): string[] {
  const s = parseYmd(start)
  const e = parseYmd(end)
  if (!s || !e || s > e) return []
  const ex = new Set(excludeWeekdays)
  const out: string[] = []
  for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
    if (!ex.has(d.getUTCDay())) out.push(toYmd(d))
  }
  return out
}

// ── 분배 ───────────────────────────────────────────────────────────────────

export type Segment = { start: number; end: number } // [start, end) — 순서 목록 인덱스

// 장수 균등: base 또는 base+1 장씩, 초과분을 고르게 흩뿌림.
export function splitByChapters(total: number, nDays: number): Segment[] {
  const base = Math.floor(total / nDays)
  const extra = total % nDays
  const segs: Segment[] = []
  let idx = 0
  for (let i = 0; i < nDays; i++) {
    const take = base + ((i * extra) % nDays < extra ? 1 : 0)
    segs.push({ start: idx, end: idx + take })
    idx += take
  }
  return segs
}

// 글자수 균등: 순서 유지 연속 분할, Σ(일일합 − 평균)² 최소화 DP. O(N·T·maxSeg).
//   dp[j][i] = 앞 i장을 j일로 나눈 최소 비용, i ∈ [j, T−(N−j)] (남은 날마다 최소 1장 보장)
export function splitByChars(chars: readonly number[], nDays: number, maxSeg = 45): Segment[] {
  const T = chars.length
  const pre = new Float64Array(T + 1)
  for (let i = 0; i < T; i++) pre[i + 1] = pre[i] + chars[i]
  const avg = pre[T] / nDays
  const W = T + 1
  const dp = new Float64Array((nDays + 1) * W).fill(Number.POSITIVE_INFINITY)
  const par = new Int16Array((nDays + 1) * W)
  dp[0] = 0
  for (let j = 1; j <= nDays; j++) {
    const rowPrev = (j - 1) * W
    const row = j * W
    const iMax = T - (nDays - j)
    for (let i = j; i <= iMax; i++) {
      let best = Number.POSITIVE_INFINITY
      let bk = -1
      const kMin = Math.max(j - 1, i - maxSeg)
      for (let k = kMin; k < i; k++) {
        const prev = dp[rowPrev + k]
        if (prev === Number.POSITIVE_INFINITY) continue
        const diff = pre[i] - pre[k] - avg
        const c = prev + diff * diff
        if (c < best) {
          best = c
          bk = k
        }
      }
      dp[row + i] = best
      par[row + i] = bk
    }
  }
  const segs: Segment[] = []
  let i = T
  for (let j = nDays; j >= 1; j--) {
    const k = par[j * W + i]
    segs.push({ start: k, end: i })
    i = k
  }
  segs.reverse()
  return segs
}

// ── 라벨 ───────────────────────────────────────────────────────────────────

// 범위 표기(README 8절). short=true 면 약어·'장' 생략: "창 1~15" / "벧후 3 ~ 계 6".
export function rangeLabel(first: ChapterRef, last: ChapterRef, short = false): string {
  const b1 = short ? first.book.abbr : first.book.name
  const b2 = short ? last.book.abbr : last.book.name
  const unit = short ? '' : '장'
  if (first.book.order === last.book.order) {
    return first.chapter === last.chapter
      ? `${b1} ${first.chapter}${unit}`
      : `${b1} ${first.chapter}~${last.chapter}${unit}`
  }
  return `${b1} ${first.chapter}${unit} ~ ${b2} ${last.chapter}${unit}`
}

// DB 행(start_seq/end_seq)에서 라벨 재계산 — 짧은 표기 등 표시 변형용.
export function labelFromSeq(order: ReadOrder, startSeq: number, endSeq: number, short = false): string {
  const list = orderedChapters(order)
  return rangeLabel(list[startSeq], list[endSeq], short)
}

// ── 일정 생성 ──────────────────────────────────────────────────────────────

export type ScheduleInput = {
  start: string
  end: string
  excludeWeekdays: number[]
  order: ReadOrder
  mode: SplitMode
}

export type ScheduleDay = {
  dayNo: number // 1-based
  readDate: string
  startSeq: number
  endSeq: number // inclusive
  chapters: number
  chars: number
  label: string
}

export type ScheduleStats = {
  readingDays: number
  calendarDays: number
  avgChapters: number
  avgChars: number
  avgMinutes: number
  minChapters: number
  maxChapters: number
  minChars: number
  maxChars: number
  firstLabel: string
  lastLabel: string
  lastDate: string
}

export type ScheduleResult =
  | { ok: true; days: ScheduleDay[]; stats: ScheduleStats }
  | { ok: false; error: string }

export function buildSchedule(input: ScheduleInput): ScheduleResult {
  const s = parseYmd(input.start)
  const e = parseYmd(input.end)
  if (!s || !e) return { ok: false, error: '시작일과 완료 목표일을 입력해 주세요.' }
  if (s > e) return { ok: false, error: '완료 목표일이 시작일보다 빠릅니다.' }
  const dates = readingDates(input.start, input.end, input.excludeWeekdays)
  const n = dates.length
  if (n === 0) return { ok: false, error: '읽을 수 있는 날이 없습니다. 제외 요일을 줄여 주세요.' }
  if (n > TOTAL_CHAPTERS) {
    return { ok: false, error: `읽는 날(${n}일)이 총 장수(${TOTAL_CHAPTERS}장)보다 많습니다. 기간을 줄여 주세요.` }
  }
  const list = orderedChapters(input.order)
  const charsArr = list.map((c) => c.chars)
  const segs = input.mode === 'chapters' ? splitByChapters(list.length, n) : splitByChars(charsArr, n)

  const days: ScheduleDay[] = segs.map((seg, i) => {
    let chars = 0
    for (let k = seg.start; k < seg.end; k++) chars += charsArr[k]
    const first = list[seg.start]
    const last = list[seg.end - 1]
    return {
      dayNo: i + 1,
      readDate: dates[i],
      startSeq: first.seq,
      endSeq: last.seq,
      chapters: seg.end - seg.start,
      chars,
      label: rangeLabel(first, last),
    }
  })

  const chArr = days.map((d) => d.chapters)
  const chrArr = days.map((d) => d.chars)
  const totalChars = chrArr.reduce((a, b) => a + b, 0)
  const calendarDays = Math.round((e.getTime() - s.getTime()) / 86400000) + 1
  const avgChars = Math.round(totalChars / n)
  const stats: ScheduleStats = {
    readingDays: n,
    calendarDays,
    avgChapters: Math.round((TOTAL_CHAPTERS / n) * 10) / 10,
    avgChars,
    avgMinutes: estimateMinutes(avgChars),
    minChapters: Math.min(...chArr),
    maxChapters: Math.max(...chArr),
    minChars: Math.min(...chrArr),
    maxChars: Math.max(...chrArr),
    firstLabel: days[0].label,
    lastLabel: days[n - 1].label,
    lastDate: dates[n - 1],
  }
  return { ok: true, days, stats }
}

// ── 진행 상황 ──────────────────────────────────────────────────────────────

export type ProgressDay = { day_no: number; read_date: string; done: boolean; chapters: number }

export type PlanProgress = {
  totalDays: number
  doneDays: number
  doneChapters: number
  pct: number // 0~100 (읽은 장 기준)
  overdue: number // 오늘 이전(오늘 미포함) 미완료 일수
  todayDayNo: number | null // 오늘이 읽는 날이면 그 일차
  nextDayNo: number | null // 오늘 이후(오늘 포함) 첫 미완료 일차 — "오늘 읽을 분량" 후보
  completed: boolean
}

// today = 'YYYY-MM-DD'(온두라스 기준 — 홈과 동일). days 는 day_no 오름차순이 아니어도 됨.
export function planProgress(days: ProgressDay[], today: string): PlanProgress {
  const sorted = [...days].sort((a, b) => a.day_no - b.day_no)
  const totalDays = sorted.length
  let doneDays = 0
  let doneChapters = 0
  let overdue = 0
  let todayDayNo: number | null = null
  let nextDayNo: number | null = null
  for (const d of sorted) {
    if (d.done) {
      doneDays++
      doneChapters += d.chapters
    } else if (d.read_date < today) {
      overdue++
    }
    if (d.read_date === today) todayDayNo = d.day_no
    if (nextDayNo === null && !d.done && d.read_date >= today) nextDayNo = d.day_no
  }
  const totalChapters = sorted.reduce((a, d) => a + d.chapters, 0) || TOTAL_CHAPTERS
  return {
    totalDays,
    doneDays,
    doneChapters,
    pct: Math.round((doneChapters / totalChapters) * 100),
    overdue,
    todayDayNo,
    nextDayNo,
    completed: totalDays > 0 && doneDays === totalDays,
  }
}

// 상태 배지 문구.
export function progressBadge(p: PlanProgress): { label: string; tone: 'done' | 'ok' | 'warn' } {
  if (p.completed) return { label: '완독', tone: 'done' }
  if (p.overdue > 0) return { label: `${p.overdue}일 밀림`, tone: 'warn' }
  return { label: '일정대로', tone: 'ok' }
}

// 'YYYY-MM-DD' → "9/2 (수)"
export function shortDate(ymd: string): string {
  const d = parseYmd(ymd)
  if (!d) return ymd
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} (${WEEKDAY_KR[d.getUTCDay()]})`
}
// 'YYYY-MM-DD' → "2026. 9. 2"
export function longDate(ymd: string): string {
  const d = parseYmd(ymd)
  if (!d) return ymd
  return `${d.getUTCFullYear()}. ${d.getUTCMonth() + 1}. ${d.getUTCDate()}`
}
