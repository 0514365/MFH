// MFH-VERIFY-BIBLE-PLAN-V1
// lib/bible/plan.ts 검증 — README(bible-reading-plan) 5절 검증 사례와 대조.
//   npx tsx scripts/verify-bible-plan.ts
import { buildSchedule, planProgress, progressBadge } from '../lib/bible/plan'
import { TOTAL_CHAPTERS, TOTAL_CHARS } from '../lib/bible/data'

function run(label: string, input: Parameters<typeof buildSchedule>[0]) {
  const t0 = Date.now()
  const r = buildSchedule(input)
  const ms = Date.now() - t0
  if (!r.ok) {
    console.log(`[${label}] ERROR: ${r.error}`)
    return
  }
  const { stats, days } = r
  const sumCh = days.reduce((a, d) => a + d.chapters, 0)
  const sumChars = days.reduce((a, d) => a + d.chars, 0)
  // 연속성: 이전 endSeq+1 === 다음 startSeq
  let contiguous = days[0].startSeq === 0 && days[days.length - 1].endSeq === TOTAL_CHAPTERS - 1
  for (let i = 1; i < days.length; i++) if (days[i - 1].endSeq + 1 !== days[i].startSeq) contiguous = false
  console.log(`[${label}] ${ms}ms`)
  console.log(`  읽는 날 ${stats.readingDays} / ${stats.calendarDays}일 · 완독 ${stats.lastDate}`)
  console.log(`  하루 글자 ${stats.minChars.toLocaleString()}~${stats.maxChars.toLocaleString()} (평균 ${stats.avgChars.toLocaleString()}) · 장 ${stats.minChapters}~${stats.maxChapters} (평균 ${stats.avgChapters}) · 약 ${stats.avgMinutes}분`)
  console.log(`  첫날 ${stats.firstLabel} / 마지막 ${stats.lastLabel}`)
  console.log(`  합계 장 ${sumCh}=${TOTAL_CHAPTERS} 글자 ${sumChars}=${TOTAL_CHARS} 연속 ${contiguous}`)
  if (sumCh !== TOTAL_CHAPTERS || sumChars !== TOTAL_CHARS || !contiguous) throw new Error('integrity failed: ' + label)
  return r
}

// README 사례 2: 2027 연간, 토·일 제외 → 261일, 4,220~6,226 (평균 5,223), 1~19장, 12/31 완독
const r2027 = run('2027 연간 토·일 제외 · 글자 균등', {
  start: '2027-01-01', end: '2027-12-31', excludeWeekdays: [0, 6], order: 'ot_first', mode: 'chars',
})
if (r2027 && r2027.ok) {
  const s = r2027.stats
  const okStats = s.readingDays === 261 && s.avgChars === 5223 && s.minChars === 4220 && s.maxChars === 6226 && s.minChapters === 1 && s.maxChapters === 19
  console.log(`  README 대조: ${okStats ? '일치' : '불일치!'}`)
  if (!okStats) throw new Error('README 2027 mismatch')
}

// README 사례 1 변형: 2026 하반기 9/1~12/25 토 제외(README 는 105일 중 100일 사용 — 여기서는 종료일로 표현)
run('2026 하반기 9/1~12/25 토 제외 · 글자 균등', {
  start: '2026-09-01', end: '2026-12-25', excludeWeekdays: [6], order: 'ot_first', mode: 'chars',
})
run('2026 하반기 9/1~12/25 토 제외 · 장 균등', {
  start: '2026-09-01', end: '2026-12-25', excludeWeekdays: [6], order: 'ot_first', mode: 'chapters',
})
run('2027 연간 제외 없음 · 신약부터 · 글자 균등', {
  start: '2027-01-01', end: '2027-12-31', excludeWeekdays: [], order: 'nt_first', mode: 'chars',
})
run('오류: 기간 > 장수', { start: '2027-01-01', end: '2030-12-31', excludeWeekdays: [], order: 'ot_first', mode: 'chars' })
run('오류: 종료 < 시작', { start: '2027-01-02', end: '2027-01-01', excludeWeekdays: [], order: 'ot_first', mode: 'chars' })

// 진행 계산
const p = planProgress(
  [
    { day_no: 1, read_date: '2026-09-01', done: true, chapters: 11 },
    { day_no: 2, read_date: '2026-09-02', done: false, chapters: 12 },
    { day_no: 3, read_date: '2026-09-03', done: false, chapters: 8 },
  ],
  '2026-09-03',
)
console.log('[progress]', p, progressBadge(p))
if (p.overdue !== 1 || p.todayDayNo !== 3 || p.nextDayNo !== 3 || p.doneDays !== 1) throw new Error('progress failed')
console.log('ALL OK')
