# MFH 핸드오프 v2dk (세션 종료)

> 이전: `v2dj`(`/bible/study` 2패널 리더 · 3.6.0). 이번 세션(2026-09-27~28): **통독 범위(전체/구약만/신약만) + 장 단위 「본문 읽기」·「읽기표 체크 후 다음장」·장별 읽음 기록 + `/bible/study` 모바일 하단 탭바 가림 수정 + Manna 이관 문서**. 앱 버전 **3.6.0 유지**(MINOR 후보 `3.7.0` — 새 기능 2개 + 새 화면 1개 누적, "버전" 요청 시 검토).

---

## 현재 위치 (한 줄)
**두 기능 모두 배포·실기기 「성공」(patch107·108 실행 완료). Manna 이관 문서+시작 프롬프트 작성 완료.** 다음 = Manna 세션에서 이식(문서 §6 프롬프트) → MFH 는 후속 개선 후보(아래) 중 우진 선택.

---

## 이번 세션 변경

| 커밋 | 파일 | 내용 |
|---|---|---|
| `5f0b20d` | `lib/bible/plan.ts` **V2** | `ReadScope('all'\|'ot'\|'nt')` · `READ_SCOPE_LABEL` · `scopeOrderLabel` · `planScope`(패치 전 행 → all) · `orderedChapters(order, scope)`(구약만 929 / 신약만 260장, 부분은 정경 순) · `scopeTotals` · `labelFromSeq(…, scope)` · `buildSchedule` 이 범위 장수로 오류·평균 계산, `stats.totalChapters/totalChars` |
| 〃 | `app/bible/PlanForm.tsx` **V2** · `new/page.tsx` V2 | 「통독 범위」 3단 세그먼트. 부분 범위면 「읽기 순서」 숨김. 기본 타이틀("2026 구약 1독")·기본 기간(전체·구약 365일, 신약 90일)은 **사용자가 안 고쳤을 때만** 자동 조정. 저장 `scope` + 범위 기준 `total_chapters/chars` |
| 〃 | `app/bible/page.tsx` V3 · `plans/PlansList.tsx` V2 · `lib/types.ts` | 배지·조건 요약 `scopeOrderLabel`. `ReadingPlan.scope?` |
| 〃 | `supabase/patch107-bible-plan-scope.sql` | `reading_plans.scope`(기본 all, check) — **실행 완료(09-27)** |
| `1b9305b` | `app/bible/read/page.tsx` **V3** | 장 단위 `?day=N&ch=K`. `?ch` 없으면 이 계획에서 미체크 첫 장. 머리(Day·책장·범위·K/총) + 장 칩(✓) + 버전 + 본문 1장 + `‹ 이전장 / 다음장 ›`(일차 경계 넘김) + 체크 버튼 + 기록 요약 |
| 〃 | `app/bible/read/ChapterCheck.tsx` **V1** | `bible_chapter_reads` insert → 하루치 모두 체크되면 `setDayDone`(기존 규칙) → 다음 장 push. 문구 "방금 전에 읽은 기록이 있음 (총 1회)" / "아직 읽은 기록이 없습니다" |
| 〃 | `lib/bible/checkin.ts` **V4** | `relativeKo(iso)` — 방금 전/N분 전/N시간 전/어제/N일 전/"9월 20일"/"2025. 9. 20"(온두라스 TZ) |
| 〃 | `supabase/patch108-bible-chapter-reads.sql` | 장별 읽음 기록 테이블(정경 chap_seq 1..1189, plan_id/plan_day_id set null, 본인 RLS) — **실행 완료(09-28)** |
| 〃 | `app/globals.css` · `study/StudyClient.tsx` V2 · `study/Pane.tsx` V2 | **원인**: `.app-theme { min-height: 100vh }` 가 2패널 `main` 높이를 덮어써 패널이 탭바 뒤까지 늘어남. `main.bible-study-main { min-height:0; height: calc(100svh - 76px - env(safe-area-inset-bottom, 0px)) }`(`@supports` svh, 폴백 vh). Pane 본문 `pb-5` |
| `73ce06e` | `read/page.tsx` V3.1 · `ChapterCheck.tsx` V2 | 다음 장 이동 시 「기록 중…」 잔류(같은 인스턴스 재사용) → `key={day.id-chapSeq}` 재마운트 + `useEffect(chapSeq)` busy 초기화 |
| `75567e5` | `docs/MFH-TO-MANNA-BIBLE-RANGE-CHAPTER-READ.md` | Manna 이관 문서(§0~5) + **§6 Manna 세션 시작 프롬프트**. `Manna/docs/` 에 복사됨(Manna 커밋은 Manna 세션) |

## 검증
- 알고리즘: 전체 1,189 / 구약 929(1,042,532자) / 신약 260(320,617자), 분배 합계 일치. 신약만 90일 → 마태복음 1~4장 … 요한계시록 19~22장.
- 로컬 dev 실측: 폼 범위 전환(타이틀·기간·순서 숨김), `/bible/read` 데스크탑·375px, `/bible/study` 375px 패널 하단 = 탭바 위(main 736px, navTop 739px).
- 실기기(우진): 범위 선택·장 단위 읽기·체크 후 다음 장·기록 요약·버튼 상태 복귀 모두 「성공」.
- `npx tsc --noEmit | grep -v "^docs/bible-qt-kit"` 통과.

## 다음 과제
1. **Manna 이식**: Manna 세션에서 `docs/MFH-TO-MANNA-BIBLE-RANGE-CHAPTER-READ.md` §6 프롬프트로 시작. 핵심 주의 = 컬럼명 `read_range`(Manna `scope` 충돌) · `orderedChapters` 소비처(재배분·지도·그룹 참여) · 체크 버튼 오프라인/보상 후처리 · 프리캐시 장 URL.
2. MFH 후속 후보: ① `/bible` 오늘 카드·홈 카드에 "오늘 K/총장 체크" 진행 표시(`bible_chapter_reads` 집계) ② 장 칩 탭 시 `/bible/study?ref=` 딥링크 ③ 통독 통계(장별 재독 횟수 히트맵) ④ 계획 수정 시 범위 변경(현재는 새 계획만).
3. (v2dj 이월) `/bible/study` 무한 스크롤 · 패널별 글꼴 · 즐겨찾기 DB 동기화 · letter 프롬프트 관찰 · 9월호 제작 · 인사 카드 kind 토글 UI · 회계 계좌 후속.

## 유의 사항
- **`env()` 는 반드시 `, 0px` 폴백** — 없으면 선언 전체 무효(이번 세션 실측). Tailwind 임의값으로 `env()`·`svh` 조합은 생성이 불안정해 globals.css 에 직접 둠.
- 장별 기록은 **정경 chap_seq** 기준이라 계획·범위·순서가 바뀌어도 "총 N회" 가 누적된다. 재독 시 행이 계속 쌓임(삭제 UI 없음).
- `ReadingPlan.scope` 는 옵셔널(`planScope()` 로 읽기) — patch107 이전 행 호환. Manna 는 `scope` 가 personal/group 이므로 이름이 다름.
- PWA SW 캐시·Dropbox `.next/` 동기화·`docs/bible-qt-kit` tsc 잡음은 v2dj 와 동일.
- 미커밋 잔여물(그대로 둠): `flyers/dongsan-2026-07/` 수정분, `applications/`, `reports/2026-H1/06-sermon-manuscript.md`, `scripts/measure-usage.ts`, `docs/bible-qt-kit/`, `letter-templates/assets/2026추석.heic`.
- 핸드오프 아카이브: `v2dj` → `docs/archive/` 이동.
