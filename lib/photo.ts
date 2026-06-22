import exifr from 'exifr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { makeThumbnail } from './imageResize'

export type PhotoMeta = {
  takenAt: string | null
  lat: number | null
  lng: number | null
  raw: Record<string, unknown> | null
}

export async function readPhotoMeta(file: File): Promise<PhotoMeta> {
  let takenAt: string | null = null
  let lat: number | null = null
  let lng: number | null = null
  const raw: Record<string, unknown> = {}

  try {
    const parsed = (await exifr.parse(file, {
      pick: ['DateTimeOriginal', 'CreateDate', 'Make', 'Model', 'Orientation'],
    })) as Record<string, unknown> | undefined
    if (parsed) {
      const dt = (parsed.DateTimeOriginal ?? parsed.CreateDate) as unknown
      if (dt) {
        const d = dt instanceof Date ? dt : new Date(dt as string)
        if (!Number.isNaN(d.getTime())) takenAt = d.toISOString()
      }
      if (typeof parsed.Make === 'string') raw.make = parsed.Make
      if (typeof parsed.Model === 'string') raw.model = parsed.Model
      if (parsed.Orientation != null) raw.orientation = parsed.Orientation
    }
  } catch {
    // EXIF 없음/미지원
  }

  try {
    const gps = await exifr.gps(file)
    if (gps && typeof gps.latitude === 'number' && typeof gps.longitude === 'number') {
      lat = gps.latitude
      lng = gps.longitude
    }
  } catch {
    // GPS 없음
  }

  if (takenAt) raw.takenAt = takenAt
  if (lat != null) raw.lat = lat
  if (lng != null) raw.lng = lng

  return { takenAt, lat, lng, raw: Object.keys(raw).length ? raw : null }
}

// 업로드 결과 — 원본 경로 + 썸네일 경로(생성 실패 시 null).
export type UploadedPhoto = { path: string; thumb_path: string | null }

export async function uploadJournalPhoto(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<UploadedPhoto> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const rand = Math.random().toString(36).slice(2, 8)
  const base = `${userId}/${Date.now()}-${rand}`
  const path = `${base}.${ext}`
  const { error } = await supabase.storage
    .from('journal-photos')
    .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false })
  if (error) throw error

  // 목록·갤러리용 썸네일 — 원본과 별도로 1장 더 저장(`<base>.thumb.webp`).
  // 생성/업로드 실패해도 원본은 살리고 thumb_path=null(목록은 원본 폴백).
  let thumb_path: string | null = null
  try {
    const thumb = await makeThumbnail(file)
    if (thumb) {
      const tPath = `${base}.thumb.${thumb.ext}`
      const { error: tErr } = await supabase.storage
        .from('journal-photos')
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
