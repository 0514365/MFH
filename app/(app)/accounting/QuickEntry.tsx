'use client'
// MFH-QUICK-ENTRY-V10 — 2027 토큰 승격: 지출/수입 면 리터럴 → b27-expense-soft / b27-income-soft
// MFH-QUICK-ENTRY-V9 — 2027 실기 피드백: ③ 블록 탭 = 선택(남색 안쪽 테두리) · 내역+구매처 2행 오른쪽 「저장」 버튼(통합 높이)으로 저장(즉시 저장 폐지 — 내역 못 쓰고 넘어가는 실수 방지)
//   · ① 이체/조정/상세 입력 글자 15px·500·남색
// MFH-QUICK-ENTRY-V8 — 2027 Minimal Block(c-3): 흰 바탕·남색 글자·Manrope. ① 통화 알약(남색)·큰 숫자 남색·[지출][수입] 연한 면 버튼·이체/조정/상세는 글자 링크·키패드 연회색(연산 = 연한 터키석, = 남색)
//   ② 계좌 = 이름 행 목록(통화 기호 오른쪽, 입력 통화 먼저) ③ 항목 = 블록 3열(이름만, 흰 글자 + 할로, 탭 = 즉시 저장) · 대분류 알약 · 추가 블록. 로직(계산기·저장·2026-09 가드)은 V7 그대로.
// MFH-QUICK-ENTRY-V7 — 상단 통화 선택은 기호만(L · $ · ₩), 선택 = 마룬 배경 흰 글자, 날짜 글자 축소(겹침 방지)
// MFH-QUICK-ENTRY-V6 — 통화 기호는 숫자 앞 작은 회색 글자 · = 뒤에도 계산 과정(식 = 결과)을 C 누를 때까지 표시
// MFH-QUICK-ENTRY-V5 — 통화 선택(L/$/₩)을 상단 날짜 줄 중앙으로 · 금액 숫자는 화면 폭 전체 사용(큰 L 글자 제거)
// MFH-QUICK-ENTRY-V4 — 입력 중 숫자도 천단위 쉼표 · 큰 숫자는 글자 크기를 자동으로 줄여 전부 표시(줄임표 없음)
// MFH-QUICK-ENTRY-V3 — [이체][조정] 아래 「상세 입력」 긴 버튼 · 키패드 위 줄 = C 와 = 를 같은 크기로 항상 표시
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
import { blockHalo } from '@/lib/palette'
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
// 입력 중 문자열("1234.5" · "1234." · "0.")에 천단위 쉼표 — 소수부·끝의 점은 그대로.
const fmtTyping = (t: string) => {
  const [int, dec] = t.split('.')
  const i = int ? Number(int).toLocaleString('en-US') : '0'
  return dec !== undefined ? `${i}.${dec}` : i
}
// 글자 수에 따라 큰 숫자 글꼴 크기 — 전부 보이게(줄임표 대신 축소).
const bigSize = (len: number) => (len <= 9 ? 64 : len <= 12 ? 52 : len <= 15 ? 42 : len <= 18 ? 34 : 28)

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
  const [history, setHistory] = useState('') // = 누른 뒤 남기는 「식 = 결과」(C 로 지움)
  const [gubun, setGubun] = useState<Gubun>('지출')
  const [accountId, setAccountId] = useState('')
  const [name, setName] = useState('')
  const [vendor, setVendor] = useState('')
  const [catTab, setCatTab] = useState<string | null>(null)
  const [itemId, setItemId] = useState('') // ③ 선택한 항목(블록 탭 = 선택, 저장 버튼 = 저장)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const legacy = date < '2026-09-01'
  const amount = useMemo(() => {
    const all = typing ? [...tokens, Number(typing)] : tokens
    return evaluate(all)
  }, [tokens, typing])
  const exprText = useMemo(() => {
    const parts = tokens.map((t) => (typeof t === 'number' ? fmtNum(t, cur) : OP_LABEL[t]))
    if (typing) parts.push(fmtTyping(typing))
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
    setHistory(`${exprText} = ${fmtNum(v, cur)}`)
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
    setHistory('')
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
    setItemId('')
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
  async function save() {
    if (saving) return
    if (!itemId) return setErr('항목을 선택하세요')
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
  const amtColor = gubun === '수입' ? 'text-b27-income' : 'text-b27-expense'
  const key = 'flex h-full items-center justify-center bg-b27-card font-num text-[26px] font-medium text-b27-ink active:opacity-70'
  const opKey = 'flex h-full items-center justify-center bg-[#DDF6F3] font-num text-[24px] font-medium text-b27-ink active:opacity-70'
  const iconBtn = 'flex h-10 w-10 items-center justify-center text-b27-ink'

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-b27-paper font-sans text-b27-ink md:hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* 상단 바 — ① 날짜 · 통화 알약(중앙) · ✕ / ②③ ← · 금액 · ✕ */}
      <div className="relative flex h-14 shrink-0 items-center justify-between px-3">
        {step === 1 && (
          <div className="absolute left-1/2 flex -translate-x-1/2 rounded-full bg-b27-card p-[3px]" role="radiogroup" aria-label="통화">
            {CUR_ORDER.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={cur === c}
                aria-label={c}
                onClick={() => setCur(c)}
                className={`flex h-8 w-10 items-center justify-center rounded-full font-num text-[15px] font-medium transition ${cur === c ? 'bg-b27-ink text-white' : 'text-b27-muted'}`}
              >
                {CUR_SIGN[c]}
              </button>
            ))}
          </div>
        )}
        {step === 1 ? (
          <label className="relative px-1 font-num text-[15px] text-b27-muted">
            {date.replace(/-/g, '.')}
            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="absolute inset-0 opacity-0" aria-label="날짜" />
          </label>
        ) : (
          <div className="flex items-center gap-2">
            <button type="button" onClick={goBack} aria-label="뒤로" className={iconBtn}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
            </button>
            <span className={`font-num text-[20px] font-medium ${amtColor}`}>
              {CUR_SIGN[cur]} {fmtNum(amount, cur)}
            </span>
          </div>
        )}
        <button type="button" onClick={close} aria-label="닫기" className={iconBtn}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      {/* ① 금액 + 계산기 */}
      {step === 1 && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="px-6 pt-2">
            {/* 계산 과정(입력 중 식 또는 = 뒤 「식 = 결과」) — 큰 숫자 위 작은 회색 */}
            <div className="min-h-[18px] break-all text-right font-num text-[13px] text-b27-muted">{tokens.length > 0 ? exprText : history}</div>
            {(() => {
              const text = typing ? fmtTyping(typing) : fmtNum(amount, cur)
              return (
                <div className="break-all text-right font-num font-medium leading-none tracking-[-0.02em] text-b27-ink" style={{ fontSize: bigSize(text.length), minHeight: 64 }}>
                  <span className="mr-2 text-[0.42em] font-normal text-b27-muted">{CUR_SIGN[cur]}</span>
                  {text}
                </div>
              )
            })()}
          </div>

          {/* 구분 — 탭 = 다음(계좌). 지출 = 연한 빨강 면 · 수입 = 연한 파랑 면 */}
          <div className="grid grid-cols-2 gap-[3px] overflow-hidden rounded-2xl px-6 pt-6">
            <button type="button" onClick={() => pickGubun('지출')} className="h-14 rounded-l-2xl bg-b27-expense-soft font-num text-[17px] font-medium text-b27-expense active:opacity-80">
              지출
            </button>
            <button type="button" onClick={() => pickGubun('수입')} className="h-14 rounded-r-2xl bg-b27-income-soft font-num text-[17px] font-medium text-b27-income active:opacity-80">
              수입
            </button>
          </div>
          <div className="flex justify-center gap-7 px-6 pt-3 text-[15px] font-medium text-b27-ink">
            <Link href={`/accounting/entry?full=1&date=${date}&gubun=이체`} className="py-1 active:opacity-60">
              이체
            </Link>
            <Link href={`/accounting/entry?full=1&date=${date}&gubun=조정`} className="py-1 active:opacity-60">
              조정
            </Link>
            <Link href={`/accounting/entry?full=1&date=${date}`} className="py-1 active:opacity-60">
              상세 입력
            </Link>
          </div>
          {err && <p className="px-6 pt-3 text-center text-[13px] text-b27-expense">{err}</p>}

          <div className="mt-auto">
            {/* C · = 줄 */}
            <div className="flex items-center justify-between px-4 py-2">
              <button type="button" onClick={clearAll} aria-label="모두 지우기" className="flex h-9 w-14 items-center justify-center rounded-full bg-b27-card font-num text-[16px] font-medium text-b27-muted">
                C
              </button>
              <button
                type="button"
                onClick={pressEquals}
                disabled={!pendingOp}
                aria-label="계산"
                className="flex h-9 w-14 items-center justify-center rounded-full bg-b27-ink font-num text-[18px] font-medium text-white disabled:opacity-25"
              >
                =
              </button>
            </div>
            {/* 키패드 — 연회색 블록, 흰 틈 3px, 연산 키 연한 터키석 */}
            <div className="grid grid-cols-4 gap-[3px] bg-b27-paper" style={{ gridTemplateRows: 'repeat(4, 68px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}>
              {(['7', '8', '9'] as const).map((d) => <button key={d} type="button" onClick={() => pressDigit(d)} className={key}>{d}</button>)}
              <button type="button" onClick={() => pressOp('/')} className={opKey}>÷</button>
              {(['4', '5', '6'] as const).map((d) => <button key={d} type="button" onClick={() => pressDigit(d)} className={key}>{d}</button>)}
              <button type="button" onClick={() => pressOp('*')} className={opKey}>×</button>
              {(['1', '2', '3'] as const).map((d) => <button key={d} type="button" onClick={() => pressDigit(d)} className={key}>{d}</button>)}
              <button type="button" onClick={() => pressOp('-')} className={opKey}>−</button>
              <button type="button" onClick={() => pressDigit('.')} className={key}>.</button>
              <button type="button" onClick={() => pressDigit('0')} className={key}>0</button>
              <button type="button" onClick={pressBack} aria-label="지우기" className={key}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M19 12H5" />
                  <path d="M12 19l-7-7 7-7" />
                </svg>
              </button>
              <button type="button" onClick={() => pressOp('+')} className={opKey}>+</button>
            </div>
          </div>
        </div>
      )}

      {/* ② 결제수단(계좌) — 이름 행 목록, 입력 통화 먼저 */}
      {step === 2 && (
        <div className="flex flex-1 flex-col overflow-y-auto px-6 pt-4">
          <p className="font-num text-[12px] text-b27-muted">{gubun === '수입' ? '입금 계좌' : '결제 수단'} · {CUR_SIGN[cur]} 계좌 먼저</p>
          <ul className="mt-2">
            {accounts.same.map((a) => (
              <li key={a.id} className="border-b border-b27-line">
                <button type="button" onClick={() => pickAccount(a.id)} className="flex h-14 w-full items-center justify-between text-left text-[16px] text-b27-ink active:opacity-70">
                  <span className="truncate">{a.name}</span>
                  <span className="font-num text-[14px] text-b27-muted">{CUR_SIGN[(a.currency as Cur) ?? 'HNL'] ?? a.currency}</span>
                </button>
              </li>
            ))}
          </ul>
          {accounts.other.length > 0 && (
            <>
              <p className="mt-6 font-num text-[12px] text-b27-muted">다른 통화</p>
              <ul className="mt-2">
                {accounts.other.map((a) => (
                  <li key={a.id} className="border-b border-b27-line">
                    <button type="button" onClick={() => pickAccount(a.id)} className="flex h-14 w-full items-center justify-between text-left text-[16px] text-b27-ink active:opacity-70">
                      <span className="truncate">{a.name}</span>
                      <span className="font-num text-[14px] text-b27-muted">{CUR_SIGN[(a.currency as Cur) ?? 'HNL'] ?? a.currency}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="mt-6 text-center text-[11px] text-b27-muted">계좌를 누르면 항목으로</p>
        </div>
      )}

      {/* ③ 내역 · 구매처 · 항목 블록 */}
      {step === 3 && (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-6">
          <p className="px-6 font-num text-[12px] text-b27-muted">{accountName}</p>
          {/* 내역 · 구매처 2행 + 오른쪽 저장 버튼(2행 높이 통합, 항목 선택 전엔 흐림) */}
          <div className="mx-6 mt-1 flex items-stretch gap-4">
            <div className="min-w-0 flex-1">
              <div className="border-b border-b27-line">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="내역"
                  className="h-12 w-full bg-transparent font-num text-[20px] text-b27-ink outline-none placeholder:text-b27-muted/60"
                />
              </div>
              <div className="border-b border-b27-line">
                <input
                  type="text"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="구매처"
                  className="h-12 w-full bg-transparent font-num text-[20px] text-b27-ink outline-none placeholder:text-b27-muted/60"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              aria-disabled={!itemId}
              className={`h-24 w-20 shrink-0 rounded-2xl bg-b27-ink font-num text-[16px] font-medium text-white transition active:opacity-80 ${itemId ? '' : 'opacity-30'}`}
            >
              {saving ? '…' : '저장'}
            </button>
          </div>

          {useTabs && (
            <div className="mx-6 mt-4 flex rounded-full bg-b27-card p-[3px]">
              {groups.map(([c]) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCatTab(c)}
                  aria-pressed={activeTab === c}
                  className={`flex-1 rounded-full py-1.5 text-[13px] transition ${activeTab === c ? 'bg-b27-ink font-medium text-white' : 'text-b27-muted'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* 항목 블록 — 3열, 흰 틈 3px, 이름만. 탭 = 선택(남색 안쪽 테두리), 저장은 위 버튼 */}
          <div className="mt-4 grid grid-cols-3 gap-[3px] bg-b27-paper" style={{ gridAutoRows: '76px' }}>
            {gridItems.map((it) => {
              const c = itemColor.get(it.id)
              const on = it.id === itemId
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => {
                    setErr('')
                    setItemId(it.id)
                  }}
                  disabled={saving}
                  aria-pressed={on}
                  className={`flex min-w-0 items-center justify-center px-2 text-[14px] font-medium text-white transition active:scale-[0.97] disabled:opacity-50 ${on ? 'shadow-[inset_0_0_0_3px_var(--b27-ink)]' : ''}`}
                  style={{ background: c?.bg ?? '#E4E7EC', textShadow: c?.n ? blockHalo(c.n) : undefined }}
                >
                  <span className="truncate">{it.name}</span>
                </button>
              )
            })}
            <div className="flex items-center justify-center bg-b27-card text-b27-muted [&>button]:flex [&>button]:h-full [&>button]:w-full [&>button]:items-center [&>button]:justify-center [&>button]:rounded-none [&>button]:border-0 [&>button]:font-num [&>button]:text-[24px] [&>button]:font-normal [&>button]:text-b27-muted">
              <ItemAddButton gubun={gubun} categories={categories} onCreated={(id) => setItemId(id)} />
            </div>
          </div>
          <p className="mt-3 text-center text-[11px] text-b27-muted">항목 블록을 고르고 저장을 누르세요</p>

          {err && <p className="mt-3 text-center text-[13px] text-b27-expense">{err}</p>}
          {saving && <p className="mt-3 text-center text-[13px] text-b27-muted">저장 중…</p>}
        </div>
      )}
    </div>
  )
}
