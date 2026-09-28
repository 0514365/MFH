# MFH → MANNA 이관: 통독 범위(전체/구약만/신약만) + 장 단위 「본문 읽기」·「읽기표 체크 후 다음장」

> 작성 2026-09-28 (MFH 앱 3.6.0, 커밋 `5f0b20d` · `1b9305b` · `73ce06e`). MFH 에 구현·배포·실기기 「성공」 확인된 두 기능을 Manna 앱에 동일하게 구현하기 위한 인수인계 자료.
> 두 repo 는 같은 Dropbox 폴더(`…/Dropbox/MFH`, `…/Dropbox/Manna`)에 있어 Manna 세션이 `../MFH/...` 를 **직접 읽을 수 있다.** 코드는 복사본을 두지 않고 경로로 가리킨다(이 문서가 정본, 코드는 MFH 파일이 정본).
> 같은 문서를 `Manna/docs/MFH-TO-MANNA-BIBLE-RANGE-CHAPTER-READ.md` 에 복사해 둔다(Manna repo 커밋은 Manna 세션에서).
> 선행 문서: `MANNA-TO-MFH-BIBLE-TEXTS.md`(09-25, `bible_texts`·통독 「본문 읽기」) · `MFH-TO-MANNA-BIBLE-STUDY.md`(09-27, `/bible/study`). 두 앱의 `lib/bible/plan.ts`·`checkin.ts`·`texts.ts`·통독 폼·읽기 화면이 같은 키트에서 출발했다는 전제.

---

## 0. 한눈에

| 블록 | 무엇 | MFH 정본 | Manna 에서 할 일 |
|---|---|---|---|
| ① 통독 범위 | 계획 수립 시 **신구약 전체 / 구약만(929장) / 신약만(260장)** 선택. 부분 범위는 정경 순, 읽기 순서 항목 숨김. 기본 타이틀·기간 자동 조정 | `lib/bible/plan.ts` **V2** · `app/bible/PlanForm.tsx` **V2** · `supabase/patch107-bible-plan-scope.sql` | `plan.ts` 에 범위 인자 추가 + `PlanForm` 범위 세그먼트 + SQL(§1). **컬럼명 주의**: Manna `reading_plans.scope` 는 이미 `personal/group` 이므로 **`read_range`** 로(§1-3). `orderedChapters` 를 쓰는 곳이 MFH 보다 많다(§1-4 표) |
| ② 장 단위 읽기 | `/bible/read?day=N&ch=K` 한 장씩 + 장 칩 + 이전장/다음장(일차 경계 넘김) + **「읽기표 체크 후 다음장」** + 장별 「최근 읽은 때 · 총 N회」 | `app/bible/read/page.tsx` **V3.1** · `app/bible/read/ChapterCheck.tsx` **V2** · `lib/bible/checkin.ts` **V4**(`relativeKo`) · `supabase/patch108-bible-chapter-reads.sql` | 새 테이블 + 읽기 화면 재구성 + 체크 버튼(§2). Manna 는 `DayCheck` 가 **보상 평가·오프라인 안내**를 하므로 체크 버튼도 같은 후처리(§2-4). `PrefetchDays`·`sw.js` 는 장 URL 기준으로(§2-5) |
| ③ 참고 | `/bible/study` 모바일에서 패널이 하단 탭바 뒤까지 늘어나던 버그 | `app/globals.css` `main.bible-study-main` · `StudyClient` V2 · `Pane` V2 | Manna 는 레이아웃이 달라 **같은 증상이 있을 때만**(§3) |

MFH 실기기 확인: 범위별 미리보기(전체 1,189 / 구약 929 / 신약 260장, 분배 합계 일치), 신약만 90일 → 마태복음 1~4장 … 요한계시록 19~22장, 장 단위 읽기 + 체크 후 다음 장 이동 + "N분 전에 읽은 기록이 있음 (총 1회)", 다음 장에서 버튼 상태 초기화(`key` 재마운트, `73ce06e`).

---

## 1. ① 통독 범위

### 1-1. `lib/bible/plan.ts` — MFH V2 diff (Manna V1 = MFH V1 무수정 이식본이므로 diff 가 그대로 적용된다)

