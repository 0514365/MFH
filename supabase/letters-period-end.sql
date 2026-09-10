-- MFH letters.period_end — 선교편지 "자료 기준 기간 종료일"
-- Supabase SQL Editor 에서 한 번 실행(멱등).
-- 용도: 앱 인사이트 루틴(letter 렌즈, scripts/insight-pull.ts V3)이 "직전 호 이후" 기록만 분석하도록
--       기준일을 제공한다. 미입력이면 pull 이 year_month 다음달 1일로 폴백한다.
-- 입력: 발행 마지막 단계에서 `node scripts/set-letter-summary.mjs --period <호수> <YYYY-MM-DD>`.
-- RLS 변경 불필요(동일 row, 기존 letters 정책 적용).

alter table public.letters
  add column if not exists period_end date;

comment on column public.letters.period_end is
  '자료 기준 기간 종료일 — 다음 호 편지 방향(letter 인사이트)은 이 날짜 다음날부터 분석';

-- 백필: 8월호(MFH #2608) 자료 기간 2026-08-03 ~ 2026-09-01 (letter-templates/issues/2026-08/materials.md).
update public.letters
   set period_end = '2026-09-01'
 where number = '2608' and period_end is null;

-- 7월호(MFH #2607) 자료 기간 2026-07-02 ~ 2026-07-31.
update public.letters
   set period_end = '2026-07-31'
 where number = '2607' and period_end is null;
