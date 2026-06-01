-- MFH patch79: insights.in_letter 플래그 추가 ("편지에 담기" 실저장).
--
-- 배경: 인사이트 카드의 "편지에 담기"가 클라이언트 로컬 토글뿐이라 새로고침 시 소실 →
--       letter(월간 기도편지) 생성·내보내기 입력에 사용자가 고른 인사이트를 반영할 수 없었다.
-- 조치: in_letter boolean 컬럼 추가(기본 false). letter 입력은 in_letter=true 우선,
--       하나도 없으면 기존대로 최근 prayer/fruit/overall 을 자동 합성(코드 측 처리).
-- 멱등: add column if not exists. 반복 실행해도 안전. RLS 는 기존 insights 정책 그대로.

begin;

alter table public.insights
  add column if not exists in_letter boolean not null default false;

commit;
