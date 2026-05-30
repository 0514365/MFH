// MFH-ICS-V1
// 구독형 캘린더 피드용 순수 ICS(iCalendar) 빌더. 외부 의존성 없음.
// 모든 이벤트는 종일(all-day, VALUE=DATE). 타임존 영향 없음.

export type IcsEvent = {
  uid: string // 안정적 식별자(예: project-<id>@mfh) — 갱신 시 중복 방지
  summary: string
  start: string // 'YYYY-MM-DD' (포함)
  end: string // 'YYYY-MM-DD' (포함). 내부에서 +1일 해 exclusive DTEND 로 변환
}

// 'YYYY-MM-DD' → 'YYYYMMDD'
function compact(dateKey: string): string {
  return dateKey.replace(/-/g, '')
}

// 종일 이벤트의 DTEND 는 exclusive → 마지막 날 +1일.
function nextDayCompact(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  // UTC 기준 계산(시:분 없음 → 타임존 무관)
  const dt = new Date(Date.UTC(y, m - 1, d + 1))
  const yy = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${yy}${mm}${dd}`
}

// ICS 텍스트값 이스케이프 (RFC 5545): \ ; , 개행.
function esc(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

// 한 줄을 75 octet(대략 75자) 단위로 폴딩(이어지는 줄은 공백 1칸 prefix).
function fold(line: string): string {
  if (line.length <= 75) return line
  const parts: string[] = []
  let rest = line
  parts.push(rest.slice(0, 75))
  rest = rest.slice(75)
  while (rest.length > 74) {
    parts.push(' ' + rest.slice(0, 74))
    rest = rest.slice(74)
  }
  if (rest.length) parts.push(' ' + rest)
  return parts.join('\r\n')
}

export type BuildOpts = {
  calName: string // X-WR-CALNAME (캘린더 표시명)
  dtstamp: string // 'YYYYMMDDTHHMMSSZ' (UTC). route 에서 생성 시각 주입.
}

export function buildICS(events: IcsEvent[], opts: BuildOpts): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MFH//Calendar Feed//KO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    fold(`X-WR-CALNAME:${esc(opts.calName)}`),
  ]
  for (const ev of events) {
    lines.push('BEGIN:VEVENT')
    lines.push(fold(`UID:${esc(ev.uid)}`))
    lines.push(`DTSTAMP:${opts.dtstamp}`)
    lines.push(`DTSTART;VALUE=DATE:${compact(ev.start)}`)
    lines.push(`DTEND;VALUE=DATE:${nextDayCompact(ev.end)}`)
    lines.push(fold(`SUMMARY:${esc(ev.summary)}`))
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}
