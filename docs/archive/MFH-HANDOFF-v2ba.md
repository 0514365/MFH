# MFH 핸드오프 v2ba (세션 종료)

> 이전: `v2az`(① 온두라스 동향 메뉴 + 매일 06시 루틴 신설). 이번 세션: 같은 날 이어서 **온두라스 동향을 ②~⑤로 확장·완성** — 폰트확대 · 기도포인트 분리 · 지난 동향 목록/상세 · 같은 날 다중 보관(넘버링). **5 commit 모두 push·배포, DB patch88·89·90 콘솔 실행 완료.**

---

## 현재 위치 (한 줄)

**온두라스 동향 기능 사실상 완성·배포.** 홈 최상단 메뉴 → 최신 브리핑(정치/경제/사회/문화 + San Pedro Sula·한인 하이라이트 + 선교 인사이트 + 기도 포인트 박스) → 날짜 행 우측 **"지난 동향"** → 목록(같은 날 `(N)` 넘버링) → `[id]` 상세. 매일 06시 자동 + 수동 `/news-update`, **같은 날도 덮어쓰지 않고 누적 보관**. 분석은 정당·인물 실명(내부용) + 최신·여러 언론 공통 보도 우선.

---

## 이번 세션 5단계 (① = v2az, ②~⑤ = 이번 추가)

| 단계 | 내용 | commit | DB |
|------|------|--------|-----|
| ① | 메뉴 + 매일 06시 루틴(`/news-update` 파이프라인 + `/honduras` + 홈 카드 + 스케줄) | `e4998b6` | patch88 |
| ② | 폰트 전반 확대(본문 16px·제목/헤더 상향) | `95653b8` | — |
| ③ | "선교 인사이트" 타이틀 24px 강조 + **기도 포인트 별도 박스** | `c5041d2` | patch89 (`prayer_points` jsonb) |
| ④ | **지난 동향 목록**(`/honduras/archive`) + 날짜별 상세 + `BriefingView` 공통화 | `11fde8f` | — |
| ⑤ | **같은 날 다중 보관·넘버링** + 최신·공통 보도 우선 분석 + "지난 동향" 링크 우측 이동 | `c01a242` | patch90 (unique 제거, `[date]`→`[id]`) |

---

## 최종 데이터 모델 — `honduras_news`

`id` · `user_id` · `news_date` · `sections`(jsonb: politics/economy/society/culture 각 `[{title,body,source}]`) · `highlights`(jsonb: `[{tag,title,body,source}]` — SPS·한인) · `insight`(text) · `prayer_points`(jsonb 문자열배열) · `model` · `created_at`.

- RLS = 멤버 읽기 / 본인 쓰기(`is_member()`).
- **patch90으로 `unique(user_id,news_date)` 제거** → 같은 날 여러 행 허용. news-push는 **insert(누적)**.
- 넘버링 = `lib/honduras.ts` `seqSuffix()`: 같은 `news_date` 내 `created_at` 생성순으로 `(N)`. 1개뿐이면 표시 안 함.
- 최신 페이지 = `news_date desc, created_at desc, limit 1`(가장 최근 생성분).

## 파일 맵

- **SQL**: `supabase/patch88-honduras-news.sql`(테이블+RLS) · `patch89-honduras-prayer-points.sql`(기도포인트 컬럼) · `patch90-honduras-multi.sql`(unique 제거).
- **파이프라인**: `scripts/news-pull.ts`(작업지시서·최근헤드라인) · `scripts/news-push.ts`(insert·아카이브) · `.claude/commands/news-update.md`(스킬, WebSearch 포함).
- **앱**: `app/honduras/page.tsx`(최신) · `[id]/page.tsx`(상세) · `archive/page.tsx`(목록) · `BriefingView.tsx`(공통 렌더·타입·`NEWS_SELECT`·`hasBriefingContent`) · `lib/honduras.ts`(seqSuffix). 홈 카드 = `app/page.tsx` 최상단.
- **스케줄**: `~/.claude/scheduled-tasks/honduras-news-0600`(매일 06:00, jitter ~06:02 / repo 밖·미추적).

## 생성 파이프라인 (pull → WebSearch → push)

`/news-update`: news-pull(오늘날짜·검색가이드·result.json형식·최근헤드라인) → **WebSearch**(스페인어 현지매체 1차, 최신·여러 언론 공통 보도 우선) → `insights-archive/_news/result.json`(sections/highlights/insight/prayer_points) → news-push(insert) → 한국어 보고.
- **가드레일**: ★이 페이지는 **정당·인물 실명 그대로**(내부 동향 파악용) · 사실·출처 기반만(추측·날조 금지) · SPS·한인 강조 · 선교 인사이트는 중립·건설적. ⚠ **편지·FB·포트폴리오 등 외부 발신물엔 기존 정치중립 규칙을 다시 적용**(실명은 이 내부 페이지 한정) — 코드·스킬·스케줄 prompt·앱 푸터에 모두 명시.
- **비용**: Claude Code 구독 WebSearch = 종량제 API·`web_search` server tool 미사용 = **추가 현금 $0**(메모리 [[api-cost-sensitive]] 무충돌, 구독 토큰만 증가). 우진 결정: 매일 자동 / 표준 깊이.

---

## 우진 미결
- **스케줄 `honduras-news-0600` 첫 "Run now"** — WebSearch/Bash/Write 권한을 task에 저장해야 무인 06시 실행이 권한 프롬프트 없이 동작(fb 패턴과 동일, 미확인). 사이드바 Scheduled에서 1회 실행.
- (선택 검증) `/news-update`를 같은 날 두 번 돌려 목록에 `2026-06-09 (1)·(2)` 넘버링이 뜨는지 확인.

## 다음 세션 시작 시
1. 최신 핸드오프 = 이 문서(v2ba) + 직전(v2az).
2. 온두라스 동향 요약: `/news-update` 스킬(WebSearch) · `honduras_news`(같은 날 다중 보관) · `/honduras`(최신)·`/archive`(목록)·`[id]`(상세) · `honduras-news-0600` 루틴(매일 06시). 실명 내부용 / 외부 발신 중립 / 비용 $0.
3. 백로그(변동): 스케줄 Run now 권한(위 미결) / postcss moderate 2건 / Next 16(보류) / (옵션) archive 페이지네이션·뉴스 출처 링크화.

*작성: 2026-06-09 세션 종료. 온두라스 동향 ①~⑤ 완성, 5 commit(e4998b6·95653b8·c5041d2·11fde8f·c01a242) push 완료. patch88·89·90 콘솔 실행 완료. daily-routine 메모리도 갱신(같은 날 다중 보관 반영).*