| 항목 | 추가/변경 |
|---|---|
| 타입 | `export type ReadScope = 'all' \| 'ot' \| 'nt'` → **Manna 에서는 `ReadRange` 로 이름 바꿔 이식**(`PlanScope`·`scope` 와 혼동 방지). 아래 모든 `scope` 도 `range` 로 읽는다 |
| 라벨 | `READ_SCOPE_LABEL = { all: '신구약 전체', ot: '구약만', nt: '신약만' }` |
| `scopeOrderLabel(scope, order)` | 전체면 `READ_ORDER_LABEL[order]`("구약부터"), 부분이면 범위 라벨("구약만"). 배지·조건 요약 공용 |
| `planScope(p)` | DB 행 → 범위. 컬럼 없거나 이상값이면 `'all'`(패치 전 행 호환) → Manna: `planRange(p)` = `p.read_range` 검사 |
| `orderedChapters(order, scope = 'all')` | 구약만 = 정경 순 929장, 신약만 = 정경 순 260장(부분 범위는 `order` 무시), 전체 = 기존 로직. `seq` 는 **그 목록의 인덱스**(DB `start_seq/end_seq` 의미가 범위별로 달라짐) |
| `scopeTotals(scope)` | `{ chapters, chars }` — 계획 저장 `total_chapters/total_chars` 와 폼 안내문 |
| `labelFromSeq(order, start, end, short, scope = 'all')` | 마지막 인자 추가 |
| `ScheduleInput.scope?` · `ScheduleStats.totalChapters/totalChars` | `buildSchedule` 이 `TOTAL_CHAPTERS` 대신 목록 길이로 "읽는 날 > 총 장수" 오류·`avgChapters` 계산 |

`TOTAL_CHAPTERS` 는 `planProgress` 의 분모 폴백(행 없음)에만 남는다.

### 1-2. `app/bible/PlanForm.tsx` — 폼 변경점

- 상태 `scope`(기본 `'all'`) + `changeScope(next)`:
  - 타이틀이 **기본값 그대로일 때만** `"{연도} 성경 1독" / "구약 1독" / "신약 1독"` 으로 갱신.
  - 종료일이 **기본값 그대로일 때만** 기간 조정: 전체·구약 = 시작+364일, 신약 = 시작+89일(90일, 하루 약 3장). 사용자가 직접 고친 값은 건드리지 않는다.
- UI: 「읽기 제외 요일」 다음에 **「통독 범위」 세그먼트 3개**(같은 `Segmented`), 아래 안내 1줄 `"{범위} {장수}장 · {글자수}자 — 정경 순으로 읽습니다."`(부분일 때만 뒷문장). **범위가 전체일 때만 「읽기 순서」 세그먼트 표시.**
- 저장: `read_scope`(Manna: `read_range`) 컬럼 + `total_chapters: preview.stats.totalChapters`, `total_chars: preview.stats.totalChars`. `TOTAL_CHAPTERS/TOTAL_CHARS` import 제거.
- `buildSchedule({ …, scope })` 에 범위 전달.
- Manna 폼은 그룹 계획 토글이 추가돼 있으므로 위 항목만 끼워 넣는다. `/bible/new` 안내문에 "범위(전체/구약/신약)" 추가(MFH `app/bible/new/page.tsx` V2).

### 1-3. SQL — `supabase/patch14-bible-plan-range.sql` (멱등)

```sql
-- MANNA patch14 — 통독 범위(read_range): all(신구약 전체 1,189장) / ot(구약만 929장) / nt(신약만 260장).
-- MFH patch107 대응. 컬럼명은 MFH 'scope' 대신 read_range — Manna reading_plans.scope 는 personal/group 이므로.
-- 부분 범위는 정경 순으로 읽으며 read_order 는 무시. reading_plan_days.start_seq/end_seq 는
-- 범위·순서별 목록 인덱스(lib/bible/plan.ts orderedChapters(order, range)). 기존 행은 'all'.
alter table public.reading_plans
  add column if not exists read_range text not null default 'all';
alter table public.reading_plans
  drop constraint if exists reading_plans_read_range_check;
alter table public.reading_plans
  add constraint reading_plans_read_range_check
  check (read_range in ('all', 'ot', 'nt'));
```

