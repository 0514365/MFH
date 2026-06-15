-- MFH patch96: 할 일 선행/후속 작업 (관계 표시용)
--
-- tasks 에 predecessor_ids(선행), successor_ids(후속) uuid[] 추가.
-- 같은 프로젝트의 할 일 id 배열. 여러 개 지정 가능.
-- ★ sort_order(patch95) 와 독립 — 나열 순서는 ↑↓ 수동 그대로이고,
--   이 두 컬럼은 프로젝트 상세에서 '선행: ○○ / 후속: ○○' 표시에만 쓴다(자동 정렬 안 함).
-- 저장은 tasks UPDATE(본인 또는 마스터, patch73·91) 로 충분 — 별도 정책 불필요.
-- 멱등: add column if not exists. 재실행해도 안전.

begin;

alter table public.tasks add column if not exists predecessor_ids uuid[];
alter table public.tasks add column if not exists successor_ids   uuid[];

commit;
