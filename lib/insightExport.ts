// MFH-INSIGHT-EXPORT-V1
// 일지·프로젝트·할 일 데이터를 분석용 Markdown 한 장으로 직렬화.
// 수동 경로(claude.ai 업로드)와 자동 경로(API route)가 공유한다.
// 모델에 넘기는 텍스트는 여기서만 만든다 → 두 경로의 분석 입력이 동일.
// [V2 확장] 데이터 출처 도메인(raw) + 목적 렌즈(lens)를 InsightDomain 합집합으로 통합.
//   insights.domain 은 text 라 스키마 변경 없이 렌즈 키를 그대로 저장한다.
// [Balance] 분류 비중 집계(buildCategoryBreakdown)+분류색은 순수 함수 — API 호출 없이 무료 동작.

import { JOURNAL_CATEGORIES } from '@/lib/constants'

// 기존 데이터 출처 도메인(레거시 Raw 분석) — 유지.
export type RawDomain = 'journal' | 'project' | 'task' | 'overall'
// 신규 목적 렌즈 키.
export type LensKey = 'prayer' | 'balance' | 'fruit' | 'letter'
// insights.domain 에 저장될 수 있는 모든 값.
export type InsightDomain = RawDomain | LensKey

export const RAW_DOMAINS: RawDomain[] = ['overall', 'journal', 'project', 'task']
export const LENS_KEYS: LensKey[] = ['prayer', 'balance', 'fruit', 'letter']
export const ALL_DOMAINS: InsightDomain[] = [...RAW_DOMAINS, ...LENS_KEYS]

export function isLens(d: string): d is LensKey {
  return (LENS_KEYS as string[]).includes(d)
}
export function isValidDomain(d: string): d is InsightDomain {
  return (ALL_DOMAINS as string[]).includes(d)
}

export const INSIGHT_PERIODS = [
  { value: 7, label: '7일' },
  { value: 30, label: '30일' },
  { value: 90, label: '90일' },
] as const

export type PeriodDays = (typeof INSIGHT_PERIODS)[number]['value']

// 저장·프롬프트 표기용 한글 풀네임(raw 4 + 렌즈 4).
export const DOMAIN_LABEL: Record<InsightDomain, string> = {
  journal: '일지 인사이트',
  project: '프로젝트 인사이트',
  task: '할 일 인사이트',
  overall: '종합 인사이트',
  prayer: '기도제목',
  balance: '사역·가정 균형',
  fruit: '간증·열매',
  letter: '월간 기도편지',
}

// UI 렌즈 카드용 영어 라벨(모듈 라벨·제목은 영어 규칙).
export const LENS_LABEL: Record<LensKey, string> = {
  prayer: 'Prayer',
  balance: 'Balance',
  fruit: 'Fruit',
  letter: 'Letter',
}

// 도메인/렌즈별로 어떤 데이터 블록을 내보낼지 결정(API route 3곳 공유).
export function domainNeeds(d: InsightDomain): {
  journal: boolean
  project: boolean
  task: boolean
} {
  return {
    journal: ['journal', 'overall', 'prayer', 'fruit', 'balance'].includes(d),
    project: ['project', 'overall', 'balance'].includes(d),
    task: ['task', 'overall', 'balance'].includes(d),
  }
}

// period_start(YYYY-MM-DD) 계산: 오늘에서 days 만큼 뺀 날짜.
export function periodStart(days: number, today = new Date()): string {
  const d = new Date(today)
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}
export function todayStr(today = new Date()): string {
  return today.toISOString().slice(0, 10)
}

// ── 조회 데이터 타입(서버 조회 결과의 최소 형태) ───────────────
export type JournalRow = {
  entry_date: string | null
  category: string | null
  headline: string | null
  today: string | null
  thanks: string | null
  meditation: string | null
  prayer: string | null
  prayer_candidate: boolean | null
  place_name: string | null
}
export type ProjectRow = {
  title: string | null
  description: string | null
  status: string | null
  importance: number | null
  start_date: string | null
  due_date: string | null
  category: string | null
}
export type TaskRow = {
  title: string | null
  description: string | null
  status: string | null
  done: boolean | null
  importance: number | null
  due_date: string | null
  due_time: string | null
  category: string | null
}

export type ExportData = {
  domain: InsightDomain
  periodDays: number
  periodStart: string
  periodEnd: string
  journals?: JournalRow[]
  projects?: ProjectRow[]
  tasks?: TaskRow[]
}

const dash = (s: string | null | undefined) => (s && s.trim() ? s.trim() : '—')

function journalBlock(rows: JournalRow[]): string {
  if (!rows.length) return '## 일지\n(기간 내 기록 없음)\n'
  const items = rows
    .map((r) => {
      const parts: string[] = []
      parts.push(`### ${dash(r.entry_date)} · ${dash(r.category)}${r.prayer_candidate ? ' · [기도제목후보]' : ''}`)
      if (r.headline) parts.push(`머리말: ${r.headline.trim()}`)
      if (r.place_name) parts.push(`장소: ${r.place_name.trim()}`)
      if (r.today) parts.push(`오늘 있었던 일: ${r.today.trim()}`)
      if (r.thanks) parts.push(`감사·응답: ${r.thanks.trim()}`)
      if (r.meditation) parts.push(`묵상·깨달음: ${r.meditation.trim()}`)
      if (r.prayer) parts.push(`기도제목: ${r.prayer.trim()}`)
      return parts.join('\n')
    })
    .join('\n\n')
  return `## 일지 (${rows.length}건)\n${items}\n`
}

