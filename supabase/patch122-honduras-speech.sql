-- MFH patch122 — 온두라스 동향 낭독 대본(speech_script)
-- /news-update 가 화면용 브리핑과 함께 "듣기용 대본"을 써서 저장한다.
--   · 앱 동향 화면의 "듣기" 버튼과 시리 단축어(/api/honduras/speech)가 이 대본을 읽는다.
--   · 대본이 없는 지난 동향은 앱이 제목·본문으로 대본을 즉석 조립한다(null 허용).
-- RLS 는 기존 honduras_news 정책 그대로(컬럼 추가만). 멱등.

alter table public.honduras_news
  add column if not exists speech_script text;

comment on column public.honduras_news.speech_script is
  '듣기용 낭독 대본(합니다체 · 지명·인명 한글 발음 표기 · 출처·URL 없음). null 이면 앱이 제목·본문으로 조립.';
