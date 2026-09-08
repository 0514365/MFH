# MFH 핸드오프 v2dc (세션 종료)

> 이전: `v2db`(일지 필터·뒤로가기 정정). 이번 세션(2026-09-06~08): **선교편지 2026년 8월호(MFH #2608 「다시 온두라스로」) 5-에이전트 제작 → 발행 완료.** 앱 코드 변경 없음(앱 버전 3.4.0 유지). 커밋 없음(우진 승인 대기).

---

## 현재 위치 (한 줄)
**8월호 발행 완료(import insert 1건 성공).** 남은 것 = 우진이 앱 선교편지 관리에서 **`letters.summary` 입력** + 공개 페이지 노출 확인. 다음 = 9월호(자료 기준 기간 9/2~) 또는 앱 이월 과제.

---

## 이번 세션 작업 — 8월호 제작 기록

- **자료 기준 기간**: 2026-08-03 ~ 2026-09-01 + 편입 1건(9/5 주일학교). 8/1~8/2 공백은 미편입.
- 산출물 폴더: `letter-templates/issues/2026-08/` — materials(+우진 확정 답변 Q1~Q17·수정 지시 16건 기록)·direction(v2)·manuscript(v2.2)·image-map·honduras-news·private-entries·letter.html(모바일 10면)·letter-cardnews.html(16장)·MFH-2608-cardnews.pdf·MFH-2608-mobile-share.html·release-notes.md·review/.
- 발행 폴더: `News Letter/20260831_MFH#2608_다시 온두라스로/` (PDF·모바일 공유본·Card News 이미지 16장) → `python3 scripts/import_letters.py --apply` insert 성공(2026-09-08).
- 디자인: Variant 생략, **7월호 letter.html 베이스** 단일 시안. 카드뉴스는 7월호 letter-cardnews.html 베이스, 온두라스 면을 사진/본문 2장으로 분할해 16장.
- 신규 보조 스크립트: `scripts/fetch-private-entries.mjs` V1 — 비공개(is_private/is_secret) 일지 추출(우진 명시 지시 시만 사용). 8/21·22·23·28·29 비공개 5건은 5면 "한국에서의 만남"에 실명 없이 요약 반영(8/28 secret 건은 제외).

## 이번 호에서 확립·정정된 규칙 (지침 반영 완료)
- **일지 인용 틀 금지** ("○○ 선교사는 이렇게 적었습니다"류) → 1인칭 고백으로 풀기. `docs/MFH-LETTER-AGENTS.md` §6 + `.claude/agents/letter-writer.md` 규칙 11 추가.
- 모바일 본문 **왼쪽정렬**(양끝정렬 시 keep-all 공백 벌어짐 — 우진 확정).
- **모바일 공유본은 외부 리소스 0** 이어야 함 — Tailwind CDN 의존 letter.html 을 그대로 base64 임베드하면 iOS 미리보기에서 스타일 깨짐. 해결 절차: headless Chrome `--dump-dom` 으로 Tailwind 생성 CSS 를 캡처 → 외부 link/script 제거 → 7월호 공유본의 `@font-face`(base64) 블록 이식 → 사진 base64 임베드. (다음 호부터 tools 로 스크립트화 권장.)
- 카드뉴스 다크 카드 푸터는 `@missionforhonduras` 대신 이메일로 통일.
- 실명·금액·교회명 비공개 원칙(5면), KCPC 헌금 금액 미언급, 후원 협력 교회는 "SEED 선교회를 통해 연결된 교회들" 고정 문안.

## 다음 과제
1. **`letters.summary` 입력**(우진, 앱) — 텍스트는 `letter-templates/issues/2026-08/release-notes.md` 「letters.summary 입력용 텍스트」. 공개 페이지 우측 칼럼 노출 확인.
2. `scripts/fetch-private-entries.mjs`·8월호 산출물(issues 폴더는 gitignore) 커밋 여부 — 우진 승인 후 commit(`feat: letter 2608 tooling + writer rule`).
3. 공유본 빌드(dump-dom + 폰트 이식 + 임베드) 를 `letter-templates/tools/` 스크립트로 정리.
4. 이월: 통독 실사용 조정(v2da), 버전 제안 3.5.0(우진이 "버전" 꺼낼 때), 건축 예산 개정판·예수소망교회 건(v2cy).

## 유의 사항
- 미커밋 잔여물(이전 세션 무관): `flyers/dongsan-2026-07/`, `applications/`, `reports/2026-H1/06-sermon-manuscript.md`, `scripts/measure-usage.ts` + 이번 세션 `scripts/fetch-private-entries.mjs`, `docs/MFH-LETTER-AGENTS.md`, `.claude/agents/letter-writer.md`, `News Letter/20260831_…/`.
- `_preview/`·`review/`·`photos-extra/`·`letter-cardnews.pre-card04.html` 은 작업 부산물(issues 폴더 gitignore).
- 핸드오프 아카이브: `v2db` → `docs/archive/` 이동 완료.
