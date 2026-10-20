'use client'
// MFH-QUICK-ENTRY-V2 — ① 통화 선택 세그먼트(L/$/₩) · [이체][조정] 버튼(→ 상세 폼) · C 버튼 강조 · ③ 구매처 입력칸을 내역 바로 아래 같은 크기로
// MFH-QUICK-ENTRY-V1
// 모바일 빠른 기록(위플 가계부형, 전체 화면 3단계) — /accounting/entry 의 <md 화면(수정·상세 입력은 기존 AccountingForm).
//   ① 금액: 날짜(탭 = 변경) · 통화 글자 L/$/₩(탭 = 순환) · 큰 숫자 · [수입][지출] · 계산기 키패드(0~9 · . · ⌫ · + − × ÷ · =)
//   ② 결제수단: 계좌 알약 버튼 — 입력 통화와 같은 계좌 먼저, 나머지는 흐리게
//   ③ 항목: 금액 · 내역 입력 · (지출은 대분류 탭) 항목 아이콘 그리드(5열, 달력·통계와 같은 색) · 메모(구매처). 아이콘 탭 = 즉시 저장 → 달력(선택일)
//   환율·USD 환산은 AccountingForm 과 같은 규칙(공시 환율 잠정, 최종은 DB 트리거 patch116). 2026-09 이전 날짜는 상세 입력으로 안내.
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { activeOnly, type AcctOption, type AcctOptions, type FxInfo, type InoutInput } from '@/lib/accounting-types'
import { itemPastels, useShowCur } from '@/lib/acct-display'
import { CatIcon } from '@/lib/acct-icons'
import { saveInout } from './actions'
import ItemAddButton from './ItemAddButton'

type Cur = 'HNL' | 'USD' | 'KRW'
type Gubun = '수입' | '지출'
const CUR_ORDER: Cur[] = ['HNL', 'USD', 'KRW']
const CUR_SIGN: Record<Cur, string> = { HNL: 'L', USD: '$', KRW: '₩' }
const DEFAULT_RATE: Record<Cur, number> = { KRW: 1400, USD: 1, HNL: 26.5 }
const CAT_ORDER = ['후원', '헌금', '기타수입', '사역비', '생활비', '사역', '차량', '생활', '운영/행정']

const todayLocal = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const fmtNum = (n: number, cur: Cur) =>
  cur === 'KRW' ? Math.round(n).toLocaleString('en-US') : n.toLocaleString('en-US', { maximumFractionDigits: 2 })

// ===== 계산기 — 토큰(숫자·연산자) 배열, × ÷ 우선 후 + − 순(좌→우) =====
type Op = '+' | '-' | '*' | '/'
const OP_LABEL: Record<Op, string> = { '+': '+', '-': '−', '*': '×', '/': '÷' }
function evaluate(tokens: (number | Op)[]): number {
  const t = [...tokens]
  if (typeof t[t.length - 1] !== 'number') t.pop()
  if (!t.length) return 0
  const pass1: (number | Op)[] = []
  for (let i = 0; i < t.length; i++) {
    const x = t[i]
    if ((x === '*' || x === '/') && typeof pass1[pass1.length - 1] === 'number' && typeof t[i + 1] === 'number') {
      const a = pass1.pop() as number
      const b = t[++i] as number
      pass1.push(x === '*' ? a * b : b === 0 ? 0 : a / b)
    } else pass1.push(x)
  }
  let acc = pass1[0] as number
  for (let i = 1; i < pass1.length; i += 2) {
    const op = pass1[i] as Op
    const b = pass1[i + 1] as number
    acc = op === '+' ? acc + b : acc - b
  }
  return Math.round(acc * 100) / 100
}

