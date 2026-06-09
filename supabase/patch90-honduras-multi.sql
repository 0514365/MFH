-- MFH patch90: 온두라스 동향 — 같은 날 여러 동향 보관(넘버링)
-- 기존: unique(user_id, news_date) → 하루 1행(재실행=덮어쓰기).
-- 변경: 같은 날에도 매번 새 행으로 누적한다(아침/저녁·반복 수동 생성 보관).
--   · 앱 목록은 같은 날짜를 "날짜 (N)" 으로 생성순 넘버링해 구분한다.
--   · 상세는 행의 고유 id(/honduras/[id])로 본다. 최신 페이지는 가장 최근 생성분.
-- 멱등: drop index if exists. (news_date 정렬용 honduras_news_date_idx 는 유지.)

drop index if exists public.honduras_news_user_date_idx;