`lib/bible/types.ts` `ReadingPlan` 에 `read_range: ReadRange`(patch 전 행 호환이 필요 없으면 필수 필드로; MFH 는 `scope?:` 옵셔널 + `planScope()` 로 방어).

### 1-4. `orderedChapters` / `read_order` 소비처 — Manna 는 MFH 보다 많다 (전부 범위를 함께 넘길 것)

| Manna 파일 | 현재 | 변경 |
|---|---|---|
| `app/(app)/bible/read/page.tsx:74` | `orderedChapters(plan.read_order)` | `orderedChapters(plan.read_order, plan.read_range)` (§2 에서 어차피 재작성) |
| `lib/bible/redistribute.ts:53-70` `redistributePlan(days, today, order, mode)` | `orderedChapters(order)` | 인자 `range` 추가 → `orderedChapters(order, range)`. 호출부 `RedistributeButton.tsx:31` 에 `plan.read_range` 전달(`Pick<ReadingPlan, …>` 에 `read_range` 추가) |
| `app/(app)/bible/map/page.tsx:44,62` | `labelFromSeq(readOrder, start, end)` | `labelFromSeq(readOrder, start, end, false, range)`. 지도 진행 표시가 **정경 인덱스 기준**이면 부분 범위에서 seq→책 매핑이 어긋나므로 `orderedChapters(order, range)[seq]` 로 통일해서 확인 |
| `app/(app)/bible/join/JoinList.tsx:26,62,65` | 템플릿(그룹 계획)에서 `buildSchedule({… order: t.read_order …})`, `total_chapters: TOTAL_CHAPTERS` | `scope/range: t.read_range` 전달 + `read_range: t.read_range` 복제 + `total_chapters/total_chars` 는 `sched.stats.totalChapters/totalChars`(또는 `scopeTotals`) |
| `app/(app)/bible/page.tsx:152` · `plans/PlansList.tsx:22` | `READ_ORDER_LABEL[plan.read_order]` | `scopeOrderLabel(plan.read_range, plan.read_order)` |
| `lib/bible/stats.ts` · patch06 그룹 통계 | `total_chapters` 를 계획 행에서 읽음 | 변경 없음(범위 기준 값이 저장되므로 자동 반영). 그룹 목표 사다리(patch08)가 **1,189 고정**을 가정한 곳이 있으면 `plan.total_chapters` 로 |
| 보상(`lib/reward/*`) | 일차 done 기준 | 변경 없음 |

---

## 2. ② 장 단위 「본문 읽기」 + 읽기표 체크

### 2-1. 동작 규칙 (MFH `app/bible/read/page.tsx` V3.1)

- URL `?day=N&ch=K`(K = 일차 내 순번 1-based). `?day` 없으면 오늘(없으면 다음) 일차 — 기존과 같음. `?ch` 없으면 **이 계획에서 아직 체크하지 않은 첫 장**, 모두 체크했으면 1.
- 화면 순서: 머리(`Day N` + 「통독 →」 / 큰 제목 `"{책} {장}장"` / `"{일차 범위} · {날짜} · K/총장 · 읽음"`) → **장 칩**(일차에 2장 이상일 때만, 현재 장 채움, 체크된 장 `✓` 회색) → 버전 세그먼트 → 폴백 안내 → **본문 카드 1장** → `‹ 이전장 / 다음장 ›` 링크 → **「읽기표 체크 후 다음장」** 원형 버튼 → 기록 요약 1줄.
- 이전/다음 장은 **일차 경계를 넘는다**: 첫 장의 이전 = 앞 일차 마지막 장(`prev.end_seq - prev.start_seq + 1`), 마지막 장의 다음 = 다음 일차 1장. 없으면 빈칸. 마지막 장인데 다음 일차도 없으면 버튼 문구 「읽기표 체크」.
- 본문 조회는 `getChapterTexts(supabase, version, [ref])` 한 장. 선택 버전에 없으면 개역개정 폴백 + 안내(문구 "이 장이").
- 기록 조회: `bible_chapter_reads` 에서 **그 일차의 장 전부**(정경 `chap_seq` 배열, `chapSeqOf(book.order, chapter)`)를 `read_at desc` 로 한 번에 → 현재 장의 `count`/최근 + 「이 계획에서 체크됨」(`plan_id === plan.id`) 집합.
- `dayComplete` = 현재 장을 빼고 나머지 장이 모두 체크됨 → 버튼이 이 장을 저장한 뒤 **`setDayDone(day, true)`**(기존 `lib/bible/checkin` 규칙: 최초 기록 보존, 없으면 오늘·지금·예상분 자동). 이미 `done` 이면 건너뜀. 일차 체크(`DayCard`/`DayCheck`)는 그대로 공존.

