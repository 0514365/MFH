# MFH 핸드오프 v2az (세션 종료)

> 이전: `v2ay`(주간 Facebook 추천). 이번: **온두라스 동향(일일 뉴스 브리핑) 기능 신규 구현** — 새 홈 메뉴(최상단) + 매일 06:00 WebSearch 루틴. fb 패턴(pull→분석→push + 앱페이지 + 스케줄) 복제. 빌드·타입체크·스크립트 런타임 검증 통과. **미배포**(우진 승인 후 commit/push).

---

## 현재 위치 (한 줄)

**온두라스 동향 기능 코드 완성·로컬 검증 완료.** 매일 06:02 로컬 루틴이 WebSearch로 온두라스 뉴스(정치/경제/사회/문화 + San Pedro Sula·한인 강조 + 선교 인사이트)를 정리→앱 `/honduras`(홈 최상단 카드) 표시. **미결: ① patch88 SQL 콘솔 실행 ② 스케줄 첫 "Run now"로 권한 저장 ③ commit/push.**

---

## 이번 세션 작업 (신규 기능 — fb pull→분석→push 패턴 복제)

### 핵심 차이점 (기존 루틴과 다른 2가지)
1. **WebSearch 사용** — 기존 루틴(insight/fb)은 외부 검색 안 씀(비용 0). 이 루틴은 WebSearch가 핵심. **단 Claude Code 구독 범위 처리 → 종량제 API·`web_search` server tool 미사용 = 추가 현금 비용 $0**(메모리 [[api-cost-sensitive]] 무충돌, 구독 토큰 사용량만 증가). 우진 결정: 매일 06시 자동 / 표준 깊이 / 06:00 단독 루틴.
2. **정치 중립 예외** — CLAUDE.md 가드레일은 "정당·인물 거명 없이 중립". 이 페이지는 우진 요청대로 **정당·인물 실명 그대로 기재**(내부 동향 파악용). ⚠ **경계 명시**: 이 내용을 편지·FB·포트폴리오 등 외부 발신물에 옮길 때는 정치중립 규칙 다시 적용 — 코드 주석·스킬·스케줄 prompt·앱 푸터에 모두 박아둠.

### 산출물 (5개)
- **`supabase/patch88-honduras-news.sql`** — `honduras_news` 테이블(날짜별 1행: `sections` jsonb {politics/economy/society/culture 각 [{title,body,source}]} + `highlights` jsonb [{tag,title,body,source}] + `insight` text) + RLS(멤버읽기/본인쓰기, `is_member()` 재사용) + unique(user_id, news_date). **우진 콘솔 실행 필요.**
- **`scripts/news-pull.ts`(MFH-NEWS-PULL-V1)** — 작업지시서 stdout(오늘날짜 + 검색가이드 + 정리규칙 + result.json형식 + 최근 3일 헤드라인=중복회피). 앱 데이터 대신 "WebSearch로 찾을 것"을 지시. **로컬 타임존 기준 날짜**(todayStr의 UTC 회피 — 새벽 실행 시 하루 어긋남 방지). 테이블 없어도 "첫 실행"으로 안전 동작(검증됨).
- **`scripts/news-push.ts`(MFH-NEWS-PUSH-V1)** — result.json → `honduras_news` upsert(onConflict `user_id,news_date`=하루1행 덮어쓰기) + 아카이브(`insights-archive/_news/`, gitignore). 섹션·하이라이트 정규화·검증. 저장 귀속 `MFH_USER_ID`.
- **`.claude/commands/news-update.md`** — `/news-update` 스킬. allowed-tools에 **WebSearch 추가**(fb와 차이). pull→WebSearch(약5~6회)→정리(실명OK·사실기반·SPS/한인강조·선교인사이트)→result.json→push→보고.
- **앱**: `app/honduras/page.tsx`(MFH-HONDURAS-PAGE-V1, 서버컴포넌트·표시전용) — 최신1건: 하이라이트(부드러운 마룬 톤) + 4분야(은은한 구분색 점) + 선교인사이트(좌측 primary 보더). 빈 상태 UI. `app/page.tsx` — 홈 **최상단**(Log 위) 카드 추가("온두라스 동향" / Today in Honduras / 신문 인라인 SVG).

### 자동화
- **`~/.claude/scheduled-tasks/honduras-news-0600`** — 매일 06:00(cron `0 6 * * *`, jitter로 ~06:02) `/news-update` 실행. `mcp__scheduled-tasks__create_scheduled_task`로 등록 완료. **다음 실행 2026-06-10 06:02.**

### 검증
- 타입체크(`npx tsc --noEmit`)·빌드(`npm run build`) 통과. `/honduras` 라우트 생성 확인.
- `news-pull.ts` 실제 실행 → 작업지시서 정상 출력, 날짜 로컬기준 정확(2026-06-09), 테이블 미생성도 "첫 실행" 처리(에러 없음).
- (미실행) end-to-end: 실제 WebSearch→push→화면은 우진이 patch88 실행 후 `/news-update` 1회로 확인.

---

## 우진 미결 액션 (순서대로)
1. **`supabase/patch88-honduras-news.sql` Supabase 콘솔 실행** — 테이블 생성. 안 하면 `/honduras`가 빈 상태(쿼리는 안전 처리되나 데이터 없음).
2. **commit/push** — 현재 **미커밋**(코드 변경 전부 working tree). push → Vercel auto-build → 아이폰 `/honduras` 확인.
3. **스케줄 `honduras-news-0600` 첫 "Run now"** — WebSearch/Bash/Read/Write 권한을 task에 저장해야 무인 자동실행이 권한 프롬프트 없이 동작(fb 때와 동일 절차). 사이드바 "Scheduled"에서 실행.
4. (확인) 첫 Run now가 곧 end-to-end 테스트 — 결과가 `honduras_news`에 저장되고 `/honduras`에 떠야 정상.

## 주의·참고
- **시간대**: 루틴이 로컬(맥북) 타임존 06:00 실행 + 스크립트도 로컬 날짜 → `news_date` 일치. 맥북 타임존이 한국이면 한국 6시, 온두라스면 온두라스 6시.
- **맥북 켜져 있어야** 동작(기존 루틴과 동일 제약). 꺼지면 다음 켤 때 또는 수동 `/news-update`.
- 부부 공동: 저장은 `MFH_USER_ID`(우진) 1명 귀속이나 멤버 RLS로 둘 다 읽음(weekly_fb와 동일).

## 다음 세션 시작 시
1. 최신 핸드오프 = 이 문서(v2az) + 직전(v2ay).
2. 온두라스 동향 요약: `/news-update` 스킬(WebSearch) · `honduras_news` 테이블 · `/honduras` 페이지(홈 최상단) · `honduras-news-0600` 루틴(매일 06시). 정당·인물 실명(내부용, 외부 발신물엔 중립). 비용 구독내 $0.
3. 미결 백로그(변동): patch88 콘솔실행·commit/push·스케줄 Run now(위 미결) / postcss moderate 2건 / Next 16 업그레이드(보류) / (옵션) `/honduras` 과거 날짜 히스토리 보기·뉴스 출처 링크화.

*작성: 2026-06-09 세션. honduras-news 기능 코드 완성·로컬 검증, **미커밋·미배포**. `scheduled-tasks/honduras-news-0600`은 로컬 등록 완료(repo 밖).*
