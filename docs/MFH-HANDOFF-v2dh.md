# MFH 핸드오프 v2dh (세션 종료)

> 이전: `v2dg`(추석 카드·letters.kind). 이번 세션(2026-09-25): **Manna 인앱 성경 본문(bible_texts) 이식** — patch105 · 3버전 시딩 · 통독 「본문 읽기」(`/bible/read`) · QT 접이식 DB 교체(성서유니온 본문 프록시 제거). 사양 = `docs/MANNA-TO-MFH-BIBLE-TEXTS.md`. 앱 버전 **3.5.0 → 3.6.0**(MINOR: 새 화면 `/bible/read` + 인앱 본문 모듈. 이월 후보 letter 렌즈 재설계·period_end·사진 15장·계좌 추가·letters.kind 도 이 버전에 흡수).

---

## 현재 위치 (한 줄)
**인앱 성경 본문 이식 완료·배포·3기기 검증 성공(UI 2차 포함) · 버전 3.6.0.** 다음 = 이월 과제(letter 프롬프트 관찰 · 9월호 제작).

---

## 결정 (이번 세션, 추천대로 확정)

| 항목 | 결정 |
|---|---|
| 원자료 경로 | `.env.local` `BIBLE_DIR=../Manna/Bible`(복사 없음, Manna 가 정본·보정 담당 → MFH 는 재시딩만). `.gitignore` 에 `/Bible/`(로컬 복사 대비) |
| RLS | `bible_texts member read` = `is_member(auth.uid())`(patch73). insert/update/delete 정책 없음(service role 시딩만) |
| QT 접이식 | 성서유니온 본문 프록시 `/api/qt/passage` **삭제**, `/api/bible/passage`(DB) 로 완전 교체. `scripts/qt-pull.ts` 의 SU 본문 fetch(핵심절 대조)는 유지 |
| 열람 범위 | 본문은 부부 멤버 **내부 열람 한정**. 공개 페이지(`/p/…`)·repo·공개 URL 노출 금지. 화면 하단 「<버전명> · 내부 열람용」 |
| 버전 | **3.6.0 확정**(09-25, `package.json` — 홈 footer 자동 반영) |

(이전 핸드오프의 "docs/MFH-CONTEXT 결정 기록" 은 `MFH-CONTEXT` 가 5/28 이후 미갱신 `.rtfd` 라 여기 기록으로 갈음.)

## 변경 파일

| 구분 | 파일 | 내용 |
|---|---|---|
| SQL | `supabase/patch105-bible-texts.sql` | `bible_texts(version, chap_seq, book_order, chapter, verse, verse_end, body)` PK(version, chap_seq, verse) + lookup 인덱스 + RLS is_member. **우진 콘솔 실행 완료(09-25)** |
| 시딩 | `scripts/bible-seed.ts` **V1**(Manna V3 이식) | `BIBLE_DIR = resolve(cwd, process.env.BIBLE_DIR ?? loadEnv().BIBLE_DIR ?? 'Bible')`. `npx tsx scripts/bible-seed.ts all [--dry]`. 버전 단위 delete→insert |
| lib | `lib/bible/texts.ts` **V1**(Manna V2 그대로) | `BIBLE_VERSIONS`·`BIBLE_VERSION_LABEL`·쿠키 `bible_ver`·`chapSeqOf`(정경 순서 1..1189 — 계획 `start_seq/end_seq` 읽기 순서와 다름)·`bookOrderOf`·`parsePassageRange`·`getPassageVerses`·`getChapterTexts` |
| 컴포넌트 | `components/VerseText.tsx` **V1** | `<소제목>` 인라인을 절 위 별도 블록으로, 절 번호 sup 1회, `\n` 유지 |
| 통독 | `app/bible/read/page.tsx` **V1** · `app/bible/read/VersionSelect.tsx` **V1** · `app/bible/DayCard.tsx` **V4** | `/bible/read?day=N`(없으면 오늘→다음→1). 활성 계획·일정 조회는 `app/bible/page.tsx` 와 동일 쿼리. 버전 쿠키 → `getChapterTexts`, 빠진 장 있으면 하루치 전체 개역개정 폴백+안내. 이전/다음 일차·통독 링크. DayCard 메타 줄 우측 「본문 읽기 →」 |
| QT | `app/api/bible/passage/route.ts` **V1** · `app/qt/PassageAccordion.tsx` **V3** · `app/qt/QtView.tsx` **V5** · `app/api/qt/passage/route.ts` **삭제** | API: `getUser()` 없으면 401, `book&range&ver` → `{served, verses}`, 범위 내 장 하나라도 비면 개역개정 폴백, `Cache-Control: private, max-age=3600`. 접이식: 껍데기(원형 caret) V2 유지, 안쪽 = 버전 세그먼트 + VerseText + 폴백 안내 + 재시도. 쿠키는 **첫 펼침 때** 읽음(SSR 불일치 방지, Manna 와 차이) |
| 환경 | `.env.local` `BIBLE_DIR=../Manna/Bible` · `.gitignore` `/Bible/` | |
| UI 2차(09-25 실기기 피드백) | `components/VerseText.tsx` **V2** · `app/qt/PassageAccordion.tsx` · `app/bible/read/page.tsx` · `app/qt/page.tsx` · `app/qt/[id]/page.tsx` | 본문 폰트 확대: `VERSE_TEXT_CLS` 폰·패드 17.5px / ≥740px 18.5px(행간 1.85), 소제목 14/15px, 절 번호 12px — 통독·QT 접이식 공유. PC 폭: `/bible/read`·`/qt`·`/qt/[id]` 에 `lg:max-w-4xl`(≥1024px 896px, 아이패드 2xl 유지) |

