// MFH-FX-V3 — closeMonth 가 새로 고정하면 그달 거래 재계산(rpc acct_restate_month, patch116)
// MFH-FX-V2 — 월 마감 환율(fx_closings, patch115): monthEnd·prevYm · closeMonth(고정) · getClosings(조회)
// MFH-FX-V1
// 공시 환율(fx_rates, patch114) 공용 — 수집(scripts/fx-collect.ts)·평가(회계 잔액 화면) 공용 순수 로직 + 조회.
//   · fetchKrwExim   — 한국수출입은행 Open API 매매기준율(USD). 비영업일·갱신 전(11시 KST 이전)엔 빈 응답 → 하루씩 거슬러 최대 7일.
//   · latestFxRates  — 통화별 최신 공시 환율 1행(평가 표시용).
//   rate = 1 USD 당 현지통화(acct_inout.rate 와 같은 방향).
import type { SupabaseClient } from '@supabase/supabase-js'

export type FxCurrency = 'HNL' | 'KRW'
export type FxSource = 'koreaexim' | 'bch' | 'manual'

export type FxRate = {
  rate_date: string // YYYY-MM-DD
  currency: FxCurrency
  rate: number
  buy: number | null
  sell: number | null
  source: FxSource
  source_url: string | null
}

const EXIM_URL = 'https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON'

const toNum = (s: unknown): number | null => {
  const n = Number(String(s ?? '').replace(/,/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

const kstYmd = (d: Date): string => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })

// 수출입은행 응답 행(필요 필드만). result: 1 성공 · 2 DATA 코드 오류 · 3 인증키 오류 · 4 일일 제한 초과.
type EximRow = { result?: number; cur_unit?: string; deal_bas_r?: string; ttb?: string; tts?: string }

// KST 기준 오늘(또는 지정일)부터 거슬러 첫 공시일의 USD 매매기준율. 실패 시 error.
export async function fetchKrwExim(
  apiKey: string,
  fromDate?: string,
): Promise<{ ok: true; fx: FxRate } | { ok: false; error: string }> {
  const start = fromDate ? new Date(`${fromDate}T12:00:00+09:00`) : new Date()
  for (let back = 0; back < 7; back++) {
    const d = new Date(start.getTime() - back * 86400000)
    const ymd = kstYmd(d)
    const url = `${EXIM_URL}?authkey=${encodeURIComponent(apiKey)}&searchdate=${ymd.replace(/-/g, '')}&data=AP01`
    let rows: EximRow[]
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) return { ok: false, error: `수출입은행 HTTP ${res.status}` }
      rows = (await res.json()) as EximRow[]
    } catch (e) {
      return { ok: false, error: `수출입은행 호출 실패: ${(e as Error).message}` }
    }
    if (!Array.isArray(rows) || rows.length === 0) continue // 비영업일·갱신 전
    const bad = rows.find((r) => r.result != null && r.result !== 1)
    if (bad) return { ok: false, error: `수출입은행 result=${bad.result} (3=인증키 오류, 4=일일 제한)` }
    const usd = rows.find((r) => r.cur_unit === 'USD')
    const rate = toNum(usd?.deal_bas_r)
    if (!usd || !rate) return { ok: false, error: '수출입은행 응답에 USD 매매기준율 없음' }
    return {
      ok: true,
      fx: { rate_date: ymd, currency: 'KRW', rate, buy: toNum(usd.ttb), sell: toNum(usd.tts), source: 'koreaexim', source_url: null },
    }
  }
  return { ok: false, error: '최근 7일 공시 없음' }
}

// 통화별 최신 공시 환율(없으면 키 없음).
export async function latestFxRates(sb: SupabaseClient): Promise<Partial<Record<FxCurrency, FxRate>>> {
  const out: Partial<Record<FxCurrency, FxRate>> = {}
  const { data } = await sb
    .from('fx_rates')
    .select('rate_date, currency, rate, buy, sell, source, source_url')
    .order('rate_date', { ascending: false })
    .limit(30)
  for (const r of (data ?? []) as FxRate[]) {
    if (!out[r.currency]) out[r.currency] = { ...r, rate: Number(r.rate), buy: toNum(r.buy), sell: toNum(r.sell) }
  }
  return out
}

// ── 월 마감 환율(patch115) ───────────────────────────────────────────────────
// 수입·지출 USD 환산 = 그달 월말일 공시 환율(고정). 진행 중인 달은 최신 공시(fx_rates)로 잠정.
// 2026-09 부터 적용 — 그 이전 기록은 저장된 amount_usd 를 확정값으로 둔다.
export const FX_CLOSE_FROM = '2026-09'

