-- MFH patch75: 일지 ↔ 중보기도 연계
-- journal_entries 에 intercession_id(nullable FK) 추가 — "이 기도로 일지 쓰기".
-- 중보기도 삭제 시 연결만 해제(set null), 일지는 보존.
-- 멱등: add column if not exists.

alter table public.journal_entries
  add column if not exists intercession_id uuid
  references public.intercessions (id) on delete set null;
