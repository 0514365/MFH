# MFH 핸드오프 v2ae

> 이전 상태: `MFH-HANDOFF-v2ad.md` (선교편지 5-에이전트 팀) 참조.
> **이번 세션 주제: 할일·프로젝트·일지 연계 UX 개선 (완료 상태 연동 · 양방향 필터 · 완료 숨김).**

---

## 현재 위치 (한 줄)

할 일 완료 체크가 Status 와 연동되고, 로그 작성의 연계 선택이 양방향 필터+완료 접이식 드롭다운으로 바뀌었으며, 프로젝트 목록도 Tasks 와 동일하게 완료 자동 숨김. **3개 커밋 main 배포 완료, 실기기 확인됨.**

---

## 이번 세션 완료

### 1. 할 일 완료 체크 ↔ Status 연동 (`app/tasks/TaskCheck.tsx`)
- 기존: 완료 토글이 `done`·`completed_at` 만 변경.
- 변경: `status` 도 함께 — 완료 ON → `status='done'`, 완료 OFF → `status='in_progress'`.
- → Tasks 목록 StatusBadge 가 Done ↔ In Progress 자동 전환. (프로젝트 `ProjectStatusToggle` 과 동일 사상)
- 커밋 `6bf6057`.

### 2. 로그 작성 "연계" 선택 개편 (`components/LinkedPicker.tsx` 신규 + `app/journal/JournalForm.tsx`)
- native `<select>` 2개 → 커스텀 드롭다운 `LinkedPicker` 로 교체 (select 로는 "완료 N개 보기" 토글 펼침이 불가능해 신규 제작; 외부 클릭 닫힘).
- **양방향 필터**: 프로젝트 선택 → 할일은 그 프로젝트 소속만 / 할일 선택 → 그 할일의 프로젝트로 자동 설정·좁힘. 프로젝트 변경 시 안 맞는 기존 할일은 자동 해제.
- **완료 항목**: 미완료 기본 노출 + 하단 "완료된 프로젝트/할 일 N개 보기" 토글로 펼침. 완료 판정 = 프로젝트 `status==='done'` / 할일 `done || status==='done'`.
- 편집 모드: 기존 연계값이 완료·필터제외 항목이어도 `selectedLabel` 로 항상 표시.
- 로딩 쿼리에 `status`(projects), `done,status`(tasks) 컬럼 추가.
- 커밋 `2013e2a`.

### 3. 프로젝트 목록 완료 숨김 — Tasks 와 동일 (`lib/projectFilter.ts` + `app/projects/ProjectsList.tsx`)
- `ProjectFilter` 에 `hideDone` 추가(기본 `true`). 프로젝트엔 `done` 컬럼이 없어 `normalizeStatus(status)==='done'` 을 완료로 간주.
- 파싱·쿼리·기본값 판정 모두 Tasks 규칙과 동일(`done=0` 쿼리일 때만 표시).
- 필터바에 "완료 숨김" 칩 + 초기화 반영. URL 영속 → 상세(`projects/[id]`) 의 prev/next(◀▶)도 `parseProjectFilter`+`applyProjectFilter` 공유로 자동 동일 적용.
- 커밋 `73c3c69`.

---

## 다음 할 일

1. (선택) `LinkedPicker` 를 다른 폼(예: Task 편집의 프로젝트 선택 등)에도 재사용 검토 — 현재는 일지 연계 전용.
2. (선택) 연계 드롭다운 검색(타이핑 필터) — 항목이 많아지면 유용. 현재는 스크롤만.
3. (보류) 프로젝트/할일 목록의 sessionStorage 필터 영속: Tasks 만 있음(`taskFilter` save/read/clear). Projects 는 URL 영속만 — 의도적으로 동일범위로 안 맞춤(요청은 완료숨김 한정). 필요 시 `projectFilter` 에 동일 함수 추가.
4. 선교편지 팀(v2ad) 가동은 별개 트랙 — 그대로 대기.

---

## 주의사항

- **완료 판정 이원화 주의**: 할일은 `done`(boolean)·`status`('done') 두 컬럼이 공존. 세션1 변경으로 신규 완료는 둘 다 set 되지만, 과거 데이터는 `done=true` 인데 `status` 가 옛값일 수 있음 → 완료 판정은 항상 `done || status==='done'` OR 로 한다(JournalForm 이 그렇게 처리).
- `LinkedPicker` 는 부모가 active/done 분리 목록과 `selectedLabel` 을 계산해 넘기는 구조(컴포넌트는 표시·토글만). 양방향 필터 로직은 `JournalForm` 의 `projectItems`/`taskItems` useMemo + `pickProject`/`pickTask` 에 있음.
- `projectFilter`/`taskFilter` 는 목록과 상세가 **공유**. 필터 필드 추가 시 상세 prev/next 에 자동 영향 — 완료 항목 상세를 `done=0` 없이 열면 prev/next 목록에서 빠질 수 있음(Tasks 와 동일, 허용된 동작).
- 검증은 `npx tsc --noEmit` + `npm run build` (이 앱은 Supabase 인증 게이트라 로컬 미리보기 관찰 불가 → 빌드 통과 + 배포 후 실기기 확인이 표준).

---

## 관련 커밋

- `6bf6057` feat: sync task done-toggle with status (done/in_progress)
- `2013e2a` feat: bidirectional project/task picker with collapsible done section in journal
- `73c3c69` feat: hide done projects by default in projects list (same as tasks)
- *(이 핸드오프 `v2ae` — commit 대기)*

*작성: 2026-06-05 세션.*
