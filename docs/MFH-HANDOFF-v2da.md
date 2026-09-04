# MFH 핸드오프 v2da (세션 종료)

> 이전: `v2cz`(메일 서명 3종). 이번 세션: **성경통독(Bible in a Year) 모듈 신설** — 계획 수립·일정 자동 배분·읽음 체크·한 줄 은혜·기도제목 연동·홈 카드. 앱 버전 3.4.0 유지(버전 제안은 우진이 "버전" 꺼낼 때).

---

## 현재 위치 (한 줄)
**성경통독 모듈 코드 완성·`npm run build` 통과. 미커밋 상태. DB 패치(patch103) 는 우진이 Supabase 콘솔에서 실행해야 화면이 동작한다.**

---

## 이번 세션 작업

### 1. DB — `supabase/patch103-bible-reading.sql` (★ 콘솔 실행 필요, 앱 배포 전)
| 테이블 | 내용 |
|---|---|
| `reading_plans` | 계정별 계획: title, start_date, end_date, exclude_weekdays(smallint[] · JS getDay 0=일), read_order(`ot_first`/`nt_first`), split_mode(`chapters`/`chars`), total_days/chapters/chars, is_active, completed_at. **활성 1개/계정**(partial unique `where is_active`) |
| `reading_plan_days` | 하루 1행: day_no, read_date, start_seq/end_seq(읽기 순서상 장 인덱스), chapters, chars, range_label + 읽음 기록(done, read_on date, read_time time, read_minutes, grace, prayer_candidate, journal_entry_id → journal_entries set null). unique(plan_id, day_no) |
- RLS: 두 테이블 **본인 전용**(`auth.uid() = user_id`). 멤버 공유 없음(부부 각자 계획).

### 2. 라이브러리 `lib/bible/`
- `data.ts` — 개역개정 66권·1,189장 글자수(본문 없음, 총 1,363,149자). 첨부 자료 `bible-reading-plan/data/*.csv` 에서 생성(정합성 검증 포함).
- `plan.ts` — `readingDates`(제외 요일) · `orderedChapters`(구약/신약부터) · `splitByChapters` · `splitByChars`(편차제곱합 최소 DP, 365일 기준 ~35ms) · `buildSchedule`(일정+통계) · `rangeLabel`("창세기 1~15장" / "베드로후서 3장 ~ 요한계시록 6장") · `planProgress`/`progressBadge`(진행률·밀림) · 날짜 유틸.
- `checkin.ts` — 읽음 체크 공용 규칙: ON → read_on=오늘(온두라스)·read_time=지금·read_minutes=글자수÷500 / OFF → 셋 null(은혜·기도 연결 유지).
- 검증: `npx tsx scripts/verify-bible-plan.ts` — README 2027 사례(261일·평균 5,223자·4,220~6,226·1~19장) **정확히 일치**.
- 타입: `lib/types.ts` 에 `ReadingPlan`, `ReadingPlanDay` 추가.

### 3. 화면 `app/bible/`
| 경로 | 파일 | 내용 |
|---|---|---|
| `/bible` | `page.tsx` | 진행 요약(마룬 hero: N/총일·읽은 장·%·완독 예정·상태 배지) + 오늘/다음 분량 `DayCard` + 밀린 분량 + `ScheduleList`(월별 아코디언, 오늘 달만 펼침, 일요일 빨강) |
| `/bible/new` | `new/page.tsx` + `PlanForm.tsx` | 타이틀·기간(DateField)·제외 요일 칩·읽기 순서·배분 방식 + **실시간 미리보기** → 저장 시 기존 활성 계획 보관 → plan insert → days 200행 단위 insert(실패 시 plan 삭제로 원복) |
| `/bible/plans` | `plans/page.tsx` + `PlansList.tsx` | 계획 목록(활성/대기/완독, 진행률 바), 활성 전환(전부 해제 후 지정), 삭제(confirm, cascade) |
| 공용 | `DayCheck.tsx` | 즉시 update 체크 버튼(sm=목록, lg=홈) |
| 공용 | `DayCard.tsx` | 큰 체크 + 읽은 날/시각/소요 분 인라인 수정 + 한 줄 은혜(blur 저장) + **기도제목 포함** 토글 |
| 홈 | `BibleHomeCard.tsx` | 서버 컴포넌트. `app/page.tsx` 좌측 QT 카드 아래. 계획 없으면 「통독 계획 세우기」 카드 |

