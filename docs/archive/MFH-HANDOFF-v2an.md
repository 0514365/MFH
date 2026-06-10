# MFH 핸드오프 v2an

> 이전: `v2am`(Phase 5 할 일 뱃지 완료). 이번: **Phase 4b — L1 무료 규칙 신호 칩 완료**. 비서가 이제 L1(데이터 칩) + L2(AI 제안) 둘 다.

---

## 현재 위치 (한 줄)

**Phase 4b 완료.** 할 일·프로젝트 페이지 비서 카드 위에 "지남·임박·정체·중요" 규칙 신호 칩(데이터만 계산, AI·쿼리·비용 0). 비서 L1(즉시 계기판) + L2(AI 통찰) 완성.

---

## 이번 세션 변경 (4b)

**칩 = L1 규칙 신호**: 페이지가 이미 조회한 tasks/projects 배열로 계산(추가 쿼리·AI 0). 0인 칩 숨김. 타임존 **온두라스 기준 오늘**(5b와 일관).

| 파일 | 신규/수정 | 내용 |
|---|---|---|
| `lib/signals.ts` | 신규 | `taskSignals`/`projectSignals`(배열+today→칩 카운트, 순수함수). `addDaysISO`(YYYY-MM-DD 날짜산술). 날짜 문자열 비교 |
| `components/SignalChips.tsx` | 신규(서버) | 칩 렌더. 파스텔 톤(지남=red·임박=orange·정체=slate·중요=★yellow), 정적 클래스(JIT 안전) |
| `app/tasks/page.tsx` | 수정 | `taskSignals(tasks, today)` → BadgeOptIn 아래·비서 카드 위 배치 |
| `app/projects/page.tsx` | 수정 | `projectSignals(projects, today)` → 비서 카드 위 배치 |

**규칙·임계값**
| 칩 | 할 일 | 프로젝트 |
|---|---|---|
| 지남 | 마감<오늘 & 미완료 | 마감<오늘 & status≠done |
| 임박 | 오늘~D+2 & 미완료 | 오늘~D+7 & status≠done |
| 정체 | — (Task엔 updated_at 없음) | in_progress & updated_at 14일+ 전 |
| 중요 | 별점≥4 & 미완료 | 별점≥4 & status≠done |

- 칩 클릭: **표시만**(MVP). 필터 연결은 추후 옵션.
- 검증: `tsc`·`build` 통과 + `tsx`로 signals 단위 검증(경계 정확).

---

## 우진 액션
- 배포 후 할 일/프로젝트 페이지 비서 카드 위 **칩 노출** 확인(해당 신호 있을 때만).

---

## 미결 과제 (우선순위)

| 순위 | 과제 | 상태 |
|---|---|---|
| 1 | (선택) 칩 **클릭→필터** 연결 — `lib/taskFilter`/`projectFilter`로 해당 상태 필터 이동 | 옵션 |
| 별도 | Next.js/PostCSS audit 취약점(next@16 breaking) — 별도 업그레이드 검토 | 백로그 |
| 최하위 | 선교편지 5-에이전트 팀 피드백 반영 | 보류 |

---

## 운영 메모

- 비서 2단 완성: **L1 칩**(`signals.ts`, 비용0·실시간) + **L2 AI 제안**(`/assistant-update`, 수동·구독). 한 카드에서 "몇 건"(칩) + "왜·어떻게"(AI).
- 임계값(임박 D+2/D+7, 정체 14일)은 `lib/signals.ts` 상수로 조정 가능.
- 색은 Tailwind 기본 파스텔(config가 기본 색 유지). palette 커스텀 토큰엔 신호색 없어 기본색 사용.

---

## 관련 커밋

- `feat: L1 rule-based signal chips for tasks/projects (Phase 4b)` — 코드 4파일
- `docs: handoff v2an — Phase 4b signal chips` — 이 문서

*작성: 2026-06-06 세션 (Phase 4b L1 규칙 신호 칩).*
