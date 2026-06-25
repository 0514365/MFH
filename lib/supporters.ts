// MFH-SUPPORTERS-LIB-V1
// 후원자 관리 공통 헬퍼 — 라벨 매핑·나이 계산·통화 환산·헌금 합계·사진 업로드.
import type { SupabaseClient } from '@supabase/supabase-js'
import { makeThumbnail } from './imageResize'
import { toCSV } from './csv'
import type { Currency, DonationType, Supporter, SupporterDonation, SupporterLogType } from './types'

export const SUPPORTER_PHOTO_BUCKET = 'supporter-photos'

// ── 라벨(UI 한국어) ──────────────────────────────
export const CURRENCY_LABEL: Record<Currency, string> = {
  KRW: '원 (₩)',
  USD: '달러 ($)',
}
export const CURRENCIES: Currency[] = ['USD', 'KRW']

export const DONATION_TYPE_LABEL: Record<DonationType, string> = {
  regular: '정기',
  purpose: '목적',
  onetime: '일시',
}
export const DONATION_TYPES: DonationType[] = ['regular', 'purpose', 'onetime']

export const LOG_TYPE_LABEL: Record<SupporterLogType, string> = {
  first_meet: '첫 만남',
  letter_sent: '선교편지 발송',
  visit: '방문',
  contact: '연락',
  prayer: '기도요청',
  other: '기타',
}
export const LOG_TYPES: SupporterLogType[] = [
  'first_meet',
  'letter_sent',
  'visit',
  'contact',
  'prayer',
  'other',
]

// ── 나이(만 나이) ──────────────────────────────
// today 를 넘기면 그 기준(온두라스 날짜 등), 없으면 실행 시점.
export function ageFromBirth(birth?: string | null, today?: string | null): number | null {
  if (!birth) return null
  const b = new Date(birth)
  if (Number.isNaN(b.getTime())) return null
  const now = today ? new Date(today) : new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age >= 0 ? age : null
}

// ── 통화 환산 ──────────────────────────────
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// USD 환산액. KRW 입력: amount / rate. USD 입력: 그대로. 환율 누락/0 이면 0(검증 실패 신호).
export function toUsd(amount: number, currency: Currency, exchangeRate?: number | null): number {
  if (currency === 'USD') return round2(amount)
  if (!exchangeRate || exchangeRate <= 0) return 0
  return round2(amount / exchangeRate)
}