### 2-2. `ChapterCheck.tsx` (client) — MFH V2

- props: `chapSeq · planId · day(CheckTarget & { done }) · dayComplete · nextHref · lastReadAt · readCount`.
- 클릭: `insert bible_chapter_reads { user_id, chap_seq, plan_id, plan_day_id }` → (dayComplete && !done) `setDayDone` → `router.push(nextHref)` + `router.refresh()`; nextHref 없으면 `refresh` 만.
- 요약 문구: `"{relativeKo(lastReadAt)}에 읽은 기록이 있음 (총 {n}회)"` / `"아직 읽은 기록이 없습니다"`.
- **함정(73ce06e)**: 다음 장으로 이동해도 URL 파라미터만 바뀌어 같은 컴포넌트 인스턴스가 재사용되고 「기록 중…」 이 남았다. 부모에서 `key={`${day.id}-${chapSeq}`}` 로 재마운트 + 컴포넌트 안 `useEffect(() => { setBusy(false); setMsg(null) }, [chapSeq])` 이중 안전장치. Manna 이식 시 **처음부터 둘 다 넣을 것.**
- `relativeKo(iso)`(`lib/bible/checkin.ts` V4 끝부분): 방금 전 / N분 전 / N시간 전 / 어제 / N일 전 / "9월 20일" / "2025. 9. 20". 온두라스 TZ(`HN_TZ`) 기준 — Manna 는 `lib/tz.ts` `APP_TZ` 가 같은 값이므로 그대로.

### 2-3. SQL — `supabase/patch15-bible-chapter-reads.sql` (멱등, MFH patch108 그대로)

```sql
-- MANNA patch15 — 장별 읽음 기록. 「읽기표 체크 후 다음장」 이 한 장마다 1행(재독이면 행 누적 → "총 N회").
-- chap_seq = 정경 순서 1..1189(lib/bible/texts.ts chapSeqOf) — 계획·범위·순서와 무관하게 누적.
create table if not exists public.bible_chapter_reads (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  chap_seq     integer not null check (chap_seq between 1 and 1189),
  plan_id      uuid references public.reading_plans (id) on delete set null,
  plan_day_id  uuid references public.reading_plan_days (id) on delete set null,
  read_at      timestamptz not null default now()
);
create index if not exists bible_chapter_reads_user_chap_idx
  on public.bible_chapter_reads (user_id, chap_seq, read_at desc);
alter table public.bible_chapter_reads enable row level security;
drop policy if exists "bible_chapter_reads owner select" on public.bible_chapter_reads;
create policy "bible_chapter_reads owner select" on public.bible_chapter_reads for select using (auth.uid() = user_id);
drop policy if exists "bible_chapter_reads owner insert" on public.bible_chapter_reads;
create policy "bible_chapter_reads owner insert" on public.bible_chapter_reads for insert with check (auth.uid() = user_id);
drop policy if exists "bible_chapter_reads owner delete" on public.bible_chapter_reads;
create policy "bible_chapter_reads owner delete" on public.bible_chapter_reads for delete using (auth.uid() = user_id);
grant select, insert, delete on public.bible_chapter_reads to authenticated;
```

Manna 는 본인 전용으로 시작하되, 그룹 통계(누가 어느 장까지)로 확장하려면 patch06 처럼 SECURITY INVOKER 집계 함수를 따로 둔다. `lib/bible/types.ts` 에 `BibleChapterRead` 타입(MFH `lib/types.ts` 참조).

### 2-4. Manna 치환표 (`app/(app)/bible/read/`)

