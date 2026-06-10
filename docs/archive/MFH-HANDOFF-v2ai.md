# MFH 핸드오프 v2ai

> 이전: `MFH-HANDOFF-v2ah.md`(Phase 3c 캡션). 이번: 3b·3c **후속 개선** + **미결 과제 우선순위** 정리.

---

## 현재 위치 (한 줄)

인사이트 개편(Phase 1~3c) 완료·가동. **Local 루틴 정상 작동 확인**(권한 자동모드), letter까지 7도메인 포함. 후속 UX·기능 개선 반영. 다음은 **미결 과제(아래 우선순위)**.

---

## 이번 세션 후속 변경 (v2ah 이후 커밋)

| 커밋 | 내용 |
|---|---|
| `e491db4` | **Photos UI** — PageHeader(홈·달력·인사이트) + 라이트박스(탭하면 확대) + 선택모드 토글(기본=확대, "선택"으로 다중선택) |
| `ffbe874` | **인사이트 카드 업데이트 시각** — `YYYY-MM-DD HH:mm`, 보는 사람 **로컬 시간대**(mount 패턴, hydration 안전) |
| `6a86a6a` | **letter 루틴 포함**(6→7도메인) + `buildLetterDigest`(별점·메모·편지에담기·보관 신호) + WebSearch(온두라스 뉴스) |
| (작업) | 수동 letter 2606호 → `insights-archive/letter.jsonl` 백업(루틴 교체 전 보존) |
| (작업) | **마이너 UX** — `LinkedPicker`(일지 연계 선택) 드롭다운 **drop-up**(아래 공간 부족 시 위로 펼침) + **Fruit 인사이트 최신순** 정렬(`LENS_OUTPUT.fruit` 프롬프트 — 다음 생성분부터 적용) |

---

## Local 루틴 운영 (확인됨)

- **권한 = "자동 모드"(필수)** — "편집 수락"이면 Bash(pull/push) 막혀 미작동. 이게 초기 미작동 원인이었음.
- 폴더 = repo 루트, 워크트리 OFF.
- **매일 06·14·21시 3회**(루틴 3개 등록 완료) — 하루 3회 자동 갱신.
- **7도메인**(overall·journal·project·task·prayer·fruit·**letter**) 생성. balance만 제외(앱 실시간 집계).
- 아카이브 누적: `insights-archive/<domain>.jsonl` (매 실행 1줄 append, gitignore).
- letter 입력 = 90일 자료 + **편지 재료 다이제스트**(최근 인사이트 + 내 피드백: ★별점·[메모]·[편지에담기]·[보관]). in_letter·보관 우선.

---

## 미결 과제 (우선순위)

| 순위 | 과제 | 상태 |
|---|---|---|
| 1 | **Phase 4 — 비서**(project/task 능동 제안: L1 무료 규칙 + L2 Local 루틴) | 대기 · 3b 인프라 재사용 |
| 2 | **Phase 5 — 할 일 뱃지**(앱 아이콘, SW+Web Push 신규) | 대기(분리) |
| **최하위** | **선교편지 5-에이전트 팀에 피드백 분석 반영** — collector·strategist가 별점·메모·편지에담기·보관을 수집·분석해 편지 제작에 활용 | **보류(우진 지시: 제일 마지막)** |

> 참고: letter "도메인 인사이트"(편지 방향 개요)는 이미 피드백을 반영함(`6a86a6a`). 위 최하위 과제는 **선교편지 팀(완성 편지 제작)** 트랙에 같은 신호를 넣는 별개 작업.

---

## 운영 메모

- 스크립트(insight·caption pull/push)는 **repo 루트에서 실행**(process.cwd 기준).
- 슬래시 커맨드: `/insight-update`(7도메인·매일 루틴) · `/caption-update`(사진 캡션·수동).
- `insights-archive/`(인사이트 jsonl + letter 백업 + 캡션 작업물)는 전부 gitignore.
- 생성은 구독(Claude Code)만 — 종량제 API 미사용.

---

## 관련 커밋

- `2889964` 3b(insight 루틴) · `33ccbe2` 3c(캡션) · `e491db4` photos UI · `ffbe874` 카드 시각 · `6a86a6a` letter 포함
- 이 핸드오프 `v2ai` — commit 대기

*작성: 2026-06-05 세션 (인사이트 개편 후속 개선).*
