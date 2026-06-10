# MFH 핸드오프 v2ap

> 이전: `v2ao`(Next.js 15.5 보안 업그레이드). 이번: **선교편지 5-에이전트 팀에 피드백 신호 반영** — v2ai부터 "최하위·보류"였던 백로그 해소.

---

## 현재 위치 (한 줄)

**선교편지 팀이 우진 피드백 4신호(★별점·[메모]·[편지에담기]·[보관])를 수집·활용.** 앱 letter 루틴(`buildLetterDigest`)에만 있던 신호를 편지 제작 트랙(`fetch-letter-materials.mjs` + collector·strategist 정의서)에도 이식. 형식·우선순위 동일.

---

## 이번 세션 변경

**배경**: v2ai~v2ao 미결의 "선교편지 5-에이전트 팀 피드백 반영"(보류, 우진 지시로 제일 마지막). 편지 팀 수집은 `in_letter` 하나만 봤고, 앱 letter 인사이트는 이미 4신호 전부 활용(`6a86a6a`) → 같은 신호를 편지 팀 트랙에도.

**피드백 4신호**: `rating`(★별점) · `feedback_note`([메모]) · `in_letter`([편지에담기]) · `insight_scraps`([보관]).

| 단계 | 파일 | 변경 |
|---|---|---|
| a(코어) | `scripts/fetch-letter-materials.mjs` V2→**V3** | 인사이트 select에 `rating·feedback_note` 추가, `insight_scraps`(보관) 조회 신규. 쿼리 `in_letter OR rating≥4 OR 대상월`. 정렬 `[편지에담기]→별점`. 표기 `★N·[편지에담기]·[메모]·[보관]` + 신호 안내 헤더 |
| b(문서) | `.claude/agents/letter-collector.md` | §3 수집대상 4신호 명시 + V3 반영 |
| b | `.claude/agents/letter-strategist.md` | §2·§5·체크리스트·절차에 "신호 우선 분석" 명시 |
| b | `docs/MFH-LETTER-AGENTS.md` | §6 공유헤더 피드백 신호 규칙 + §7 자산 V3 |

**설계 결정**:
- **letter 도메인 인사이트 포함 유지**: 앱 루틴(`insight-pull.ts`)은 `.neq('domain','letter')`로 제외하나, 편지 팀은 strategist 출발점이라 **의도적 포함**(collector §3).
- **별점≥4 월 무관 포함**(결정 B): "내가 가치 있다고 표시한 재료 우선"이라는 피드백 취지에 부합, 앱 루틴과 일관.

---

## 우진 액션
- 다음 **"6월호 만들어줘"** 가동 시 collector가 `materials.md`에 4신호 표기 자동 검증(별도 실행 불필요). 즉시 확인하려면 `node scripts/fetch-letter-materials.mjs 2026-06`(6월 새 폴더 생성, 5월 기준선 안 건드림).

---

## 미결 과제 (우선순위)

| 순위 | 과제 | 상태 |
|---|---|---|
| 백로그 | postcss moderate 2건(Next 내부 번들) — 실질위험 0, Next 후속 패치(15.5.x) 자동해소 기대 | 수용 |
| 백로그 | Next 16 업그레이드(React 19 + `proxy.ts` + Turbopack) — 별건·회귀 큼 | 보류 |
| 1 | (선택) 신호 칩 **클릭→필터** 연결 | 옵션 |

> v2ai부터 보류였던 **"선교편지 팀 피드백 반영" = 이번 세션 완료.**

---

## 운영 메모

- 편지 팀 수집 스크립트는 `.mjs`(독립 실행)라 `lib/insightExport.ts`의 `buildLetterDigest`를 import 못 함 → **동일 로직 인라인**. 형식·정렬·신호 표기를 일치시켜 두 트랙(앱 루틴/편지 팀)이 같은 재료를 같은 모습으로 본다.
- `insights.rating·feedback_note`, `insight_scraps` 테이블은 `scripts/insight-pull.ts`가 이미 사용 → **스키마 안전**.
- 실데이터 실행엔 `.env.local` SUPABASE_SERVICE_ROLE_KEY 필요. 5월 기준선 폴더 보존 위해 임의 실행 안 함 → 이번 세션 검증은 `node --check`·`tsc --noEmit`(exit 0).

---

## 관련 커밋

- `feat: collect letter feedback signals (rating/memo/scraps) for letter team` — 스크립트 V3 + 정의서 3
- `docs: handoff v2ap — letter team feedback signals` — 이 문서

*작성: 2026-06-06 세션 (선교편지 팀 피드백 신호 반영).*