| MFH | Manna |
|---|---|
| `redirect('/login')` + `supabase.auth.getUser()` | `requireActive()` + `getActivePlanWithDays(supabase, user.id)` (기존 read/page V4 방식 유지) |
| `Shell`(PageHeader "본문 읽기") · `CARD`/`NAV_BTN` 상수 | `Page` + `PageHeader title={"{책} {장}장"} eyebrow={`Day ${day.day_no}`} back="/bible"` · `Card` · `btnGhost`/`btnSmallGhost` |
| 장 칩 `rounded-full border …` | 그대로(토큰 동일). 현재 장 `bg-primary text-on-primary`, 체크됨 `bg-surface-subtle text-muted` |
| 「내부 열람용」 | 「소그룹 내부 열람용」(Manna 기존 문구) |
| `ChapterCheck` 클릭 후처리 없음 | **`DayCheck` V3 와 동일하게**: ① `isOffline()` 이면 저장하지 않고 안내(대기열 없음) ② `dayComplete` 로 `setDayDone` 이 실행된 경우에만 `/api/reward/evaluate` 호출 → `announceAwards(newAwards)` (장 체크만으로는 보상 평가 안 함 — 일차 done 이 바뀔 때만) |
| `import '../../p/portfolio-theme.css'` | 삭제 |

### 2-5. 오프라인 프리캐시 (`PrefetchDays` · `public/sw.js`)

- 현재 `read/page.tsx` 는 `ahead = [어제 1일차, 다음 2일차]` 의 `/bible/read?day=N` 을 `PrefetchDays` 로 미리 받는다. 장 단위가 되면 **URL 이 `?day=N&ch=K` 로 늘어나므로**: 현재 일차의 나머지 장 + 다음 일차 전체 장(보통 3~9개) URL 을 만들어 넘긴다. `sw.js:25` 의 `pathname === '/bible/read'` 매칭은 쿼리 무관이라 그대로 동작.
- `?ch` 없는 `/bible/read?day=N` 도 계속 유효(첫 미체크 장으로 열림) — 홈 카드·`DayCard` 「본문 읽기 →」 링크는 바꾸지 않아도 된다.
- 오프라인에서 체크 버튼은 2-4 ① 규칙(안내만). 후속으로 `OfflineRecorder` 대기열에 `bible_chapter_reads` insert 를 넣을 수 있다.

---

## 3. ③ 참고 — `/bible/study` 하단 탭바 가림 (MFH 에서만 재현된 버그)

원인: MFH `.app-theme { min-height: 100vh }` 가 2패널 `main` 의 `height: calc(100dvh - 76px - …)` 를 덮어써 패널이 탭바 뒤까지 늘어났고, 끝의 「이전 장 / 다음 장」 행이 안 보였다. 해결: `app/globals.css` 에 `main.bible-study-main { min-height: 0; height: calc(100svh - 76px - env(safe-area-inset-bottom, 0px)) }`(`@supports` 로 svh, 폴백 vh) + `Pane` 본문 `pb-5`.
Manna 는 `AppShell` 3레이아웃이라 같은 규칙이 없지만, **모바일에서 패널 끝 행이 하단 탭에 가리면** `Page`/컨테이너의 `min-height` 를 먼저 의심할 것. `env()` 는 반드시 `, 0px` 폴백을 붙인다(없으면 선언 전체가 무효).

---

## 4. 작업 순서 제안 (Manna 세션)

1. patch14(`read_range`) 콘솔 실행 → `plan.ts` V2 diff → `types.ts` → **§1-4 소비처 전부**(redistribute·map·join·배지) → `npx tsc --noEmit`.
2. `PlanForm` 범위 세그먼트 → 로컬에서 신약만 선택 시 90일·마태복음 1~4장, 구약만 365일·창세기 1~3장~말라기 확인.
3. patch15(`bible_chapter_reads`) 실행 → `checkin.ts` `relativeKo` → `ChapterCheck.tsx`(key + useEffect + 오프라인·보상 후처리) → `read/page.tsx` 재구성 → `PrefetchDays` URL.
4. 로컬: 체크 → 다음 장 이동 → 버튼 문구 복귀 → 되돌아와 "N분 전 … (총 1회)". 일차 마지막 장 체크 시 `/bible` 오늘 카드 done 켜짐 + 보상 이벤트.
5. 핸드오프 기록·커밋(단계별 승인). 버전은 우진이 꺼낼 때 MINOR 제안(새 기능 2개).