export type FxClosing = { ym: string; currency: FxCurrency; rate: number; rate_date: string; source: FxSource; source_url: string | null }

// 'YYYY-MM' → 그달 말일 'YYYY-MM-DD'
export function monthEnd(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return `${ym}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`
}
export function prevYm(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}

export async function getClosings(sb: SupabaseClient): Promise<FxClosing[]> {
  const { data } = await sb.from('fx_closings').select('ym, currency, rate, rate_date, source, source_url').order('ym')
  return ((data ?? []) as FxClosing[]).map((c) => ({ ...c, rate: Number(c.rate) }))
}

export type CloseOverride = { rate: number; rate_date: string; source: FxSource; source_url?: string | null }

// 그달 마감 환율 고정. 이미 있으면 건너뜀(force=true 면 덮어씀). 통화별 결과 메시지 반환.
//   · KRW: override → 없으면 수출입은행 API(월말일부터 거슬러 첫 공시일)
//   · HNL: override → 없으면 fx_rates 의 월말일 이전 7일 내 마지막 BCH 값
export async function closeMonth(
  sb: SupabaseClient,
  ym: string,
  opts: { eximKey?: string; force?: boolean; dryRun?: boolean; override?: Partial<Record<FxCurrency, CloseOverride>> } = {},
): Promise<{ currency: FxCurrency; status: 'saved' | 'exists' | 'missing' | 'error' | 'dry'; message: string }[]> {
  const end = monthEnd(ym)
  const floor = new Date(Date.parse(`${end}T00:00:00Z`) - 7 * 86400000).toISOString().slice(0, 10)
  const { data: existing } = await sb.from('fx_closings').select('currency').eq('ym', ym)
  const has = new Set((existing ?? []).map((r: { currency: string }) => r.currency))
  const out: { currency: FxCurrency; status: 'saved' | 'exists' | 'missing' | 'error' | 'dry'; message: string }[] = []

  for (const cur of ['HNL', 'KRW'] as FxCurrency[]) {
    if (has.has(cur) && !opts.force) {
      out.push({ currency: cur, status: 'exists', message: `${ym} ${cur} 이미 고정됨` })
      continue
    }
    let row: FxClosing | null = null
    const ov = opts.override?.[cur]
    if (ov) row = { ym, currency: cur, rate: ov.rate, rate_date: ov.rate_date, source: ov.source, source_url: ov.source_url ?? null }
    else if (cur === 'KRW') {
      if (!opts.eximKey) {
        out.push({ currency: cur, status: 'missing', message: `${ym} KRW: KOREAEXIM_API_KEY 없음` })
        continue
      }
      const r = await fetchKrwExim(opts.eximKey, end)
      if (!r.ok) {
        out.push({ currency: cur, status: 'error', message: `${ym} KRW: ${r.error}` })
        continue
      }
      row = { ym, currency: cur, rate: r.fx.rate, rate_date: r.fx.rate_date, source: 'koreaexim', source_url: null }
    } else {
      const { data } = await sb
        .from('fx_rates')
        .select('rate, rate_date, source, source_url')
        .eq('currency', 'HNL')
        .lte('rate_date', end)
        .gte('rate_date', floor)
        .order('rate_date', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!data) {
        out.push({ currency: cur, status: 'missing', message: `${ym} HNL: ${floor}~${end} 공시값 없음(--hnl 로 지정)` })
        continue
      }
      row = { ym, currency: cur, rate: Number(data.rate), rate_date: data.rate_date, source: data.source, source_url: data.source_url }
    }
    const msg = `${ym} ${cur} ${row.rate} (${row.rate_date} ${row.source})`
    if (opts.dryRun) {
      out.push({ currency: cur, status: 'dry', message: msg })
      continue
    }
    const { error } = await sb.from('fx_closings').upsert(row, { onConflict: 'ym,currency' })
    out.push(error ? { currency: cur, status: 'error', message: `${msg} 저장 실패: ${error.message}` } : { currency: cur, status: 'saved', message: `${msg} 고정` })
  }
  // 새로 고정한 통화가 있으면 그달 원통화 거래를 마감 환율로 재계산(DB 트리거 재실행). 이후 고정.
  if (out.some((o) => o.status === 'saved')) {
    const { data, error } = await sb.rpc('acct_restate_month', { p_ym: ym })
    out.push(
      error
        ? { currency: 'HNL', status: 'error', message: `${ym} 재계산 실패: ${error.message}` }
        : { currency: 'HNL', status: 'saved', message: `${ym} 거래 ${data ?? 0}건 마감 환율로 재계산` },
    )
  }
  return out
}
