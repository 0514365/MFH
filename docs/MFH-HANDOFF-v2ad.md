# MFH 핸드오프 v2ad

> 이전 상태: `MFH-HANDOFF-v2ac.md` (일지 사진 다중화) 참조.
> **이번 세션 주제: 선교편지 5-에이전트 팀 구성 (분업 + 다양성).**

---

## 현재 위치 (한 줄)

선교편지를 **5개 서브에이전트로 분업 제작**하는 팀이 구성됨. 팀장(Claude)이 오케스트레이터로 collector→strategist→writer→designer→assembler 를 호출, 매 단계 우진 승인. **가동 대기.**

---

## 이번 세션 완료

### 1. 운영 마스터 (`docs/MFH-LETTER-AGENTS.md`)
- 팀 헌법: 아키텍처·핸드오프 계약·다양성 정책·변경 라우팅·공통 도메인 규칙·런북.
- 기존 `MFH-LETTER-WORKFLOW.md` 의 ①~⑤ 를 **분업+다양성**으로 구현.

### 2. 서브에이전트 5종 (`.claude/agents/letter-*.md`)
- collector(수집·인덱싱) / strategist(방향 2~3안) / writer(원고+이미지매핑, 제목·리드 2~3안) / designer(시안 2~3 병렬) / assembler(도메인 QA·PDF·포트폴리오).
- 각 8항목 틀(역할·입력·출력·내장규칙·체크리스트·도구·다양성·승인포인트).
- 공통 도메인 규칙(기도제목 3원칙·3단 순서·실명처리·파스텔)을 전원 내장.

### 3. 자동 수집 스크립트 V2 (`scripts/fetch-letter-materials.mjs`)
- V1→V2: photos jsonb **다중사진**(최대 5장, 레거시 fallback) + **인사이트**(★편지적용 `in_letter`) + **중보연계**(`intercession_id` → 방문자 메시지) 수집.
- `--list` 검증 통과. (현재 데이터: 2026-05 5건·사진3, 6월 0건)

### 4. 재사용 보강
- `CLAUDE.md §7` 에 팀 포인터 1줄 추가 → 새 세션 자동 인지.

---

## 다음 할 일

1. **가동**: "5월호 만들어줘"(리허설) 또는 6월 일지 쌓인 뒤 "6월호". collector 부터 런북(`MFH-LETTER-AGENTS.md §8`).
2. (확인) 첫 가동 시 실제 5-에이전트 호출 흐름·핸드오프 파일 점검.
3. (선택) PDF 자동화(puppeteer 도입) — 현재 수동 `Cmd+P`.
4. (선택) 다양성 양 조절(방향/디자인 안 개수).

---

## 주의사항

- 서브에이전트는 **세션이 아니라 파일 정의**다. 별도 세션/그룹 불필요. 같은 repo 새 세션이면 자동 인식.
- 단계 간 정보는 **핸드오프 파일**(`letter-templates/issues/<월>/`)로만 연결 — 에이전트는 기억하지 않음.
- 모든 요청·승인은 **팀장(현 세션) 경유**. 서브에이전트 직접 대화 불가.
- `issues/<월>/` 산출물·호별 인스턴스 html = 개인 일지·사진 → **gitignore**.
- 디자인 선호: 파스텔·차분 (memory `design-tone-preference`).
- 비용: 월 1회 **수동 가동** — 자동·일괄 아님 (memory `api-cost-sensitive` 부합).

---

## 관련 커밋

- *(이번 세션 변경: `docs/MFH-LETTER-AGENTS.md`, `.claude/agents/letter-*.md` ×5, `scripts/fetch-letter-materials.mjs` V2, `CLAUDE.md` 포인터, 이 핸드오프 — commit 대기)*

*작성: 2026-06 세션.*
