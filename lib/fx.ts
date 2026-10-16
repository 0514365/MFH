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
