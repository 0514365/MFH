-- MFH patch93: daily_qt 에 commentary(본문 설명) 컬럼 추가.
-- 오늘 본문의 내용·성경 맥락·역사적(주목 시 문화적) 의미를 간략 해설. 묵상 위에 접이식으로 표시.
--   · Claude 가 신학 가드레일(대한예수교장로회 개혁주의 복음주의 · 구속사 연결 · 개역개정) 안에서 자체 작성.
--   · 성서유니온의 묵상 해설은 사용하지 않는다(자체 해설).
-- commentary: [{ heading, body }]
-- 멱등: add column if not exists.

alter table public.daily_qt
  add column if not exists commentary jsonb not null default '[]'::jsonb;
