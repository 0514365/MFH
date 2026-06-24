---
description: MFH 후원자 관계관리 — 관계 현황·다음 액션·기도제목·메시지 초안 생성·저장 (pull → 분석 → push)
argument-hint: [--days 7|30|90]
allowed-tools: Bash, Read, Write
---

MFH 후원자 관계관리(supporter_care) 제안을 데이터 기반으로 생성해 Supabase 에 저장한다. 분석 주체는 Claude Code(구독·종량제 0). 인사이트·비서와 같은 pull/push 인프라를 재사용하며, 별개 도메인(supporter_care)으로 저장한다.

## 절차

1. **작업지시서 받기** — 다음을 실행한다:
   `npx tsx scripts/insight-pull.ts --domains supporter_care $ARGUMENTS`
   stderr 의 한 줄 요약은 무시하고, **stdout 전체가 작업지시서**다. 작업지시서의 "후원자 데이터" 섹션에 후원자별 기본정보·헌금 USD 누계·최근 헌금·기도제목·최근 활동이 들어 있다. (후원자/헌금/관계기록은 기간 무관 전체 조회.)

2. **분석·작성** — 작업지시서를 **그대로 충실히 따라** supporter_care 1개 도메인을 작성한다.
   - 네 부분으로: ① **관계 현황**(연결이 활발한 / 한동안 뜸한 후원자) ② **다음 액션** 3~5개(연락·감사·심방) ③ **함께 기도할 제목** 1~3개 ④ **감사·안부 메시지 초안** 1개.
   가드레일을 **절대 위반하지 않는다**:
   - 후원자를 **헌금 액수로 비교·평가하지 않는다**(관리 대상이 아니라 동역자로 존중).
   - 기도 3원칙: 온두라스 정치는 정당·인물 거명 없이 중립 / 사역 기도는 1~2개로 압축 / 가정의 평강·축복.
   - 개인 식별정보·민감정보는 절제한다. 기록에 없는 사실을 지어내지 않는다(데이터가 부족하면 솔직히 적는다).

   회수 양식으로 감싼다(작업지시서 하단 양식과 동일):
   ```
   ===MFH-INSIGHT===
   LENS: supporter_care
   PERIOD: <pull 이 지정한 기간 그대로>
   ---
   <본문>
   ===END===
   ```

3. **결과 저장 파일 쓰기** — 블록을 `insights-archive/_supporter_result.md` 에 Write 한다(인사이트·비서 결과 파일과 분리, 이 폴더는 gitignore).

4. **DB 저장** — 다음을 실행한다:
   `npx tsx scripts/insight-push.ts insights-archive/_supporter_result.md`

5. **보고** — push 출력(저장 결과)을 한국어로 1~2줄 요약한다.

## 주의

- push 는 content·기간만 갱신하고 **별점·메모·"편지에 담기"(in_letter)는 보존**한다.
- 저장 귀속 user_id 는 `.env.local` 의 `MFH_USER_ID`. 누락 시 push 가 안내 후 멈춘다.
- **WebSearch 를 쓰지 않는다**(내부 데이터만 = 비용 0).
- 표시: 후원자 목록(/supporters) 상단 "후원자 관계관리" 접이식 패널(최신 1개, DomainInsightPanel).
- 후원자 데이터는 민감정보(헌금·연락처·생년월일)다. **로컬에서만 분석**하며 외부 서비스로 전송하지 않는다.
