# MFH 핸드오프 v2at

> 이전: `v2as`(반복 시리즈 + 폼 전체폭). 이번: **Photos 헤더 바로가기 + 사진 캡션 수동 입력**.

---

## 현재 위치 (한 줄)

**모든 페이지 헤더에 Photos 바로가기 추가 + 라이트박스에서 사진 캡션을 직접 입력/수정**(수동 우선, AI 재스캔이 안 덮음). 스키마 SQL 불필요(jsonb). tsc·build exit 0.

---

## 이번 세션 변경

| # | 요청 | 구현 | 파일 |
|---|---|---|---|
| 1 | 헤더 바로가기 | 공통 `PageHeader`에 **Photos 아이콘** 추가(Calendar·Insights 옆, 현재 페이지면 숨김). `current` 타입에 `'photos'`. Photos 페이지 `current="photos"` | `components/PageHeader.tsx`(V2), `app/photos/page.tsx` |
| 2 | 캡션 수동 입력 | `JournalPhoto`(jsonb)에 수동 `caption` 추가. 표시 = `caption ?? ai_caption`(수동 우선). 라이트박스에 **캡션 직접 입력/수정** UI(본인 사진만, AI 캡션은 참고로 표시). 저장은 `supabase-browser`로 그 일지 `photos` 배열 갱신(RLS 본인만) | `lib/types.ts`, `lib/journalPhotos.ts`, `app/photos/page.tsx`, `app/photos/PhotoGalleryClient.tsx`(V3) |
| 2b | AI 보호 | `caption-pull` 증분/전체 모두 **수동 캡션 있는 사진은 건너뜀**(AI 비용 절약 + 사용자 값 보존). `caption-push`는 spread라 수동 자동 보존(변경 불필요) | `scripts/caption-pull.ts`(V2) |

---

## 설계 결정

- **수동/AI 캡션 분리**: 수동 `caption`이 표시·편지에서 AI `ai_caption`보다 우선 → AI 재스캔이 수동을 시각적으로도 비용상으로도 안 덮음.
- **편집 위치 = 라이트박스**(사진 크게 보기). 편집은 **본인 사진만**(journal_entries update RLS = owner). 부부 공유는 보기만.
- **레거시 단일 사진**(photos 배열 없이 photo_path만): 캡션 저장 시 "지원하지 않음" 안내(patch82로 대부분 photos 배열로 이전됨).
- **스키마 SQL 없음**: photos가 jsonb라 `caption` 키만 추가하면 됨.

---

## 우진 액션 (배포 후 확인)

1. 아무 페이지 헤더 우측에 **사진(이미지) 아이콘** → Photos로 이동.
2. Photos에서 사진 탭 → 크게 보기 → **캡션 직접 입력/수정** → 저장 → 그리드·라이트박스에 즉시 반영.
3. 다음 AI 캡션 스캔(`/caption-update`) 시 수동 캡션 단 사진은 건너뛰는지(비용 절약).

> 검증: 로컬 `tsc`·`build` exit 0. 런타임은 배포 URL에서.

---

## 관련 커밋(예정)

- `feat: photos header shortcut + manual photo captions`
- `docs: handoff v2at — photos shortcut + manual captions`

*작성: 2026-06-07 세션 (Photos 바로가기 + 캡션 수동 입력).*
