---
description: MFH 사진 캡션 비전 생성·저장 (pull → 비전 분석 → push)
argument-hint: [--all]
allowed-tools: Bash, Read, Write
---

일지 사진에 AI 캡션을 **비전 분석**으로 생성해 DB(`journal_entries.photos` jsonb)에 저장한다. 분석 주체는 Claude Code(구독·종량제 0).

## 절차

1. **대상 사진 받기** — 다음을 실행한다:
   `npx tsx scripts/caption-pull.ts $ARGUMENTS`
   인자가 없으면 **증분**(`ai_caption` 없는 사진만), `--all` 이면 전체 재생성. stdout 이 작업지시서, stderr 가 요약이다. **대상이 0장이면 그대로 종료**한다.

2. **맥락 파악** — `insights-archive/_captions/manifest.json` 을 읽어 각 항목의 맥락(n·file·path·날짜·분류·머리말·장소)을 확인한다.

3. **비전 캡션 작성** — manifest 의 각 항목에 대해 `insights-archive/_captions/<file>` 이미지를 **Read(비전)** 로 보고 캡션을 쓴다.
   가드레일을 **절대 위반하지 않는다**:
   - 1~2문장, 따뜻하고 담백한 한국어. 장소·활동·분위기 중심.
   - 인물·아동의 실명·얼굴 특징·식별 가능한 개인정보 **금지**(프라이버시).
   - 사진에 보이지 않는 사실을 지어내지 않는다. manifest 의 날짜·장소·분류·머리말은 맥락 참고로만.
   - 사역의 따뜻한 일상을 담되, 정치적·민감한 단정 표현은 피한다.

4. **결과 저장** — `insights-archive/_captions/result.json` 에 다음 형식으로 Write 한다:
   `[{ "path": "<manifest 의 path 그대로>", "caption": "<캡션>" }, ...]`

5. **DB 병합 저장** — 다음을 실행한다:
   `npx tsx scripts/caption-push.ts`

6. **보고** — push 출력(일지·사진 건수)을 한국어로 1~2줄 요약한다.

## 주의

- 캡션은 `photos` jsonb 의 `ai_caption` 에 **병합** 저장되며 다른 사진·필드는 보존된다(entry_id 기준 update).
- 저장은 `journal_entries.id` 기준이라 `MFH_USER_ID` 가 필요 없다.
- 빈도가 낮은 작업(새 사진만)이라 매일 루틴보다 **수동/가끔** 실행이 적합하다.
