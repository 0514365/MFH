-- MFH patch119 — 인앱 성경 본문에 표준새번역(nksv) 버전 추가(2026-11-04). Manna patch37 이식.
--   bible_texts.version check 제약을 nkrv·nkt·esv·rvr·nksv 로 넓힌다. 본문 시딩은 scripts/bible-seed.ts nksv(service role).
--   열람 범위·RLS 는 patch105 그대로(멤버 전용 · 내부 열람용).
--   멱등: 다시 실행해도 결과 같음.

alter table public.bible_texts drop constraint if exists bible_texts_version_check;
alter table public.bible_texts
  add constraint bible_texts_version_check check (version in ('nkrv', 'nkt', 'esv', 'rvr', 'nksv'));
