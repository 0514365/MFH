// MFH-ASIDE-V2 — 2027 셸(2단계): 섹션 = 연회색 면(테두리 없음) · 신호 칩 2027 의미색(지남 빨강 · 임박/중요 호박 · 정체 회색) · 라벨 Manrope 회색 · 진행 막대·NEW 남색 · 굵기 600 이하.
// MFH-ASIDE-V1 — 우측 보조 패널(lg 240 / xl 260, docs/MFH-WIDE-LAYOUT-DESIGN.md §3). 서버 컴포넌트(표시 전용).
// 4섹션 = 신호(프로젝트·할 일) · 오늘의 말씀(QT·통독) · 중보·동향 · 이번 달(일지·편지). 데이터는 app/(app)/layout.tsx(loadAside) 가 조회.
// lg 미만에서는 렌더하지 않는다 — 홈이 같은 정보를 이미 담고 있어 본문 아래 중복 배치는 하지 않는다.
import Link from 'next/link'
import type { ReactNode } from 'react'
import type { Signal, SignalKind } from '@/lib/signals'

export type AsideData = {
  projSignals: Signal[]
  taskSignals: Signal[]
  qt: { main: string; ref: string } | null
  bible: { label: string; pct: number; badge: string; warn: boolean } | null
  unreadPrayers: number
  news: { title: string } | null
  monthLabel: string // "10월"
  journalCount: number
  letter: { number: string | null; title: string; yearMonth: string } | null
}

const SIG_CLS: Record<SignalKind, string> = {
  overdue: 'bg-b27-expense-soft text-b27-expense',
  soon: 'bg-b27-wait-soft text-b27-wait',
  stalled: 'bg-white text-b27-muted',
  important: 'bg-b27-tint-3 text-b27-wait',
}

function Section({ title, href, children }: { title: string; href: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-[13px] font-semibold text-b27-ink">{title}</h4>
        <Link href={href} className="text-[11px] text-b27-muted hover:text-b27-ink">
          보기 →
        </Link>
      </div>
      <div className="rounded-2xl bg-b27-card p-3.5 text-[13px] text-b27-ink">{children}</div>
    </section>
  )
}

function SignalRow({ label, href, signals }: { label: string; href: string; signals: Signal[] }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <Link href={href} className="shrink-0 font-medium text-b27-ink hover:text-b27-ink">
        {label}
      </Link>
      {signals.length ? (
        <div className="flex flex-wrap justify-end gap-1">
          {signals.map((s) => (
            <span key={s.kind} className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${SIG_CLS[s.kind]}`}>
              {s.label} {s.count}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-[11px] text-b27-muted">이상 없음</span>
      )}
    </div>
  )
}

export default function AsidePanel({ data }: { data: AsideData }) {
  const { projSignals, taskSignals, qt, bible, unreadPrayers, news, monthLabel, journalCount, letter } = data
  return (
    <div className="flex flex-col gap-5">
      <Section title="신호" href="/tasks">
        <div className="flex flex-col gap-2">
          <SignalRow label="프로젝트" href="/projects" signals={projSignals} />
          <SignalRow label="할 일" href="/tasks" signals={taskSignals} />
        </div>
      </Section>

      <Section title="오늘의 말씀" href="/qt">
        <Link href="/qt" className="block">
          <div className="font-num text-[11px] font-medium text-b27-muted">QT</div>
          <div className="mt-0.5 line-clamp-2 font-semibold leading-snug text-b27-ink">{qt?.main ?? '오늘의 묵상 없음'}</div>
          {qt?.ref && <div className="mt-0.5 text-[11px] text-b27-muted">{qt.ref}</div>}
        </Link>
        <Link href="/bible" className="mt-3 block border-t-2 border-white pt-3">
          <div className="flex items-center justify-between">
            <div className="font-num text-[11px] font-medium text-b27-muted">통독</div>
            {bible && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  bible.warn ? 'bg-b27-wait-soft text-b27-wait' : 'bg-white text-b27-ink'
                }`}
              >
                {bible.badge}
              </span>
            )}
          </div>
          {bible ? (
            <>
              <div className="mt-0.5 truncate font-semibold text-b27-ink">{bible.label}</div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-b27-ink" style={{ width: `${bible.pct}%` }} />
              </div>
              <div className="mt-1 text-[11px] text-b27-muted">{bible.pct}%</div>
            </>
          ) : (
            <div className="mt-0.5 text-b27-muted">통독 계획 없음</div>
          )}
        </Link>
      </Section>

      <Section title="중보·동향" href="/honduras">
        <Link href="/intercessions" className="flex items-center justify-between">
          <span className="font-medium text-b27-ink">중보기도</span>
          {unreadPrayers > 0 ? (
            <span className="rounded-full bg-b27-ink px-2 py-0.5 font-num text-[10px] font-medium text-white">{unreadPrayers} NEW</span>
          ) : (
            <span className="text-[11px] text-b27-muted">새 기도 없음</span>
          )}
        </Link>
        <Link href="/honduras" className="mt-3 block border-t-2 border-white pt-3">
          <div className="font-num text-[11px] font-medium text-b27-muted">온두라스 동향</div>
          <div className="mt-0.5 line-clamp-2 font-semibold leading-snug text-b27-ink">{news?.title ?? '브리핑 없음'}</div>
        </Link>
      </Section>

      <Section title={`이번 달 · ${monthLabel}`} href="/journal">
        <dl className="grid grid-cols-[1fr_auto] gap-y-1.5">
          <dt className="text-b27-muted">일지</dt>
          <dd className="font-num font-semibold text-b27-ink">{journalCount}건</dd>
          <dt className="text-b27-muted">최근 편지</dt>
          <dd className="font-num font-semibold text-b27-ink">{letter?.number ? `#${letter.number}` : '-'}</dd>
        </dl>
        {letter && (
          <Link href="/portfolio" className="mt-2 block truncate text-[11px] text-b27-muted hover:text-b27-ink">
            {letter.yearMonth} · {letter.title}
          </Link>
        )}
      </Section>
    </div>
  )
}
