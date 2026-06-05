import type { JournalEntry, JournalPhoto } from '@/lib/types'

// journal_entries 의 사진을 통합 처리. photos(신규 jsonb 배열) 우선, 없으면 레거시 단일 컬럼.
type PhotoSource = Pick<
  JournalEntry,
  'photos' | 'photo_path' | 'photo_taken_at' | 'photo_lat' | 'photo_lng' | 'photo_meta' | 'place_name'
>

export type ResolvedPhoto = {
  path: string
  place_name: string | null
  taken_at: string | null
  lat: number | null
  lng: number | null
  meta: Record<string, unknown> | null
}

// 원본 그대로의 사진 목록(대표 상속 없음). photos 우선, 없으면 레거시 단일 1장.
function rawList(entry: PhotoSource): ResolvedPhoto[] {
  const list = Array.isArray(entry.photos) ? entry.photos : null
  if (list && list.length > 0) {
    return list
      .filter((p): p is JournalPhoto => Boolean(p && p.path))
      .map((p) => ({
        path: p.path,
        place_name: p.place_name ?? null,
        taken_at: p.taken_at ?? null,
        lat: p.lat ?? null,
        lng: p.lng ?? null,
        meta: p.meta ?? null,
      }))
  }
  if (entry.photo_path) {
    return [
      {
        path: entry.photo_path,
        place_name: entry.place_name ?? null,
        taken_at: entry.photo_taken_at ?? null,
        lat: entry.photo_lat ?? null,
        lng: entry.photo_lng ?? null,
        meta: entry.photo_meta ?? null,
      },
    ]
  }
  return []
}

// 편집 폼용 — 사진별 값을 원본 그대로 전달(빈 장소는 빈 칸 유지).
export function journalPhotosForEdit(entry: PhotoSource): ResolvedPhoto[] {
  return rawList(entry)
}

// 표시용 — 사진별 장소·좌표가 비면 일지 레벨 대표값을 상속.
export function resolveJournalPhotos(entry: PhotoSource): ResolvedPhoto[] {
  return rawList(entry).map((p) => ({
    ...p,
    place_name: p.place_name ?? entry.place_name ?? null,
    lat: p.lat ?? entry.photo_lat ?? null,
    lng: p.lng ?? entry.photo_lng ?? null,
  }))
}

// 일지의 모든 사진 경로(중복 제거) — Storage 일괄 삭제용.
export function collectPhotoPaths(entry: Pick<JournalEntry, 'photos' | 'photo_path'>): string[] {
  const set = new Set<string>()
  if (Array.isArray(entry.photos)) {
    for (const p of entry.photos) if (p?.path) set.add(p.path)
  }
  if (entry.photo_path) set.add(entry.photo_path)
  return Array.from(set)
}
