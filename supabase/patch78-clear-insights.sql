-- MFH patch78 — 인사이트 전체 삭제 (인사이트 IA 재설계 전 초기화)
-- Supabase SQL Editor(service_role)에서 1회 실행. 모든 사용자의 인사이트가 삭제됩니다.
-- 드롭박스 동기화 해시도 비워 다음 동기화에서 새로 회수되도록 한다.

delete from public.insights;

update public.insight_sources set last_hash = null;
