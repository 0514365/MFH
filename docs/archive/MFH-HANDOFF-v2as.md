# MFH 핸드오프 v2as

> 이전: `v2ar`(다중선택 복제·종료일 명확화). 이번: **반복 할 일을 "독립 행 → 연결된 시리즈"로 격상** + 할일 폼 데스크탑 전체폭.

---

## ⚠️ 우진 먼저 할 일 (배포 전 필수)

`supabase/patch85-task-recurrence.sql` 을 **Supabase 콘솔에서 먼저 실행**. (tasks 에 `recurrence_id`·`recurrence_freq` 컬럼 추가)
- 이 컬럼을 목록·상세·편집 쿼리가 조회하므로, SQL 실행 전에 배포되면 할일 화면이 깨집니다. **SQL 실행 → 그다음 푸시/배포** 순서.

---

## 현재 위치 (한 줄)

**반복 할 일이 `recurrence_id`로 묶인 시리즈가 됨 — 목록·상세·편집에 반복 뱃지, 편집/삭제 시 "이 항목만 / 이후 모두" 범위 선택.** 할일 폼은 데스크탑 2열 전체폭. tsc·build exit 0.

---

## 이번 세션 변경

### 스키마 (patch85, 우진 실행)
`tasks.recurrence_id uuid`(시리즈 묶음) + `tasks.recurrence_freq text`(daily/weekly/monthly). 부분 인덱스. 멱등. RLS 기존 정책 커버.

### 신규 파일
| 파일 | 역할 |
|---|---|
| `lib/recurrence.ts` | 라벨·`dayDelta`·`shiftDate`, `updateRecurringFollowing`(이후 정의필드+마감일 시프트), `deleteRecurringFollowing`(이후 미완료+현재 삭제) |
| `components/RecurrenceScopeModal.tsx` | "이 항목만/이후 모두/취소" 3버튼 모달 |
| `components/RecurrenceBadge.tsx` | 반복 아이콘 + 주기 칩(목록·상세·편집 공용) |

### 변경 파일
| 파일 | 변경 |
|---|---|
| `app/tasks/TaskForm.tsx`(V4) | **데스크탑 2열 전체폭**(`max-w-5xl`, 왼쪽 제목·설명·프로젝트 / 오른쪽 메타). 시리즈 생성(`crypto.randomUUID()` → 모든 발생행에 동일 `recurrence_id`+freq). 편집 시 이후 미완료 있으면 **수정 범위 모달**(이후=정의필드 동일+마감일 delta 시프트, 완료상태는 개별 유지). 삭제 범위 모달. **편집 폼에 복제 버튼**. 반복 뱃지·안내 |
| `app/tasks/[id]/DeleteButton.tsx` | 반복 항목이면 삭제 범위 모달(이 건만/남은 미완료 모두) |
| `app/tasks/TasksListClient.tsx` | `TaskListRow`+recurrence, 목록 카드·요약패널 반복 뱃지 |
| `app/tasks/page.tsx`·`[id]/page.tsx` | 쿼리·타입 recurrence 컬럼, 상세 뱃지, DeleteButton 연동 |
| `app/tasks/new/page.tsx` | 복제(`?from`) 시 recurrence null(독립 단건) |
| `lib/types.ts` | Task + recurrence 필드 |

---

## 설계 결정

- **"이후" 범위** = 같은 `recurrence_id` · 미완료 · 마감일 ≥ 현재. (완료된 과거 건은 보존)
- **마감일 변경 전파** = 바뀐 일수만큼 이후 항목 **시프트**(간격 유지). 비-날짜 정의필드(제목·설명·분류·장소·중요도·시간)는 동일 적용.
- **완료/진행 상태는 전파 안 함**(개별 유지).
- **복제본·단일복제는 시리즈에서 분리**(recurrence null).
- 마지막 항목 편집 등 **이후 항목이 없으면 모달 생략**(바로 단건 처리).

---

## 우진 액션 (SQL 실행 후 배포 후 확인)

1. **patch85 SQL 실행**(필수, 위 참조).
2. 새 할 일 **반복**(매주+종료일) 생성 → 목록에 여러 건 + **🔁 매주** 뱃지.
3. 그중 하나 **편집**해 마감일 변경 → **"이 항목만 / 이후 모두"** 모달 → "이후 모두" 시 남은 일정이 같은 간격으로 이동.
4. 하나 **삭제** → "이 건만 / 남은 미완료 모두" 모달.
5. 데스크탑 할일 폼이 **2열 전체폭**, 편집 폼에 **복제** 버튼.

> 검증: 로컬 `tsc`·`build` exit 0. 런타임은 SQL 실행 후 배포 URL에서.

---

## 관련 커밋(예정)

- `feat: recurring task series (recurrence_id) with this/following edit & delete scope`
- `feat: full-width 2-col task form on desktop + duplicate on edit`
- `docs: handoff v2as — recurring series + wide task form`

*작성: 2026-06-07 세션 (반복 시리즈 + 폼 전체폭). patch85 SQL 우진 실행 대기.*
