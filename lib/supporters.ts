// MFH-SUPPORTERS-LIB-V1
// 후원자 관리 공통 헬퍼 — 라벨 매핑·나이 계산·통화 환산·헌금 합계·사진 업로드.
import type { SupabaseClient } from '@supabase/supabase-js'
import { makeThumbnail } from './imageResize'
import type { Currency, DonationType, SupporterDonation, SupporterLogType } from './types'

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
