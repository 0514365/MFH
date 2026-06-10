# MFH 핸드오프 v2ac

> 이전 상태: `MFH-HANDOFF-v2ab.md` (선교편지 디자인 시스템·작성 프로세스·재료 자동화) 참조.
> **이번 세션 주제: 일지(Log) 사진 다중화 — 최대 5장 + 콜라주 + 클릭 확대 + 사진별 장소.**

---

## 현재 위치 (한 줄)

일지 사진이 **1장 → 최대 5장**으로 확장됨. 입력(다중 첨부·사진별 장소)·보기(콜라주·라이트박스)·편집·삭제·편지재료까지 전부 다중 사진 대응 완료.

---

## 이번 세션 완료

### 1. 데이터 모델 — `photos jsonb` (patch82)
- `supabase/patch82-journal-multi-photos.sql` — `journal_entries.photos jsonb` 추가 + 기존 단일 사진 1장을 배열 첫 요소로 자동 이전(멱등). **실행 완료.**
- 각 요소: `{ path, place_name, taken_at, lat, lng, meta }`.
- 레거시 단일 컬럼(`photo_path` 등)은 **보존**(읽기 fallback·롤백 안전). 새 저장은 `photos` 사용.
- Storage `journal-photos` 버킷/정책(`{userId}/...`)은 **그대로 재사용** — 정책 추가 없음.

### 2. 정규화 헬퍼 (`lib/journalPhotos.ts` 신규)
- `resolveJournalPhotos(entry)` — 표시용. 사진별 장소·좌표가 비면 일지 레벨 대표값 상속.
- `journalPhotosForEdit(entry)` — 편집용. 원본 그대로(빈 칸 유지, 상속 안 함).
- `collectPhotoPaths(entry)` — 삭제용. photos + 레거시 경로 합쳐 중복 제거.
- 표시·편집·삭제·편지재료가 모두 이 헬퍼를 공유.

### 3. 입력 폼 (`app/journal/JournalForm.tsx`)
- 사진 1장 → **최대 5장**(`MAX_JOURNAL_PHOTOS`, `lib/types.ts`). 「사진 추가」로 한 번에 여러 장 선택, 초과분 자동 컷.
- 첫 사진=**대표**(장소칸 없이 일지 레벨 ‘대표 장소’ 적용), 2번째부터 **사진별 장소 칸**(placeholder=대표 상속).
- 각 사진 EXIF로 촬영일·좌표 자동, 첫 사진 촬영일은 일지 날짜에 연동(기존 단일 동작 유지).
- 편집 중 제거한 기존 사진은 저장 시 Storage 정리.

### 4. 보기 — 콜라주 + 라이트박스 (`app/journal/PhotoCollage.tsx` 신규)
- 1~5장 장수별 **모자이크 콜라주**(5장=2+3단). 사진 위 장소 배지.
- 클릭 시 **확대 라이트박스**: 좌우 화살표·키보드(←→·Esc)·터치 스와이프, 사진별 장소·촬영일·지도 링크 캡션, 배경 스크롤 잠금.
- 상세(`app/journal/[id]/page.tsx`)의 단일 `<img>`를 `PhotoCollage`로 교체.

### 5. 편집/삭제/편지재료
- `edit/page.tsx` — 사진 전체 서명 URL 생성해 폼에 전달.
- `DeleteButton.tsx` — 단일 path → `paths: string[]` 일괄 삭제.
- `app/letter-materials/page.tsx` — 일지당 사진 1장 → **여러 장** 수집.

---

## 다음 할 일

1. (확인) 실기기에서 다중 첨부·콜라주·확대 동작 최종 점검.
2. (선택) 사진 **순서 변경**(드래그) — 현재는 추가 순. 첫 장이 대표.
3. (선택) 콜라주 6장+ 대응이나 사진별 촬영일 개별 편집(현재 EXIF 자동만).
4. (선택) 편지재료 사진 캡션에 사진별 장소 노출.

---

## 주의사항

- **저장 전제**: `photos` 컬럼(patch82). 미실행 환경에선 저장 에러 — 이미 실행 완료.
- 레거시 `photo_path` 등은 당분간 보존. 추후 데이터 안정화되면 제거 패치 고려.
- 사진별 장소는 비면 대표 상속(저장은 null, 표시 시 상속). 편집 시엔 빈 칸 유지.
- 디자인 선호: 강렬한 마룬·원색 거부, **파스텔·차분** (memory `design-tone-preference`).
- 이미지 외부(Signed URL)라 `next/image` 대신 `<img>` 사용(eslint-disable 주석 유지).

---

## 관련 커밋

- `c96f4b7` feat: support up to 5 photos per journal log with collage and lightbox
- *(이 핸드오프는 다음 커밋)*

*작성: 2026-06 세션.*