**기도제목 포함 규칙(DayCard)**: 은혜 텍스트 필수 → ON 시 `journal_entries` insert(category `'성경통독'`, headline `통독 · <범위>`, prayer=은혜, prayer_candidate=true, is_private/is_secret=false) 후 `journal_entry_id` 연결 → 기존 선교편지 collector(`[기도제목후보]`) 흐름에 자연 합류. OFF 또는 은혜 비우면 그 자동 일지 삭제 + 연결 해제. 은혜 수정 시 연결된 일지 prayer 동기화.

**홈 레이아웃**: sm(iPad 2열)에서 통독 카드를 주제 바로 아래 wide(`sm:order-2 sm:col-span-2`)로, QT·동향을 한 줄에. 모바일·lg 는 DOM 순서(주제→QT→통독→동향). `lg:order-none` 으로 리셋.

### 4. 통독 방법(patch104 — ★ 콘솔 실행 필요)
- `supabase/patch104-bible-read-method.sql`: `reading_plan_days.read_method` text (`aloud` 낭독 / `audio` 오디오 듣기 / `aloud_audio` 낭독+듣기 / null 미선택), check 제약.
- DayCard 에 「방법」 칩 3개(체크 전후 언제든 선택, 같은 칩 재탭 = 해제, 즉시 저장). 예상 소요 분 = 방법별 속도(낭독·듣기 280자/분, 미선택 = 묵독 500자/분, `lib/bible/checkin.ts` `READ_METHODS`). 읽음 상태에서 소요 분이 자동값 그대로면 방법 변경 시 재계산.
- DayCheck(홈·목록)는 저장된 방법으로 소요 분 추정. ScheduleList 읽은 행에 방법 짧은 라벨 표시.

### 5. 이전 기록 수정(우진 요청, 배포 확인 후 추가)
- `DayRow.tsx`(신규): 일정·밀린 분량 공용 행. 체크 버튼 + 본문 버튼(탭 → 아래에 `DayCard` 인라인 펼침, 재탭 = 닫기, 한 행만 펼침). 편집 규칙은 DayCard 하나로 통일(읽은 날·시각·소요 분·방법·은혜·기도제목).
- `ScheduleList.tsx` V3·`OverdueList.tsx`(신규) 가 DayRow 사용. `/bible/page.tsx` 밀린 분량 ul → OverdueList.
- 실기기 확인: patch103·104 적용 후 홈 카드·계획 수립·체크·방법·기도제목 일지 **모두 성공**(우진 2026-09-03).

### 6. 기록 보존·수정 흐름 정정(우진 피드백)
- **최초 완료 기록 보존**: 체크 ON 시 read_on/read_time/read_minutes 가 이미 있으면 그대로 두고(없을 때만 자동 입력), OFF 시에도 지우지 않음 → 다시 체크해도 처음 시각 유지. 시각은 사용자가 직접 바꿀 때만 변경(`lib/bible/checkin.ts` V3 `checkPayload(next, target)`; DayCheck 는 `target` prop 으로 기존 기록 전달).
- **DayCard V3 두 모드**: `live`(오늘/다음 카드 — 즉시 저장, 기존) / `record`(DayRow 펼침 — 읽기 전용 요약 → 「수정」 → 편집 폼(로컬 초안) → 「수정 완료」 일괄 저장 / 「취소」). 기도제목 일지 동기화는 `syncJournal()` 한 함수로 통일(생성·갱신·삭제).

### 7. 기타
- 화면 목업(승인용): `docs/mfh-bible-reading-mockup.html`.
- 하단 탭바(BottomNav) 변경 없음 — 홈 카드로 진입.

---

## 다음 과제

1. **우진**: Supabase 콘솔에서 `patch103-bible-reading.sql` → `patch104-bible-read-method.sql` 순서로 실행 → 커밋·푸시 승인 → Vercel 배포 후 실기기 확인(홈 카드·/bible/new 미리보기·체크·기도제목 일지 생성).
2. 실사용 후 조정 후보: 밀린 분량 **재분배**(남은 날에 미읽은 장 재배분), 구약·신약 병행 읽기(README 10절), 통독 완료 시 `completed_at` 자동 기록(현재는 진행률 100% 로 판정만).
3. 버전: 새 모듈 추가 = MINOR 후보(3.5.0) — 우진이 "버전" 꺼낼 때 제안.
4. v2cy 이월: 건축 예산 개정판, 예수소망교회 건 재개 여부.

## 유의 사항 (다음 세션)

- 미커밋 잔여물(이번 세션 무관): `flyers/dongsan-2026-07/`, `applications/`, `reports/2026-H1/06-sermon-manuscript.md`, `scripts/measure-usage.ts` — 손대지 않음.
- 맥 Mail 서명 파일 잠금 상태(v2cz 참조).
- 핸드오프 아카이브: `v2cz` → `docs/archive/` 이동 완료.