## 시딩·검증 결과 (2026-09-25)
- `--dry` 리포트 = 사양 §2-2 기준값과 일치: 새한글 1,189/1,189 · 결함 장 0 · 없는 장 0 · 마지막 절 차이 3(왕상22 54/53 · 행19 40/41 · 계12 18/17) · 시 행 되돌림 1,309 · 잘린 숫자 되붙임 20 · ESV fill 1,063절 · ESV 본문 없는 절 17 제외(NA28 생략).
- DB: **nkrv 31,088 · nkt 31,103 · esv 31,077**, 세 버전 모두 `max(chap_seq)=1189`.
- 표본 12절 정상: 창41:1 「2년이 지났다」 · 막14:1 「2일 뒤면」 · 행4:4 · 요일1:1 · 요삼1:1 · 계22:21 · 마17:21 「(없음)」 · 행16:17 · 요일3:1 · 계20:1 「<1,000년 동안 다스림>」 · 신6:18-19 합절 · ESV 창1:1.
- 로컬 dev: 비로그인 `/api/bible/passage` → 401 · `/bible/read` → `/login` 307 · `/api/qt/passage` → 404(삭제 확인).
- `npx tsc --noEmit` 통과. `npm run build` 는 `docs/bible-qt-kit/` 잡음 제외 시 통과(새 라우트 2 생성). `git status` 에 `Bible/` 없음.
- **실기기 검증 완료(09-25, 우진)**: PC·아이패드·아이폰에서 `/bible/read`(Day 22 여호수아 15~24장, 새한글) · `/qt` 접이식(삿 11:12-28, 새한글·소제목 블록·`11:12` 첫 절 표기) 정상. 피드백 = 본문 폰트 약간 크게(3기기) + PC 사용폭 확대 → UI 2차 반영.

## 다음 과제
1. UI 2차(폰트·PC 폭) 3기기 확인 **성공**(09-25). 추가 조정 필요 시 `VERSE_TEXT_CLS` 한 곳만 수정.
3. 원자료 보정이 Manna 에서 생기면 MFH 는 `npx tsx scripts/bible-seed.ts <ver>` 재시딩만.
4. 이월(v2dd~v2dg): letter 프롬프트 실사용 관찰(최신호 = kind letter 기준 로그 확인) · 9월호 제작(`#2609`, `set-letter-summary.mjs --period 2609`) · 인사 카드 kind 토글 UI · 회계 계좌 후속 · 공유본 빌드/OG 스크립트화.

## 유의 사항
- **git 환경**: `/usr/bin/git` 이 Xcode 라이선스로 실패하면 `/Library/Developer/CommandLineTools/usr/bin/git`(메모리). 이번 세션 `git` 정상.
- **빌드 잡음**: 미커밋 `docs/bible-qt-kit/` 발췌 `.tsx` 때문에 `npm run build` 타입 단계 실패. 로컬 검증은 `npx tsc --noEmit | grep -v "^docs/bible-qt-kit"`, 완전 빌드는 폴더를 잠시 옮기고 실행(이번 세션 방식). Vercel 무관(git 에 없음).
- 시딩은 macOS 전용(`textutil` 로 ESV RTF 변환). `.env.local` `SUPABASE_SERVICE_ROLE_KEY` 사용 — 우진 지시("시딩") 있을 때만.
- QT 접이식 초기 버전은 항상 개역개정으로 렌더되고 첫 펼침 때 쿠키를 반영한다(통독 화면과 쿠키 공유는 동일).
- 미커밋 잔여물(그대로 둠): `flyers/dongsan-2026-07/`(수정 2건 + `_slim_frame.py`), `applications/`, `reports/2026-H1/06-sermon-manuscript.md`, `scripts/measure-usage.ts`, `docs/bible-qt-kit/`, `letter-templates/assets/2026추석.heic`. `docs/MANNA-TO-MFH-BIBLE-TEXTS.md` 는 이번 커밋에 포함.
- 핸드오프 아카이브: `v2dg` → `docs/archive/` 이동.
