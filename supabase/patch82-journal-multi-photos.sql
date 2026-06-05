-- MFH patch82: 일지 사진 다중화 (최대 5장)
-- journal_entries 에 photos jsonb 추가. 각 요소: { path, place_name, taken_at, lat, lng, meta }.
-- 기존 단일 컬럼(photo_path 등)은 보존(읽기 fallback) + 첫 요소로 이전.
-- Storage 는 기존 journal-photos 버킷/정책({userId}/...) 그대로 재사용 — 정책 추가 없음.
-- 멱등: add column if not exists + photos 비어있는 행만 이전.

alter table public.journal_entries
  add column if not exists photos jsonb;

-- 기존 단일 사진 → photos 배열 첫 요소로 이전 (photos 비어있고 photo_path 있는 행만).
update public.journal_entries
set photos = jsonb_build_array(
  jsonb_strip_nulls(jsonb_build_object(
    'path', photo_path,
    'place_name', place_name,
    'taken_at', photo_taken_at,
    'lat', photo_lat,
    'lng', photo_lng,
    'meta', photo_meta
  ))
)
where photo_path is not null
  and (photos is null or jsonb_array_length(photos) = 0);
