-- MFH patch107: 지출 항목 대분류 = 사역비/생활비 (B안) — 같은 이름 항목을 대분류가 다르면 허용
--
-- 배경: 지출 항목을 사역비/생활비 두 묶음으로 재편(2026-10-15). 주유·차량유지처럼 양쪽에 같은 이름이 필요하므로
--       유일성을 (구분, 이름) → (구분, 대분류, 이름) 으로 완화한다. 항목 시드·거래 이관은 scripts/accounting-items-reorg.ts.
-- 멱등. 실행: Supabase 콘솔 SQL Editor. 선행: patch102.

begin;

alter table public.acct_items drop constraint if exists acct_items_gubun_name_key;
drop index if exists public.acct_items_gubun_cat_name_idx;
create unique index acct_items_gubun_cat_name_idx
  on public.acct_items (gubun, coalesce(category, ''), name);

commit;
