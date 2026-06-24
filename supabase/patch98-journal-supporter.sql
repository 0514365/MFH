-- MFH patch98: 일지 ↔ 후원자 연계 (journal_entries.supporter_id)
--
-- 후원자 주도 연계: 후원자 상세에서 기존 일지를 선택해 연결하면 그 일지의 supporter_id 를 세팅한다.
--   일지 상세엔 연결된 후원자를 칩으로 표시(읽기). 일지 작성/편집 폼은 변경하지 않는다.
-- 권한: journal_entries 의 기존 RLS(본인/마스터 update — patch73/91)가 그대로 적용된다.
--   → 남의 일지를 후원자에 연결(supporter_id 변경)하는 것은 마스터만 가능. 본인 일지는 본인이.
--
-- 멱등: add column if not exists. RLS 변경 불필요(컬럼 추가만, 정책 그대로).
-- 실행: Supabase 콘솔 SQL Editor 에 붙여넣고 실행. patch97(supporters) 이후 적용.

alter table public.journal_entries
  add column if not exists supporter_id uuid references public.supporters (id) on delete set null;

create index if not exists journal_entries_supporter_idx on public.journal_entries (supporter_id);
