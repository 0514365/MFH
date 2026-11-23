# MFH 핸드오프 v2ej (세션 종료)

> 이전: `v2ei`(카드 미상환 필터·내역 필터 압축·삼성카드 상환, `docs/archive/`). 이번 세션(2026-11-23): **온두라스 동향 음성 브리핑 a단계 — 듣기 버튼 · 시리 단축어 API · 낭독 대본**.

---

## 현재 위치 (한 줄)
**동향 음성 브리핑 a단계 배포 완료** — SQL(patch122)·Vercel 토큰 등록·연결 확인·iPhone 단축어 수동 실행까지 우진 "성공". 시리 음성 호출은 보류(단축어 버튼으로 실행). 다음 호 #2612 준비는 그대로 대기.

## 이번 세션 커밋 (push 됨)
| 커밋 | 내용 |
|---|---|
| `5d62e27` | 동향 음성 브리핑: 듣기 버튼(`ListenButton.tsx`) · 단축어 API(`/api/honduras/speech`) · 낭독 대본 컬럼(patch122) · `/news-update` 대본 규칙 · 설정 문서(`docs/MFH-SIRI-BRIEFING.md`) |

v2ei 이후 핸드오프 없이 들어간 커밋(2026-11-16, 이전 세션): `5ffa1c7` 릴스 가로 사진 letterbox · `497bd35` 글쓰기 기조 문서(`MFH-WRITING-GUIDE.md`) · `b9d98e0` 릴스 자막 합니다체 · `53e8096` 릴스 지침(`MFH-REEL-GUIDE.md`). 내용은 CLAUDE.md §7 에 반영돼 있다.

## 요약 (코드를 안 읽어도 되게)
- **낭독 대본** `honduras_news.speech_script`(patch122, 적용 확인됨): `/news-update` 가 화면용 브리핑과 함께 쓰는 듣기용 글. 1,100~1,400자(3~4분) · 합니다체 · 화면 항목에 없는 사실 금지 · **대본에서만** 지명·인명을 한글 발음으로(화면 title·body 는 계속 스페인어 원문 철자) · 숫자·단위는 읽는 대로 · 출처·URL·기호 없음. 규칙 원문은 `scripts/news-pull.ts` 작업지시서와 `.claude/commands/news-update.md`.
- **대본이 없는 날**(patch122 이전 동향 전부 포함): `lib/honduras-speech.ts` 의 `buildSpeechFallback` 이 제목·본문으로 즉석 조립한다. 11/23 동향 기준 3,211자(약 8분)이고 스페인어 이름이 그대로 읽힌다.
- **듣기 버튼**: 동향 최신·상세 화면 날짜 아래. 기기 내장 음성(Web Speech API), 문장 단위 재생, 재생↔정지만(일시정지 없음). 화면을 떠나면 멈춘다. 대본은 `fetchSpeechScript` 로 따로 조회한다(`NEWS_SELECT` 에는 넣지 않음 — 컬럼이 없어도 화면이 깨지지 않게).
- **단축어 API** `GET /api/honduras/speech`: `Authorization: Bearer <HONDURAS_SPEECH_TOKEN>`(Vercel Production 등록됨, `SMS_INGEST_TOKEN` 과 별개). 최신 동향 대본을 `text/plain` 으로. 빈 상태·오류도 200 + 말할 문장.
- **news-push**: `speech_script` 컬럼이 없으면 대본만 빼고 다시 저장한다. 보고 줄에 「낭독대본 N자」.
- **iPhone 단축어**: 「URL 내용 가져오기」→「텍스트 말하기」. 절차는 `docs/MFH-SIRI-BRIEFING.md` 4번.

