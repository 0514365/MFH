-- MFH patch89: 온두라스 동향 — 기도 포인트 분리(prayer_points)
-- 선교 인사이트(insight)에서 "기도/관심 포인트"를 별도 컬럼으로 분리해 앱에서 별도 박스로 표시한다.
--   · insight = 동향의 선교적 함의(본문).  prayer_points = 도출된 기도제목 1~2개(문자열 배열).
--   · 기존 행(patch89 이전 저장분)은 빈 배열 default → 다음 /news-update 부터 채워진다(하위호환).
-- 멱등: add column if not exists. RLS·정책 변경 없음(컬럼 추가만).

alter table public.honduras_news
  add column if not exists prayer_points jsonb not null default '[]'::jsonb;