// 금액 표시 — 통화기호 + 천단위 콤마. KRW 는 정수, USD 는 소수 2자리.
export function formatMoney(amount?: number | null, currency: Currency = 'USD'): string {
  if (amount == null) return '-'
  const sym = currency === 'KRW' ? '₩' : '$'
  const digits = currency === 'KRW' ? 0 : 2
  return (
    sym +
    Number(amount).toLocaleString('en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
  )
}

export function formatUsd(amount?: number | null): string {
  return formatMoney(amount, 'USD')
}

// ── 금액 입력 필드: 회계형(우측 정렬 + 통화별 자동 포맷) ──────────────────
// 숫자만 입력받아(점·콤마 무시) state(raw=digits)에 보관하고, 화면 표시만 포맷한다.
// KRW: 정수 + 천단위 콤마. USD: 입력 숫자를 '센트'로 해석해 우측에서 채우며 항상 소수 2자리 + 천단위 콤마.
//   예) USD 에서 1 → 2 → 3 입력 시 0.01 → 0.12 → 1.23 (입력 즉시 2자리 유지).
export function sanitizeAmountInput(v: string): string {
  return v.replace(/\D/g, '')
}

export function formatAmountInput(raw: string, currency: Currency): string {
  if (!raw) return ''
  const n = Number(raw)
  if (currency === 'KRW') return n.toLocaleString('en-US')
  return (n / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// 저장용 숫자 변환 — KRW 는 정수(입력 그대로), USD 는 센트 → 달러(/100).
export function amountToNumber(raw: string, currency: Currency): number {
  const n = Number(raw) || 0
  return currency === 'KRW' ? n : n / 100
}

// 기존 저장값 → 입력 raw(digits). 편집 시 폼 채우기용. KRW=정수, USD=센트.
export function amountToRaw(amount: number | null | undefined, currency: Currency): string {
  if (amount == null) return ''
  return currency === 'KRW' ? String(Math.round(amount)) : String(Math.round(amount * 100))
}

// supporter_care 인사이트 content 에서 "감사·안부 메시지 초안" 부분만 추출(발송 도우미용).
// 4부 출력의 마지막 섹션이라, "메시지 초안" 헤더 줄 다음부터 끝까지를 가져온다.
export function extractMessageDraft(content: string | null | undefined): string | null {
  if (!content) return null
  const m = content.match(/메시지 초안[^\n]*\n([\s\S]+)$/)
  const draft = m ? m[1].trim() : null
  return draft || null
}

// ── 노션 연동용 export ──────────────────
// app_id(=supporter.id)를 매핑 키로 포함 → 노션 후원자 DB "앱ID" 컬럼과 1:1 연결.
// CSV: 한글 헤더(노션 수동 import 시 컬럼 자동 매칭). JSON: 영문 키(향후 API 동기화).
export function supportersToCSV(rows: Supporter[]): string {
  const header = [
    '앱ID', '이름', '생년월일', '소속', '직분', '지역',
    '전화', '이메일', 'SNS', '소개자', '첫만남',
    '정기후원', '정기통화', '정기금액', '기도제목', '메모', '활성',
  ]
  const body = rows.map((s) => [
    s.id,
    s.name,
    s.birth_date ?? '',
    s.affiliation ?? '',
    s.role ?? '',
    s.region ?? '',
    s.phone ?? '',
    s.email ?? '',
    s.sns ?? '',
    s.referrer ?? '',
    s.first_met_date ?? '',
    s.is_recurring ? 'Y' : 'N',
    s.recurring_currency ?? '',
    s.recurring_amount != null ? String(s.recurring_amount) : '',
    s.prayer_points ?? '',
    s.notes ?? '',
    s.is_active ? 'Y' : 'N',
  ])
  return toCSV([header, ...body])
}

export function supportersToJSON(rows: Supporter[]): string {
  const mapped = rows.map((s) => ({
    app_id: s.id,
    name: s.name,
    birth_date: s.birth_date,
    affiliation: s.affiliation,
    role: s.role,
    region: s.region,
    phone: s.phone,
    email: s.email,
    sns: s.sns,
    referrer: s.referrer,
    first_met_date: s.first_met_date,
    is_recurring: s.is_recurring,
    recurring_currency: s.recurring_currency,
    recurring_amount: s.recurring_amount,
    prayer_points: s.prayer_points,
    notes: s.notes,
    is_active: s.is_active,
  }))
  return JSON.stringify(mapped, null, 2)
}

// 헌금(supporter_donations) 노션 연동용 export — JSON(영문 키).
// supporter_app_id(=supporter_id)로 노션 후원자 relation 매핑, supporter_name 은 입출금기록 제목 참고용.
// 통화·원금·환율·환산액(USD) 모두 보존 → 노션 입출금기록(수입)에 이중통화로 등록.
export function donationsToJSON(
  rows: SupporterDonation[],
  supporters: Pick<Supporter, 'id' | 'name'>[],
): string {
  const nameById = new Map(supporters.map((s) => [s.id, s.name]))
  const mapped = rows.map((d) => ({
    supporter_app_id: d.supporter_id,
    supporter_name: nameById.get(d.supporter_id) ?? null,
    donation_date: d.donation_date,
    currency: d.currency,
    amount: d.amount,
    exchange_rate: d.exchange_rate,
    amount_usd: d.amount_usd,
    donation_type: d.donation_type,
    purpose: d.purpose,
    method: d.method,
    note: d.note,
  }))
  return JSON.stringify(mapped, null, 2)
}

// 헌금 USD 합계.
export function donationTotalUsd(rows: Pick<SupporterDonation, 'amount_usd'>[]): number {
  return round2(rows.reduce((s, r) => s + (Number(r.amount_usd) || 0), 0))
}

// ── 사진 업로드(프로필 1장) — supporter-photos 버킷. 썸네일은 journal 과 동일 로직. ──
export type UploadedSupporterPhoto = { path: string; thumb_path: string | null }

export async function uploadSupporterPhoto(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<UploadedSupporterPhoto> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const rand = Math.random().toString(36).slice(2, 8)
  const base = `${userId}/${Date.now()}-${rand}`
  const path = `${base}.${ext}`
  const { error } = await supabase.storage
    .from(SUPPORTER_PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false })
  if (error) throw error

  // 목록용 썸네일 — 실패해도 원본은 보존(thumb_path=null → 원본 폴백).
  let thumb_path: string | null = null
  try {
    const thumb = await makeThumbnail(file)
    if (thumb) {
      const tPath = `${base}.thumb.${thumb.ext}`
      const { error: tErr } = await supabase.storage
        .from(SUPPORTER_PHOTO_BUCKET)
        .upload(tPath, thumb.blob, {
          contentType: thumb.ext === 'webp' ? 'image/webp' : 'image/jpeg',
          upsert: false,
        })
      if (!tErr) thumb_path = tPath
    }
  } catch {
    // 썸네일 생성/업로드 실패는 무시
  }
  return { path, thumb_path }
}