## 5. 참조 파일 경로(MFH 정본, Manna 세션에서 `../MFH/` 로 읽기)

```
lib/bible/plan.ts                       (V2: ReadScope·scopeTotals·orderedChapters(order, scope))
lib/bible/checkin.ts                    (V4: relativeKo)
lib/types.ts                            (ReadingPlan.scope? · BibleChapterRead)
app/bible/PlanForm.tsx                  (V2: 범위 세그먼트·기본 타이틀/기간 자동 조정)
app/bible/new/page.tsx                  (V2: 안내문)
app/bible/page.tsx · app/bible/plans/PlansList.tsx   (scopeOrderLabel 배지)
app/bible/read/page.tsx                 (V3.1: 장 단위·칩·이전장/다음장·key)
app/bible/read/ChapterCheck.tsx         (V2)
app/bible/study/StudyClient.tsx · Pane.tsx · app/globals.css   (§3 참고)
supabase/patch107-bible-plan-scope.sql
supabase/patch108-bible-chapter-reads.sql
```

---

## 6. Manna 세션 시작 프롬프트 (그대로 붙여 넣기)

```
docs/MFH-TO-MANNA-BIBLE-RANGE-CHAPTER-READ.md 를 읽고 MFH 에서 완성된 두 기능을 Manna 에 이식해줘.
MFH 정본 코드는 ../MFH/ 아래 경로로 직접 읽어(문서 §5 목록). 복사본 만들지 말고 Manna 규칙으로 치환해서 작성.

기능 1 — 통독 범위: 계획 수립(/bible/new)에서 「신구약 전체 / 구약만 / 신약만」 선택.
  · 컬럼명은 read_range (Manna reading_plans.scope 는 personal/group 이라 충돌). 타입은 ReadRange.
  · 부분 범위는 정경 순, 읽기 순서 항목 숨김. 기본 타이틀·기간(전체·구약 365일, 신약 90일)은 사용자가 안 고쳤을 때만 자동 조정.
  · orderedChapters(order, range) 소비처 전부 반영: read/page · redistribute.ts+RedistributeButton · map/page · join/JoinList(템플릿 read_range 복제, total_chapters/chars 범위 기준) · page/PlansList 배지(scopeOrderLabel).
  · SQL: supabase/patch14-bible-plan-range.sql (문서 §1-3, 멱등).

기능 2 — 장 단위 본문 읽기: /bible/read?day=N&ch=K 한 장씩 + 장 칩 + 이전장/다음장(일차 경계 넘김) + 「읽기표 체크 후 다음장」 버튼 + 그 아래 "N분 전에 읽은 기록이 있음 (총 N회)".
  · SQL: supabase/patch15-bible-chapter-reads.sql (문서 §2-3, MFH patch108 그대로).
  · ChapterCheck 는 처음부터 key={day.id-chapSeq} 재마운트 + useEffect(chapSeq) busy 초기화 둘 다 넣을 것(MFH 에서 「기록 중…」 잔류 버그 있었음).
  · Manna 후처리: 오프라인이면 저장 안 하고 안내(DayCheck V3 방식), 하루치가 채워져 setDayDone 이 실행된 경우에만 /api/reward/evaluate → announceAwards.
  · PrefetchDays 는 장 URL(현재 일차 나머지 장 + 다음 일차 전체 장) 기준으로.

진행 방식: 플랜 모드. 먼저 결정 테이블(컬럼명 read_range 확정, 신약 기본 기간 90일, 그룹 계획 템플릿의 범위 상속 여부)을 제시하고 승인 후
① patch14 + plan.ts + 소비처 + PlanForm → tsc → 로컬 확인(신약만 90일 마태복음 1~4장 / 구약만 365일 창세기 1~3장~말라기)
② patch15 + checkin relativeKo + ChapterCheck + read/page + PrefetchDays → tsc → 로컬 확인(체크 → 다음 장 이동 → 버튼 복귀 → 되돌아와 "총 1회")
순서로 단계 분리. 커밋은 단계마다 승인 받고, push 는 내가 "push" 라고 할 때만.
SQL 은 내가 Supabase 콘솔에서 실행하니 파일만 만들고 실행 시점을 알려줘. 끝나면 핸드오프(MANNA-HANDOFF-v2k) 작성.
```
