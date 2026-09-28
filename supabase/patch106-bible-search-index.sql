-- MFH patch106 — 성경 본문 단어 검색(/bible/study 「내용」 탭) 속도용 트라이그램 인덱스. 멱등.
-- 선행: patch105(bible_texts). 검색은 body ilike '%단어%' — 이 인덱스가 없어도 동작하며(약 9만 행 순차 스캔), 있으면 즉시 응답.
-- 실행 후 인덱스 크기는 수십 MB 수준(3버전 합산).

create extension if not exists pg_trgm;

create index if not exists bible_texts_body_trgm_idx
  on public.bible_texts using gin (body gin_trgm_ops);