function projectBlock(rows: ProjectRow[]): string {
  if (!rows.length) return '## 프로젝트\n(기록 없음)\n'
  const items = rows
    .map((r) => {
      const meta = [
        `상태: ${dash(r.status)}`,
        `중요도: ${r.importance ?? 0}`,
        `분류: ${dash(r.category)}`,
        `시작: ${dash(r.start_date)}`,
        `마감: ${dash(r.due_date)}`,
      ].join(' · ')
      const desc = r.description ? `\n  ${r.description.trim()}` : ''
      return `- ${dash(r.title)} (${meta})${desc}`
    })
    .join('\n')
  return `## 프로젝트 (${rows.length}건)\n${items}\n`
}

function taskBlock(rows: TaskRow[]): string {
  if (!rows.length) return '## 할 일\n(기록 없음)\n'
  const items = rows
    .map((r) => {
      const meta = [
        `상태: ${dash(r.status)}`,
        `완료: ${r.done ? 'O' : 'X'}`,
        `중요도: ${r.importance ?? 0}`,
        `분류: ${dash(r.category)}`,
        `마감: ${dash(r.due_date)}${r.due_time ? ' ' + r.due_time : ''}`,
      ].join(' · ')
      const desc = r.description ? `\n  ${r.description.trim()}` : ''
      return `- ${dash(r.title)} (${meta})${desc}`
    })
    .join('\n')
  return `## 할 일 (${rows.length}건)\n${items}\n`
}

// 분석에 넘길 사용자 데이터 본문(Markdown). domain 에 따라 포함 블록을 고른다.
export function buildDataMarkdown(d: ExportData): string {
  const head =
    `# MFH ${DOMAIN_LABEL[d.domain]} 분석 데이터\n` +
    `기간: ${d.periodStart} ~ ${d.periodEnd} (최근 ${d.periodDays}일)\n`
  const blocks: string[] = [head]
  const need = domainNeeds(d.domain)
  if (need.journal) blocks.push(journalBlock(d.journals ?? []))
  if (need.project) blocks.push(projectBlock(d.projects ?? []))
  if (need.task) blocks.push(taskBlock(d.tasks ?? []))
  return blocks.join('\n')
}

// ── Balance 렌즈: 분류 비중 집계(순수 함수 — API 불필요 = 무료) ───────────
export type CategoryStat = { category: string; count: number; ratio: number }
export type CategoryBreakdown = { items: CategoryStat[]; total: number }

export const UNCATEGORIZED = '미분류'

// category 문자열 목록 → 건수·비중(내림차순). 빈/공백은 '미분류'로 묶는다.
export function buildCategoryBreakdown(
  categories: (string | null | undefined)[],
): CategoryBreakdown {
  const counts = new Map<string, number>()
  for (const c of categories) {
    const name = c && c.trim() ? c.trim() : UNCATEGORIZED
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  const total = categories.length
  const items = Array.from(counts.entries())
    .map(([category, count]) => ({ category, count, ratio: total ? count / total : 0 }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category, 'ko'))
  return { items, total }
}

// 분류 막대 색: 브랜드(마룬-레드-그레이) 축 안에서 명도·색조를 보간한 고정 팔레트.
// 시드 분류는 인덱스 고정, 그 외 동적 분류는 이름 해시로 안정 배정(렌더마다 동일).
export const BALANCE_PALETTE = [
  '#661F20', // 딥마룬 (primary)
  '#B61821', // 레드 (accent)
  '#8A3A2E', // 적갈
  '#C56A60', // 로즈
  '#9A6A55', // 토프 (마룬+그레이)
  '#80807F', // 그레이 (neutral)
  '#B9928F', // 더스티 로즈
  '#A8A6A4', // 라이트 그레이
] as const

export function categoryColor(category: string): string {
  if (category === UNCATEGORIZED) return '#D8D4D2'
  const seedIdx = (JOURNAL_CATEGORIES as readonly string[]).indexOf(category)
  if (seedIdx >= 0) return BALANCE_PALETTE[seedIdx % BALANCE_PALETTE.length]
  let h = 0
  for (let i = 0; i < category.length; i++) h = (h * 31 + category.charCodeAt(i)) >>> 0
  return BALANCE_PALETTE[h % BALANCE_PALETTE.length]
}

// ── Fruit 렌즈: 감사·응답(thanks) 타임라인(순수 함수 — API 불필요 = 무료) ──
// 일지엔 "응답된 prayer" 전용 플래그가 없고 thanks 가 감사·응답을 겸한다 → thanks 기준.
export type FruitItem = {
  date: string | null
  headline: string | null
  thanks: string
  category: string | null
}

export type FruitRow = {
  entry_date: string | null
  headline: string | null
  thanks: string | null
  category: string | null
}

// thanks 가 있는 일지만 골라 최신→과거 순. 간증 타임라인 재료.
export function buildFruitTimeline(rows: FruitRow[]): FruitItem[] {
  return rows
    .filter((r) => r.thanks && r.thanks.trim())
    .map((r) => ({
      date: r.entry_date,
      headline: r.headline,
      thanks: (r.thanks ?? '').trim(),
      category: r.category,
    }))
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
}