## 실기 결과 · 미확인
- 수동 실행(단축어 버튼) 성공. **시리 음성 호출 실패** — "온두라스 동향" 을 지명 질문으로 처리(날씨 응답·연결 오류). 이름을 지명 없는 것으로 바꾸는 안(선교 브리핑 등)을 제안했으나 우진이 보류하고 버튼 실행으로 대체. 문서의 단축어 이름은 「온두라스 동향」 그대로다.
- **3~4분 대본판은 아직 아무도 듣지 못했다** — patch122 적용 후 첫 루틴(11/24 06:00)부터 저장된다. 길이·발음 표기·읽는 속도는 그때 확인.
- 듣기 버튼은 Claude 가 브라우저에서 눌러 보지 못했고(로그인 불가) 우진의 실기 결과도 아직 없다.
- 재생 중 중단: 단축어는 다이내믹 아일랜드·단축어 타일의 ■, 앱은 같은 버튼(정지). 일시정지·이어듣기·잠금화면 컨트롤은 a단계에 없다.
- Stream Deck 연결(단축어 → 파일 > Dock 에 추가 → 시스템 > 열기)은 안내만 했고 결과 미확인. 재생·정지 스크립트 제안은 우진이 "불필요".

## b단계 (미착수 · 우진이 꺼낼 때)
AI 음성 mp3 — 일일 루틴이 대본으로 mp3 를 만들어 Storage 에 저장, 앱 플레이어·단축어가 재생. 일시정지·잠금화면 컨트롤이 이때 생긴다. TTS 서비스 선택·요금은 조사하지 않았다.

## 우진 확인이 필요한 것 / 미정
- 11/24 이후 대본판 청취 소감(분량·발음·속도) → 대본 규칙 조정 여부.
- 시리 음성 호출을 다시 시도할지(단축어 이름 변경).
- 이월(v2ei): 삼성카드 상환 출금 계좌가 국민은행 3439 가 맞는지 · 삼성카드 「Apple 결제」 3건 · 리디 ₩9,900 날짜 · 11/02 Happy Day 학비 중복 여부. 그 밖의 이월 항목과 장부 직접 기록 방법은 `docs/archive/MFH-HANDOFF-v2ei.md`.

## 미커밋 잔여물 (이번 세션과 무관 · 그대로 둠)
`flyers/dongsan-2026-07/` · `media/index.md` · `applications/` · `docs/bible-qt-kit/` · `reports/2026-H1/06-sermon-manuscript.md` · `reports/2026-SEED/` · `scripts/measure-usage.ts` · `letter-templates/assets/2026추석.heic`.

## 알려진 문제 (이월 + 이번 세션)
- 이 세션(Claude)은 앱에 로그인할 수 없어 화면 검증 불가 — 로직은 service client 임시 스크립트로, 화면은 우진 실기로 확인한다.
- 배포 주소 `https://mfh-snowy.vercel.app`(`.env.local` 의 `MFH_APP_URL`). 새 API 는 토큰 없이 `curl` 해서 401 이 오는지로 배포 여부를 볼 수 있다.
- `/usr/bin/git` 대신 `/Library/Developer/CommandLineTools/usr/bin/git` 사용(Xcode 라이선스).
- `npx next lint` 는 쓰지 말 것(타입체크 + 빌드로 검증).
- **로컬 빌드**: 개발 서버를 끈 직후 `npm run build` 가 멈출 수 있다 → `.next` 삭제 후 재실행.
- 이월: `scripts/fetch-letter-materials.mjs` 인사이트 0건 문제 · Chrome 헤드리스 QA 간헐 시간 초과.

## 다음 과제
1. 동향 대본판 청취 피드백 반영(필요하면 b단계 설계).
2. #2612(격월 첫 호 · 2027-01-01 발행 · 영상편지) 준비. 릴스 적용 여부를 시작 때 묻는다.
3. Ficohsa 명세서(마감 11/23) 대조 · 11월 환율 마감 후 삼성카드 달러 잔차 확인.
4. 이월: 미상환 필터 실사용 피드백 · 표준새번역 폰트 확인 · "버전" 요청 시 누적 변경 검토(현재 `package.json` 3.8.0 — MINOR 후보에 동향 음성 브리핑 추가).

## 다음 세션 시작 프롬프트(복사용)
```
docs/MFH-HANDOFF-v2ej.md 와 docs/MFH-CONTEXT.md 를 읽고 시작. 현재 위치와 다음 작업을 한 줄로 요약하고 결정 테이블로 방향을 확인해 줘.
```
