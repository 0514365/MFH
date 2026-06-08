# MFH 핸드오프 v2au

> 이전: `v2at`(Photos 바로가기 + 캡션 수동 입력). 이번: **수동 캡션을 선교편지 자료수집에 반영**.

---

## 현재 위치 (한 줄)

**편지 재료 스크립트가 사진 줄에 저장 캡션(수동 우선)을 포함 → 우진이 손으로 단 캡션이 편지 작성의 권위 있는 사진 설명으로 반영.** 앱·스키마 변경 없음.

---

## 배경

v2at에서 사진 수동 캡션 입력을 추가했으나, 편지 파이프라인은 이를 안 썼다. `fetch-letter-materials.mjs`가 사진을 **파일명·분류만** `materials.md`에 적고, 수집가가 이미지를 비전으로 다시 분석해 `photo-index.md`를 작성했기 때문(저장 캡션 미사용). → 손으로 단 캡션이 편지에 안 반영되는 갭.

## 이번 세션 변경

| 파일 | 변경 |
|---|---|
| `scripts/fetch-letter-materials.mjs`(V5) | `photoPaths`→`photoItems`(`{path, caption}`, caption=수동 `caption` ?? AI `ai_caption`). 사진 줄에 **`— 캡션: <…>`** 표기. `--list`/추출 양쪽 반영 |
| `.claude/agents/letter-collector.md` | photo-index `내용(한 줄)` = `materials.md` 의 `캡션:`(수동) **우선**, 없을 때만 비전. §4·절차·체크리스트 반영. 스크립트 V5 표기 |

## 효과

- 우진이 직접 쓴 캡션이 편지 재료(`materials.md`)에 텍스트로 들어가 strategist·writer·designer가 참고.
- 수집가의 중복 비전 분석 감소(캡션 있으면 그대로/요약).
- 수동 캡션 우선이라 AI 캡션이 있어도 사람 캡션이 권위.

## 우진 액션
- 다음 **"○월호 만들어줘"** 시 collector가 `materials.md` 사진 줄의 `캡션:`을 자동 포함·우선 사용(별도 실행 불필요). 즉시 확인: `node scripts/fetch-letter-materials.mjs <월>` → `materials.md` 사진 줄에 `— 캡션:` 표기 확인.

## 관련 커밋(예정)
- `feat: include manual/AI photo captions in letter materials`
- `docs: handoff v2au — captions into letter pipeline`

*작성: 2026-06-07 세션 (수동 캡션 → 편지 자료 반영). 검증: node --check OK(스크립트는 빌드 비포함).*
