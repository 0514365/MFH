# MFH 핸드오프 v2av

> 이전: `v2au`(수동 캡션 → 편지 반영). 이번: **할 일 편집 페이지에 이전/다음 순회**(필터·검색 인지).

---

## 현재 위치 (한 줄)

**할 일 편집 화면 상단에 `◀ 3/12 ▶` — 목록(필터·검색 q 반영) 순서대로 이전/다음 편집으로 바로 이동.** 상세 페이지 nav 부품(`DetailNav`+`listNav`)을 편집에 재사용. tsc·build exit 0.

---

## 배경

할 일 **상세**(`/tasks/[id]`)엔 이미 필터 인지 이전/다음이 있었으나, **편집**(`/tasks/[id]/edit`)엔 없었다. 특히 데스크탑은 목록→요약패널→편집으로 상세를 건너뛰어, 편집하며 항목 순회가 불가했다. 일지(Log)와 동일한 부품으로 편집에도 부여.

## 이번 세션 변경

| 파일 | 변경 |
|---|---|
| `components/DetailNav.tsx`(V3) | 옵션 `suffix` 추가 → 링크를 `basePath/id+suffix?query` 로 생성(`/edit` 순회 지원). 기존 상세(suffix 없음)는 그대로 |
| `app/tasks/[id]/edit/page.tsx` | `searchParams`로 필터 파싱 → `orderTaskIds`+`computeListNav`(상세와 동일, 검색 q·title/desc/place 포함) → `nav`·`navQuery`를 TaskForm에 전달 |
| `app/tasks/TaskForm.tsx`(V4) | 편집 모드에서 BackButton 옆 `DetailNav`(suffix `/edit`) 표시. Back도 필터 유지(`/tasks?<필터>`) |
| `app/tasks/[id]/page.tsx` | 상세 **수정** 링크에 `?<필터>` 부착(편집 진입부터 필터 기준) |
| `app/tasks/TasksListClient.tsx` | 요약패널 **편집** 링크에 `editSuffix`(현재 필터) 부착 |

## 설계 메모

- 편집 nav는 상세 nav와 **완전 동일 로직**(`parseTaskFilter`→`orderTaskIds`→`computeListNav`). 정렬·기한그룹 평탄화·검색까지 목록과 일치.
- DetailNav는 양끝/목록불일치(`total<=1` 또는 `index===0`)면 자동 숨김.
- 편집 진입 링크(상세 수정·요약 편집)가 필터 쿼리를 실어야 진입 시점부터 필터 기준. 안 실리면 전체 목록 기준으로 동작(폴백).
- 반복 시리즈 편집 모달·복제 버튼 등 기존 편집 기능과 공존(헤더 행만 추가).

## 우진 액션 (배포 후 확인)

1. 할 일 목록에서 검색/필터로 좁힌 뒤 한 항목 편집 → 상단 `◀ n/N ▶` 로 그 **필터된 목록** 따라 이전/다음 편집 이동.
2. 데스크탑 요약패널 **편집**, 모바일 상세 **수정** 양쪽에서 진입해도 필터 유지되는지.

> 검증: 로컬 `tsc`·`build` exit 0. 런타임은 배포 URL에서.

## 관련 커밋(예정)
- `feat: prev/next navigation on task edit page (filter-aware)`
- `docs: handoff v2av — task edit prev/next`

*작성: 2026-06-07 세션 (할 일 편집 이전/다음 순회).*
