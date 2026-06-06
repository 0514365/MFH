---
description: MFH 인사이트 6도메인 자동 생성·저장 (pull → 분석 → push)
argument-hint: [--days 7|30|90]
allowed-tools: Bash, Read, Write
---

MFH 인사이트를 데이터 기반으로 생성해 Supabase 에 저장한다. 분석 주체는 Claude Code(구독·종량제 0). 종량제 API 키는 쓰지 않는다.

## 절차

1. **작업지시서 받기** — 다음을 실행한다:
   `npx tsx scripts/insight-pull.ts $ARGUMENTS`
   인자가 없으면 기본 90일. stderr 의 한 줄 요약은 무시하고, **stdout 전체가 작업지시서**다.

2. **분석·작성** — 작업지시서를 **그대로 충실히 따라** 6개 도메인(overall · journal · project · task · prayer · fruit) 인사이트를 각각 작성한다.
   작업지시서에 내장된 가드레일을 **절대 위반하지 않는다**:
   - 기도제목 3원칙 — ① 온두라스 정치는 정당·인물 거명 없이 항상 중립 ② 사역 기도제목 1~2개로 압축 ③ 가정 평강·문제예방·사전축복 비중.
   - 따뜻한 목양적 동행의 톤(평가·코칭 아님).
   - 인물·아동 실명/식별정보 금지(프라이버시).
   - 기록에 없는 사실을 지어내지 않는다. 데이터가 부족하면 솔직히 적는다.

   각 도메인을 회수 양식으로 감싼다(작업지시서 하단 양식과 동일):
   ```
   ===MFH-INSIGHT===
   LENS: <도메인 키>
   PERIOD: <pull 이 지정한 기간 그대로>
   ---
   <본문>
   ===END===
   ```

3. **결과 저장 파일 쓰기** — 6개 블록을 모두 이어 `insights-archive/_result.md` 에 Write 한다(이 폴더는 gitignore).

4. **DB 저장** — 다음을 실행한다:
   `npx tsx scripts/insight-push.ts insights-archive/_result.md`

5. **보고** — push 출력(도메인별 ✓/✗ 저장 결과)을 한국어로 1~2줄 요약한다.

## 주의

- push 는 content·기간만 갱신하고 **별점·메모·"편지에 담기"(in_letter)는 보존**한다 — 앱에서 단 사용자 피드백을 덮어쓰지 않는다.
- 저장 귀속 user_id 는 `.env.local` 의 `MFH_USER_ID`. 누락 시 push 가 안내 후 멈춘다.
- letter(선교편지)·balance(순수 집계)는 이 루틴에서 생성하지 않는다.
