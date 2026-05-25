import exifr from 'exifr'
import type { SupabaseClient } from '@supabase/supabase-js'

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

export async function uploadJournalPhoto(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const rand = Math.random().toString(36).slice(2, 8)
  const path = `${userId}/${Date.now()}-${rand}.${ext}`
  const { error } = await supabase.storage
    .from('journal-photos')
    .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false })
  if (error) throw error
  return path
}
