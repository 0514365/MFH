-- MFH-LETTERS-MOBILE-PATH-V1
-- 선교편지에 모바일 버전(HTML) 경로 추가 — 카드뉴스 PDF 와 모바일 편지를 함께 등록.
-- 실행: Supabase 콘솔 SQL Editor 에서 1회 (멱등 — 재실행 안전).

alter table public.letters add column if not exists mobile_path text;

comment on column public.letters.mobile_path is
  '모바일 편지 HTML (portfolio-letters 버킷 경로, 사진 임베드 단일 파일). null = PDF/영상만.';
