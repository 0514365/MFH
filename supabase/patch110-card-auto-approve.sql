-- MFH patch110: 카드 문자 자동 승인
--
-- 배경: 자주 가는 상점(상점 사전 적중)은 매번 승인하지 않고 수집기(scripts/ficohsa-collect.ts)가 바로 장부에 저장한다.
--       조건 = 상점 자동 켬 + 항목 보임 + 계좌 지정 + 통화 HNL/USD + 금액 ≤ 그 상점 최근 승인 10건 평균×3.
--       자동 승인분은 승인대기 화면 "자동 승인(최근 7일)" 에서 되돌릴 수 있다(장부 삭제 + 대기 복귀).
--       선행: patch103 · patch106.
-- 멱등. 실행: Supabase 콘솔 SQL Editor.

begin;

alter table public.merchant_rules add column if not exists auto_approve boolean not null default false; -- 이 상점은 자동 승인
alter table public.card_tx_inbox add column if not exists auto boolean not null default false;          -- 수집기가 자동 승인한 행

create index if not exists card_tx_inbox_auto_idx on public.card_tx_inbox (decided_at desc) where auto;

commit;
