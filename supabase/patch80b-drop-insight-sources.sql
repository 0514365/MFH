-- MFH patch80b: drop insight_sources — 드롭박스 준자동 회수 폐기. (구 patch80 — 번호 중복으로 80b 재명명)
-- 인사이트 갱신을 Claude Code Local 루틴(데스크톱)으로 이전하며 드롭박스 경유 경로를 제거한다.
-- 멱등: if exists. 테이블 drop 시 관련 RLS 정책도 함께 제거된다.
drop table if exists public.insight_sources;
