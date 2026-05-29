-- MFH patch67 — 선교편지 요약 기도문
-- Supabase SQL Editor 에서 한 번 실행.
-- 공개 페이지 "최신 선교편지" 블록의 우측 칼럼에 출력되는 요약 기도문 텍스트.
-- 최신호에만 입력(편집 화면에서 직접 작성). 이전 편지는 비워 둠.
-- RLS 변경 불필요(동일 row, 기존 letters 정책 적용).

alter table public.letters
  add column if not exists summary text;
