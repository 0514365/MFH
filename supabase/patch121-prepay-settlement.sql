-- MFH patch121: 선지급 ↔ 회수 연결 (settles_inout_id)
--
-- 배경: 회수(미수금 → 입금계좌 이체) 때 어느 선지급(지불계좌 → 미수금 이체)을 돌려받은 것인지 연결해,
--       선지급 건별 미회수·일부 회수·회수 완료 상태와 남은 금액을 보여준다(docs/MFH-CARD-SMS-INBOX-DESIGN.md §5-6).
-- 규칙: settles_inout_id = 회수 거래가 가리키는 선지급 거래 id. 부분 회수 허용(한 선지급에 회수 여러 건).
--       선지급 거래가 삭제되면 연결만 끊긴다(on delete set null). 연결 없는 회수도 허용(예전 방식).
-- 멱등. 실행: Supabase 콘솔 SQL Editor. 선행: patch120.

begin;

alter table public.acct_inout add column if not exists settles_inout_id uuid references public.acct_inout (id) on delete set null;
create index if not exists acct_inout_settles_idx on public.acct_inout (settles_inout_id) where settles_inout_id is not null;

commit;
