-- MFH patch69: 오프닝 스플래시 문구 확장 (구절참조·영문주제·인용구)
-- 멱등: 컬럼 없을 때만 추가. RLS 변경 불필요(year_themes 기존 정책 적용).

alter table public.year_themes add column if not exists verse_ref text; -- 스플래시 상단 구절 참조 (예: 이사야 43:19)
alter table public.year_themes add column if not exists theme_en  text; -- 영문 주제 (예: God Will Make a Way)
alter table public.year_themes add column if not exists quote     text; -- 말씀 인용구

-- 이번 주(2026) 문구 시드 — 행이 있으면 텍스트 필드 갱신.
-- 목표(goals)는 타입 일관성을 위해 /theme 관리 화면에서 설정하세요.
update public.year_themes set
  verse_ref = '이사야 43:19',
  theme_en  = 'God Will Make a Way',
  theme     = '주님이 길을 내십니다',
  quote     = '내가 광야에 길을, 사막에 강을 내리니'
where year = 2026;
