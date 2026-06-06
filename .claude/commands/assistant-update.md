---
description: MFH 비서 — 프로젝트·할 일 능동 제안 생성·저장 (pull → 분석 → push)
argument-hint: [--days 7|30|90]
allowed-tools: Bash, Read, Write
---

MFH 비서(프로젝트·할 일의 "다음 행동" 능동 제안)를 데이터 기반으로 생성해 Supabase 에 저장한다. 분석 주체는 Claude Code(구독·종량제 0). 인사이트(회고)와 별개 도메인(project_assist·task_assist)으로, 같은 pull/push 인프라를 재사용한다.

## 절차

1. **작업지시서 받기** — 다음을 실행한다:
   `npx tsx scripts/insight-pull.ts --domains project_assist,task_assist $ARGUMENTS`
   인자가 없으면 기본 90일(일지 맥락 범위). stderr 의 한 줄 요약은 무시하고, **stdout 전체가 작업지시서**다. (프로젝트·할 일은 기간 무관 전체 조회 — 미래 마감 포함.)

2. **분석·작성** — 작업지시서를 **그대로 충실히 따라** 2개 도메인(project_assist · task_assist) 비서 제안을 각각 작성한다.
   - 비서 = "지금 무엇부터 / 어떻게 다시"에 답하는 **다음 행동 3~5개**. 간결한 실무형(평가·코칭이 아니라 실행을 돕는 길잡이).
   - project_assist: 정체된 · 마감 임박한 · 다음 한 걸음이 모호한 프로젝트를 재점화할 구체 행동.
   - task_assist: 마감 임박 · 고중요도인데 미뤄진 · 오래 멈춘 할 일의 오늘/이번 주 다음 행동.
   가드레일을 **절대 위반하지 않는다**:
   - 온두라스 정치는 정당·인물 거명 없이 항상 중립.
   - 인물·아동 실명/식별정보 금지(프라이버시).
   - 기록에 없는 사실·할 일을 지어내지 않는다. 데이터가 부족하면 솔직히 적는다.

   각 도메인을 회수 양식으로 감싼다(작업지시서 하단 양식과 동일):
   ```
   ===MFH-INSIGHT===
   LENS: <project_assist | task_assist>
   PERIOD: <pull 이 지정한 기간 그대로>
   ---
   <본문>
   ===END===
   ```

3. **결과 저장 파일 쓰기** — 2개 블록을 이어 `insights-archive/_assist_result.md` 에 Write 한다(인사이트의 `_result.md` 와 파일 분리, 이 폴더는 gitignore).

4. **DB 저장** — 다음을 실행한다:
   `npx tsx scripts/insight-push.ts insights-archive/_assist_result.md`

5. **보고** — push 출력(도메인별 ✓/✗ 저장 결과)을 한국어로 1~2줄 요약한다.

## 주의

- push 는 content·기간만 갱신하고 **별점·메모·"편지에 담기"(in_letter)는 보존**한다 — 앱에서 단 사용자 피드백을 덮어쓰지 않는다.
- 저장 귀속 user_id 는 `.env.local` 의 `MFH_USER_ID`. 누락 시 push 가 안내 후 멈춘다.
- 비서는 **WebSearch 를 쓰지 않는다**(외부 뉴스 불필요 = 비용 0). letter 재료(편지 신호)도 포함되지 않는다.
- 표시: 프로젝트/할 일 페이지 상단 "프로젝트 비서"·"할 일 비서" 접이식 패널(최신 1개). 인사이트(회고) 패널과 나란히, 라벨로 구분된다.
