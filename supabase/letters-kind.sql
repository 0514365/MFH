-- MFH-LETTERS-KIND-V1 — 선교편지 종류(kind): 'letter'(월간 선교편지) / 'card'(인사 카드 — 성탄·신년·추석 등)
-- Supabase SQL Editor 에서 한 번 실행 (멱등 — 재실행 안전).
-- 용도: 인사 카드는 편지 목록·연도 그리드에는 표시하되 "최신 선교편지"(공개 페이지 최신호 블록,
--       인사이트 letter 렌즈의 최신호 기준)에서는 제외한다. 2026 추석인사(2026-09-24)부터 적용.
-- RLS 변경 불필요(동일 row, 기존 letters 정책 적용).

alter table public.letters
  add column if not exists kind text not null default 'letter';

alter table public.letters drop constraint if exists letters_kind_check;
alter table public.letters
  add constraint letters_kind_check check (kind in ('letter', 'card'));

comment on column public.letters.kind is
  'letter = 월간 선교편지(최신호 대상) / card = 인사 카드(목록에만 표시, 최신호·인사이트 기준에서 제외)';

-- 백필: 이전 인사 카드 2건(성탄 #2512 · 신년 #2601)도 card 로 표기.
update public.letters set kind = 'card'
 where kind = 'letter' and number in ('2512', '2601');