export default function QuickEntry({ options, fx, initialDate }: { options: AcctOptions; fx: FxInfo[]; initialDate?: string }) {
  const router = useRouter()
  const [showCur] = useShowCur()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [date, setDate] = useState(initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate) ? initialDate : todayLocal())
  const [cur, setCur] = useState<Cur>(showCur === 'USD' ? 'USD' : 'HNL')
  // 계산기: 확정 토큰 + 입력 중 숫자 문자열
  const [tokens, setTokens] = useState<(number | Op)[]>([])
  const [typing, setTyping] = useState('')
  const [gubun, setGubun] = useState<Gubun>('지출')
  const [accountId, setAccountId] = useState('')
  const [name, setName] = useState('')
  const [vendor, setVendor] = useState('')
  const [catTab, setCatTab] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const legacy = date < '2026-09-01'
  const amount = useMemo(() => {
    const all = typing ? [...tokens, Number(typing)] : tokens
    return evaluate(all)
  }, [tokens, typing])
  const exprText = useMemo(() => {
    const parts = tokens.map((t) => (typeof t === 'number' ? fmtNum(t, cur) : OP_LABEL[t]))
    if (typing) parts.push(typing)
    return parts.join(' ')
  }, [tokens, typing, cur])
  const pendingOp = tokens.length > 0

  // ---- 키패드 ----
  function pressDigit(d: string) {
    setErr('')
    if (d === '.' && typing.includes('.')) return
    if (d === '.' && typing === '') return setTyping('0.')
    if (typing === '0' && d !== '.') return setTyping(d)
    if (typing.replace('.', '').length >= 12) return
    setTyping(typing + d)
  }
  function pressOp(op: Op) {
    setErr('')
    if (typing) {
      setTokens([...tokens, Number(typing), op])
      setTyping('')
    } else if (tokens.length && typeof tokens[tokens.length - 1] !== 'number') {
      setTokens([...tokens.slice(0, -1), op]) // 연산자 교체
    } else if (tokens.length) setTokens([...tokens, op])
  }
  function pressEquals() {
    if (!tokens.length) return
    const v = evaluate(typing ? [...tokens, Number(typing)] : tokens)
    setTokens([])
    setTyping(v ? String(v) : '')
  }
  function pressBack() {
    setErr('')
    if (typing) return setTyping(typing.slice(0, -1))
    if (!tokens.length) return
    const last = tokens[tokens.length - 1]
    if (typeof last === 'number') {
      setTokens(tokens.slice(0, -1))
      setTyping(String(last))
    } else setTokens(tokens.slice(0, -1))
  }
  function clearAll() {
    setTokens([])
    setTyping('')
  }

  // ---- 단계 이동 ----
  function pickGubun(g: Gubun) {
    if (!(amount > 0)) return setErr('금액을 입력하세요')
    if (legacy) return setErr('2026-09 이전 날짜는 상세 입력에서 기록하세요')
    // 계산 중이면 확정
    setTokens([])
    setTyping(String(amount))
    setGubun(g)
    setCatTab(null)
    setStep(2)
  }
  function pickAccount(id: string) {
    setAccountId(id)
    setStep(3)
  }
  function goBack() {
    if (step === 1) return router.push(`/accounting?d=${date}`)
    setStep((s) => (s === 3 ? 2 : 1))
  }
  const close = () => router.push(`/accounting?d=${date}`)

  // ---- 계좌(②) — 입력 통화 먼저 ----
  const accounts = useMemo(() => {
    const same = options.accounts.filter((a) => a.currency === cur)
    const other = options.accounts.filter((a) => a.currency !== cur)
    return { same, other }
  }, [options, cur])

  // ---- 항목(③) — 대분류 그룹 · 색 ----
  const groups = useMemo(() => {
    const map = new Map<string, AcctOption[]>()
    for (const it of activeOnly(options.items[gubun])) {
      const c = it.category || '기타'
      if (!map.has(c)) map.set(c, [])
      map.get(c)!.push(it)
    }
    return [...map.entries()].sort((a, b) => (CAT_ORDER.indexOf(a[0]) + 1 || 99) - (CAT_ORDER.indexOf(b[0]) + 1 || 99))
  }, [options, gubun])
  const useTabs = gubun === '지출' && groups.length > 1
  const activeTab = useTabs ? (catTab ?? groups[0][0]) : null
  const gridItems = useTabs ? (groups.find(([c]) => c === activeTab)?.[1] ?? []) : groups.flatMap(([, l]) => l)
  const itemColor = useMemo(() => itemPastels([...options.items['수입'], ...options.items['지출']]), [options])
  const categories = groups.map(([c]) => c).filter((c) => c !== '기타')

  // ---- 저장 ----
  async function save(itemId: string) {
    if (saving) return
    const rate = cur === 'USD' ? 1 : (fx.find((f) => f.currency === cur)?.rate ?? DEFAULT_RATE[cur])
    const payload: InoutInput = {
      gubun,
      date,
      itemId,
      name: name.trim(),
      vendor: vendor.trim() || null,
      currency: cur,
      principal: amount,
      rate,
      amountUsd: Math.round((amount / rate) * 100) / 100,
      accountId: accountId || null,
      toAccountId: null,
      toPrincipal: null,
      supporterId: null,
      source: 'manual',
    }
    setSaving(true)
    setErr('')
    const res = await saveInout(payload)
    setSaving(false)
    if (!res.ok) return setErr(res.error ?? '저장 실패')
    router.push(`/accounting?d=${date}`)
    router.refresh()
  }

  const accountName = options.accounts.find((a) => a.id === accountId)?.name ?? ''
  const key = 'flex h-full items-center justify-center font-display text-[30px] font-light text-ink active:bg-surface-subtle'
  const opKey = 'flex h-full items-center justify-center font-display text-[26px] text-primary active:bg-surface-subtle'

  return (
    <div className="fixed inset-0 z-50 flex flex-col md:hidden" style={{ background: 'var(--paper)', paddingTop: 'env(safe-area-inset-top)' }}>
      {/* 상단 바 */}
      <div className="flex h-14 shrink-0 items-center justify-between px-3">
        {step === 1 ? (
          <label className="relative px-1 font-display text-[20px] text-muted">
            {date.replace(/-/g, '/')}
            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="absolute inset-0 opacity-0" aria-label="날짜" />
          </label>
        ) : (
          <div className="flex items-center gap-3">
            <button type="button" onClick={goBack} aria-label="뒤로" className="flex h-10 w-10 items-center justify-center text-ink">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
            </button>
            {step === 3 && (
              <span className={`font-display text-[24px] font-medium ${gubun === '수입' ? 'text-blue-700' : 'text-[#E0607A]'}`}>
                {CUR_SIGN[cur]} {fmtNum(amount, cur)}
              </span>
            )}
          </div>
        )}
        <button type="button" onClick={close} aria-label="닫기" className="flex h-10 w-10 items-center justify-center text-ink">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      {/* ① 금액 + 계산기 */}
      {step === 1 && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-start justify-between px-6 pt-4">
            <div className="flex flex-col items-start gap-3">
              <span className="font-display text-[64px] font-light leading-none text-muted">{CUR_SIGN[cur]}</span>
              {/* 통화 선택 */}
              <div className="flex rounded-full bg-surface-subtle p-0.5" role="radiogroup" aria-label="통화">
                {CUR_ORDER.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={cur === c}
                    onClick={() => setCur(c)}
                    className={`rounded-full px-3.5 py-1.5 font-display text-[14px] font-semibold transition ${cur === c ? 'bg-surface text-primary shadow-soft' : 'text-muted'}`}
                  >
                    {CUR_SIGN[c]} <span className="text-[11px] font-medium">{c}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="min-w-0 text-right">
              <div className="truncate font-display text-[64px] font-light leading-none text-[#1B7FC3]">{typing || fmtNum(amount, cur)}</div>
              {tokens.length > 0 && <div className="mt-2 truncate font-display text-[14px] text-faint">{exprText}</div>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 px-6 pt-8">
            <button type="button" onClick={() => pickGubun('수입')} className="h-16 rounded-2xl bg-gradient-to-r from-[#3FC7B0] to-[#4AD28A] font-display text-[22px] font-medium text-white active:opacity-90">
              수입
            </button>
            <button type="button" onClick={() => pickGubun('지출')} className="h-16 rounded-2xl bg-[#F46D93] font-display text-[22px] font-medium text-white active:opacity-90">
              지출
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 px-6 pt-3">
            <Link href={`/accounting/entry?full=1&date=${date}&gubun=이체`} className="flex h-11 items-center justify-center rounded-2xl border border-line bg-surface text-[15px] font-medium text-muted active:bg-surface-subtle">
              이체
            </Link>
            <Link href={`/accounting/entry?full=1&date=${date}&gubun=조정`} className="flex h-11 items-center justify-center rounded-2xl border border-line bg-surface text-[15px] font-medium text-muted active:bg-surface-subtle">
              조정
            </Link>
          </div>
          {err && <p className="px-6 pt-3 text-center text-[13px] text-red-700">{err}</p>}

          <div className="mt-auto">
            <div className="flex items-center justify-between border-b border-line px-4 py-2 text-[12px] text-faint">
              <div className="flex items-center gap-2">
                <button type="button" onClick={clearAll} aria-label="모두 지우기" className="flex h-9 w-12 items-center justify-center rounded-lg bg-[#F46D93]/15 font-display text-[17px] font-bold text-[#D1456F]">
                  C
                </button>
                {pendingOp && (
                  <button type="button" onClick={pressEquals} className="rounded-lg bg-surface-subtle px-3 py-1.5 font-display text-[15px] text-primary">
                    =
                  </button>
                )}
              </div>
              <Link href={`/accounting/entry?full=1&date=${date}`} className="text-[12px] text-muted underline-offset-2 hover:underline">
                상세 입력
              </Link>
            </div>
            <div className="grid grid-cols-4" style={{ gridTemplateRows: 'repeat(4, 72px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}>
              {(['7', '8', '9'] as const).map((d) => <button key={d} type="button" onClick={() => pressDigit(d)} className={key}>{d}</button>)}
              <button type="button" onClick={() => pressOp('/')} className={opKey}>÷</button>
              {(['4', '5', '6'] as const).map((d) => <button key={d} type="button" onClick={() => pressDigit(d)} className={key}>{d}</button>)}
              <button type="button" onClick={() => pressOp('*')} className={opKey}>×</button>
              {(['1', '2', '3'] as const).map((d) => <button key={d} type="button" onClick={() => pressDigit(d)} className={key}>{d}</button>)}
              <button type="button" onClick={() => pressOp('-')} className={opKey}>−</button>
              <button type="button" onClick={() => pressDigit('.')} className={key}>.</button>
              <button type="button" onClick={() => pressDigit('0')} className={key}>0</button>
              <button type="button" onClick={pressBack} aria-label="지우기" className={key}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M19 12H5" />
                  <path d="M12 19l-7-7 7-7" />
                </svg>
              </button>
              <button type="button" onClick={() => pressOp('+')} className={opKey}>+</button>
            </div>
          </div>
        </div>
      )}

      {/* ② 결제수단(계좌) */}
      {step === 2 && (
        <div className="flex flex-1 flex-col items-center overflow-y-auto px-8 pt-16">
          <p className="mb-6 text-[13px] text-faint">
            {gubun === '수입' ? '입금 계좌' : '결제 수단'} · {CUR_SIGN[cur]} {fmtNum(amount, cur)}
          </p>
          <div className="flex w-full max-w-xs flex-col gap-4">
            {accounts.same.map((a, i) => (
              <button key={a.id} type="button" onClick={() => pickAccount(a.id)} className="h-16 rounded-full text-[18px] font-medium text-white active:opacity-90" style={{ background: ['#D95C6B', '#9CD47A', '#86CFD6', '#E9A06C', '#9C8AD8', '#7FA6DE'][i % 6] }}>
                {a.name}
              </button>
            ))}
            {accounts.other.length > 0 && (
              <>
                <p className="pt-2 text-center text-[11px] text-faint">다른 통화 계좌</p>
                {accounts.other.map((a) => (
                  <button key={a.id} type="button" onClick={() => pickAccount(a.id)} className="h-12 rounded-full border border-line bg-surface text-[15px] text-muted active:bg-surface-subtle">
                    {a.name} <span className="text-[11px] text-faint">{a.currency}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* ③ 내역 · 항목 · 메모 */}
      {step === 3 && (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-6">
          <p className="px-1 text-[12px] text-faint">{accountName}</p>
          <div className="mt-2 flex items-center border-b border-line">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="내역"
              className="h-12 w-full bg-transparent font-display text-[24px] text-ink outline-none placeholder:text-faint/60"
            />
          </div>
          <div className="flex items-center border-b border-line">
            <input
              type="text"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="구매처"
              className="h-12 w-full bg-transparent font-display text-[24px] text-ink outline-none placeholder:text-faint/60"
            />
          </div>

          {useTabs && (
            <div className="mt-4 flex gap-2">
              {groups.map(([c]) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCatTab(c)}
                  className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition ${activeTab === c ? 'bg-primary text-white' : 'bg-surface-subtle text-muted'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          <div className="mt-5 grid grid-cols-5 gap-y-5">
            {gridItems.map((it) => (
              <button key={it.id} type="button" onClick={() => save(it.id)} disabled={saving} className="flex flex-col items-center gap-1.5 active:opacity-70 disabled:opacity-50">
                <CatIcon name={it.name} category={it.category} color={itemColor.get(it.id)?.fill ?? '#D3D1CC'} size={60} />
                <span className="max-w-full truncate text-[12px] text-ink">{it.name}</span>
              </button>
            ))}
            <div className="flex flex-col items-center gap-1.5 [&_button]:flex [&_button]:h-[60px] [&_button]:w-[60px] [&_button]:items-center [&_button]:justify-center [&_button]:rounded-full [&_button]:bg-[#C9C7C2] [&_button]:text-white">
              <ItemAddButton gubun={gubun} categories={categories} onCreated={(id) => save(id)} />
              <span className="text-[12px] text-ink">추가</span>
            </div>
          </div>

          {err && <p className="mt-3 text-center text-[13px] text-red-700">{err}</p>}
          {saving && <p className="mt-3 text-center text-[13px] text-muted">저장 중…</p>}
        </div>
      )}
    </div>
  )
}
