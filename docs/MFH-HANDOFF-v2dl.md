# MFH 핸드오프 v2dl (세션 종료)

> 이전: `v2dk`(통독 범위 + 장 단위 읽기 · Manna 이관 문서 · 3.6.0). 이번 세션(2026-10-05~06): **선교편지 2026년 9월호(MFH #2609) 「우리의 빛이 되시는 말씀」 제작·발행 완료** + 편지 팀 지침 보강 + 모바일 공유본 빌드 도구 신설. 앱 코드 변경 없음 — 버전 **3.6.0 유지**(MINOR 후보 `3.7.0` 은 v2dk 누적분 그대로, "버전" 요청 시 검토).

---

## 현재 위치 (한 줄)
**#2609 발행 완료**(앱 등록·OG·summary·period_end·공개 페이지 확인). 인스타 20장판은 우진 "안함"으로 종결. 다음 = 10월호(자료 기간 2026-10-05~) 또는 v2dk 이월 과제.

---

## 이번 세션 결과

### 9월호 MFH #2609 — 발행 완료
| 항목 | 값 |
|---|---|
| 제목 / 부제 | 우리의 빛이 되시는 말씀 / 석 달의 사복음서, 성경의 날로 맺다 |
| 자료 기간 | 2026-09-02 ~ 2026-10-04 (`letters.period_end` = 2026-10-04) |
| 구성 | 모바일 11면 · 카드뉴스 25장(4:5) |
| 작업 폴더 | `letter-templates/issues/2026-09/` (gitignore — Dropbox 만) |
| 발행 폴더 | `News Letter/20260930_MFH#2609_우리의 빛이 되시는 말씀/` (PDF · 모바일 공유본 · Card News 이미지 25장 · `message.md` FB/카톡 공유문) |
| letters.id | `d34ca042-0f92-414e-9c92-c68da90660a8` (2026-09 · public) |
| 공유 링크 | https://mfh-snowy.vercel.app/letters/view/d34ca042-0f92-414e-9c92-c68da90660a8 |
| OG | `og-20260930.jpg` (사진 10-04-138 — 표지 130 은 제목이 앞줄 얼굴을 가려 교체) |
| summary | 402자 입력·`--get`·og:description 확인 |

- 상세 이력·QA·확정 답변: `issues/2026-09/release-notes.md`, `materials.md` 끝 「우진 확정 답변」 1·2차, `direction.md` 끝 「★ 개요문 승인」.

### 커밋
| 커밋 | 내용 |
|---|---|
| `0a0859c` (pushed) | `docs/MFH-LETTER-AGENTS.md` · `.claude/agents/letter-designer.md` · `letter-writer.md` · `letter-templates/tools/build-mobile-share.py`(신설) · `tools/README.md` |

### 편지 팀 지침 변경 (MFH-LETTER-AGENTS.md)
1. **2026년 디자인 고정** — 남은 호는 Variant 탐색·시안 2~3개 없이 **직전 호(7·8월 디자인) `letter.html`·`letter-cardnews.html`·`og.html` 복제**, 내용·사진·면 수만 교체. 2027년 첫 호에 재탐색 여부 질문.
2. **온두라스 면 마무리 = 신앙의 시선** — 현실은 사실로 담담히, 마지막 1~2문장은 선교편지다운 신앙적 마무리.
3. **모바일 공유본 빌드 = `build-mobile-share.py`** — 직전 호 공유본의 내장 폰트 재사용 금지(그 호 글자만 들어 있어 새 글자가 대체폰트로 깨짐 — 2609 실기기에서 「빛」「맺」 등 발생). 그달 글자로 폰트 서브셋을 새로 만든다.
4. **발행 폴더 날짜 = 그 호 월의 말일** — `import_letters.py` 가 폴더 날짜로 `year_month` 를 정함(10/4 로 두면 10월호로 등록될 뻔함, dry-run 에서 발견).
5. **OG 사진** — 하단 제목이 얼굴(단체사진 앞줄)에 겹치면 사진 교체.

---

## 유의 사항
- **비공개 일지 조회 불가**: collector/팀장의 비공개 일지(`is_private`/`is_secret`) 조회 스크립트는 권한 정책(Credential Exploration)으로 거부됨. 9월호는 앱 인사이트 요약 범위만 사용(B안). 필요하면 우진이 본문을 붙여 주거나 settings 에 규칙 추가(우진 직접).
- **카드뉴스 그리드 캡처 함정**: `build-letter.py --grid` 의 headless 캡처가 간헐적으로 실패하면 `/tmp/_mfhcard-NN.png` 이전 파일이 남아 **다른 카드가 섞여 보임**(2609 에서 24장이 QT 사진으로 보였음). 카드 이미지를 발행용으로 쓸 땐 png 타임스탬프 전수 확인.
- **카드뉴스 넘침은 팀장이 실측**: designer 서브에이전트는 렌더 도구가 없어 추정치만 냄 → 팀장이 브라우저(`letter-static` 서버)에서 `.card` 별 하단 y 를 재고 푸터(≈1310 / 어두운 카드 ≈1241)와 비교.
- 인스타 캐러셀 상한 20장 — 25장 카드뉴스는 한 게시물 불가. 20장판 제작은 우진 "안함"(2609). 다음 호에 필요하면 A안(사진 전용 카드 정리·감사 카드는 캡션으로) 참고.
- 우진 원고 확정 방식: 면 단위로 **직접 문안을 붙여넣어 교체**하는 경우가 많음 → 정본은 항상 `letter.html`, `manuscript.md` 는 기록용(v3/v4 꼬리 메모).
- 미커밋 잔여물(그대로 둠, v2dk 와 동일): `flyers/dongsan-2026-07/` 수정분, `applications/`, `reports/2026-H1/06-sermon-manuscript.md`, `scripts/measure-usage.ts`, `docs/bible-qt-kit/`, `letter-templates/assets/2026추석.heic`.

## 다음 과제
1. **10월호(MFH #2610)**: 자료 기간 2026-10-05~ (앱 letter 인사이트가 10/5 부터 분석). 예고된 후속: 10/6~9 벧엘교회 단기선교(9월호 제외분), 어린이 전도 시작·결과, Zapotal 건축 착공 준비(내년 초 예상), KCPC 의료팀 일정 확정, UNAH 한국문화축제(11/9~12), 신약 통독.
2. (v2dk 이월) Manna 이식 · `/bible` 진행 표시·딥링크·통독 통계 · `/bible/study` 무한 스크롤·패널별 글꼴 · 즐겨찾기 DB 동기화 · 인사 카드 kind 토글 UI · 회계 계좌 후속.
3. 핸드오프 아카이브: `v2dk` → `docs/archive/` 이동.
