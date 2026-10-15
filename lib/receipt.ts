// MFH-RECEIPT-V1
// 회계 영수증 — 브라우저 전용. 긴 변 1600px 로 줄여 비공개 'receipts' 버킷에 직접 업로드(patch111, 부부 멤버 RLS).
// 경로 = 'YYYY/MM/<uuid>.<webp|jpg>'(거래일 기준). 보기는 서명 URL(1시간). DB(acct_inout.receipt_path) 반영은 호출부(server action).
import type { SupabaseClient } from '@supabase/supabase-js'
import { makeThumbnail } from './imageResize'

export const RECEIPT_BUCKET = 'receipts'
const MAX_SIDE = 1600
const QUALITY = 0.82

// 업로드 → Storage 경로. date = 거래일(YYYY-MM-DD, 없으면 오늘).
export async function uploadReceipt(sb: SupabaseClient, file: File, date?: string): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('이미지 파일만 올릴 수 있습니다')
  const resized = await makeThumbnail(file, MAX_SIDE, QUALITY)
  const blob: Blob = resized?.blob ?? file
  const ext = resized?.ext ?? ((file.name.split('.').pop() || 'jpg').toLowerCase())
  const d = /^\d{4}-\d{2}/.test(date ?? '') ? date! : new Date().toISOString().slice(0, 10)
  const path = `${d.slice(0, 4)}/${d.slice(5, 7)}/${crypto.randomUUID()}.${ext}`
  const contentType = ext === 'webp' ? 'image/webp' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : file.type
  const { error } = await sb.storage.from(RECEIPT_BUCKET).upload(path, blob, { contentType, upsert: false })
  if (error) throw new Error(`영수증 업로드 실패: ${error.message}`)
  return path
}

// 저장 전 취소된 업로드 정리(실패 무시).
export async function discardReceipt(sb: SupabaseClient, path: string | null | undefined): Promise<void> {
  if (path) await sb.storage.from(RECEIPT_BUCKET).remove([path])
}

export async function receiptUrl(sb: SupabaseClient, path: string): Promise<string | null> {
  const { data } = await sb.storage.from(RECEIPT_BUCKET).createSignedUrl(path, 3600)
  return data?.signedUrl ?? null
}
