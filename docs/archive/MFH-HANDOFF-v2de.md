# MFH 핸드오프 v2de (세션 종료)

> 이전: `v2dd`(letter 인사이트 "직전 호 기준" 재설계, `letters.period_end`). 이번 세션(2026-09-15): **일지 사진 첨부 상한 5장 → 15장** 소규모 변경 1건. 그 사이(9/10~9/11) letter 프롬프트 압축 커밋 2건 반영. 앱 버전 3.5.0 유지.

---

## 현재 위치 (한 줄)
**letter 인사이트 2100 루틴 실사용 관찰 중 + 일지 사진 15장 배포 완료.** 다음 = 9월호 제작(자료 기준 기간 9/2~) 또는 앱 이월 과제.

---

## v2dd 이후 변경 (커밋 3건)

| 날짜 | 커밋 | 내용 |
|---|---|---|
| 09-10 | `docs: single 2100 insight routine (0600 removed)` | 인사이트 루틴 2100 단일화 확정 문서 반영(`insight-update.md`, 핸드오프) |
| 09-11 | `fix: compress letter insight sections 0/1 to summary-only` | `lib/insightPrompt.ts` **V3** — letter 출력 【0. 직전 호 종합】을 정확히 두 줄("보고 완료 · " / "달라진 흐름 · ")로, 【1. 다음 호 방향 제안】 근거를 한 문장(기록·날짜 나열 금지, 세부는 【2】)으로 압축 |
| 09-15 | `feat: raise journal photo limit to 15` | `lib/types.ts` `MAX_JOURNAL_PHOTOS` 5 → **15**. 폼의 추가 버튼·초과 컷·안내문·`(n/15)` 카운터가 모두 이 상수를 참조하므로 다른 코드 변경 없음. DB(`journal_entries.photos` jsonb)·Storage 정책에 개수 제약 없어 SQL 불필요. tsc 통과, push 완료 |

## 다음 과제
1. **letter 프롬프트 실사용 관찰**(v2dd 이월) — 2100 루틴 결과를 보며 개선점 도출. V3 압축 후 【0】【1】이 너무 얇지 않은지, 자료 공백 질문 유용성, 온두라스 소식 분량, `honduras_news` 정치 섹션 제외 적정성.
2. **9월호 제작 시** — collector 가 앱 letter 인사이트를 출발점으로 받되 자료 기준 기간은 우진과 확정(런북 §5). 발행 마지막 단계에 `set-letter-summary.mjs --period 2609 <종료일>` 입력.
3. 사진 15장 실기기 확인 — 한 번에 다량 업로드 시 순차 업로드 소요 시간·모바일 폼 길이가 불편하면 후속 조정(썸네일 그리드 축소 등).
4. 이월(v2dc): 공유본 빌드·OG 생성 스크립트화(`letter-templates/tools/`), 통독 실사용 조정, 건축 예산 개정판·예수소망교회 건, 버전 제안(우진이 "버전" 꺼낼 때 — 누적 MINOR 후보 3.6.0: letter 렌즈 재설계·period_end·사진 15장).

## 유의 사항
- **git 환경**: 이 Mac 의 `/usr/bin/git` 은 Xcode 라이선스 미동의로 실패한다. `/Library/Developer/CommandLineTools/usr/bin/git` 을 직접 호출하면 정상 동작(메모리에 기록됨). 우진이 `sudo xcodebuild -license accept` 실행 시 해소.
- `lib/insightExport.ts` 는 `grep` 이 바이너리로 판정 — `LC_ALL=C grep -a` 사용.
- 미커밋 잔여물(이전 세션 무관, 그대로 둠): `flyers/dongsan-2026-07/`(수정 2건 + `_slim_frame.py`), `applications/`, `reports/2026-H1/06-sermon-manuscript.md`, `scripts/measure-usage.ts`.
- 핸드오프 아카이브: `v2dd` → `docs/archive/` 이동.
