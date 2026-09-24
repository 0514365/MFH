# MFH 핸드오프 v2dg (세션 종료)

> 이전: `v2df`(회계 계좌 추가). 이번 세션(2026-09-24): **2026 추석 인사 카드** 제작·발송 문구 + **선교편지 종류(`letters.kind`)** 도입으로 인사 카드를 목록에 두되 최신호에서 제외. 앱 버전 3.5.0 유지.

---

## 현재 위치 (한 줄)
**추석 카드 앱 등록·배포 완료(공개 페이지 최신호 = 8월호 유지 확인).** 다음 = 9월호 제작(자료 기준 기간 9/2~) 또는 letter 인사이트 관찰·이월 과제.

---

## v2df 이후 변경 (커밋 2건)

| 날짜 | 커밋 | 내용 |
|---|---|---|
| 09-24 | `d758929` `feat: add Chuseok 2026 message card` | `cards/chuseok-2026/` 신규 |
| 09-24 | `084c2c7` `feat: letters.kind (greeting cards excluded from latest issue)` | 아래 상세 |

### 2026 추석 인사 카드 (`cards/chuseok-2026/`)
- **원본 사진**: `letter-templates/assets/2026추석.heic`(가족 6명이 손으로 별 모양 — 미커밋, HEIC) → `photo.jpg`(1600px) 로 변환.
- `card.html` **V3** — 1080×1920 세로 카드. 상단 68% 사진(하단 크림 페이드) + 붓글씨(Nanum Brush Script) "복되고 행복한 / 추석명절 되세요" + 살전 5:18 + "온두라스에서 김우진 · 서진아 선교사 가정 드림". 상단 로고·보름달·秋夕 라벨은 우진 지시로 **제거**(V2→V3). `?v=navy` 로 네이비 변주.
- `render.py` — Chrome 헤드리스로 `MFH-chuseok-2026-{cream,navy}.png` 렌더(body 패딩 24px 크롭은 PIL 로 후처리). **최종 = A 크림**(`MFH-chuseok-2026.png`; B 네이비로 갔다가 우진이 A 로 변경).
- 파생물: `MFH-chuseok-2026.pdf`(PIL, 144dpi) · `MFH-chuseok-2026-cover.png`(3:4 레터박스 — 공개 페이지 썸네일이 `aspect-[3/4] object-cover` 라 9:16 원본은 잘림) · `message.md`(카톡 짧은 인사 + 페이스북 게시글 문안).
- 인사 카드 폰트: Nanum Brush Script(붓글씨) + Noto Serif KR(성구·발신) + Montserrat — 편지 마스터(Nanum Myeongjo)와 다름, 카드 전용.

### 선교편지 종류 `letters.kind` — 인사 카드 최신호 제외
- **배경**: 공개 페이지 "최신 선교편지"(`LetterSection` `letters[0]`)와 인사이트 letter 렌즈(`insight-pull.ts` 최신호 조회) 모두 `year_month desc` 첫 행 = 최신호. 추석 카드를 2026-09 로 넣으면 최신호가 되어 버림(우진: "최신호로 반영하지 말 것").
- **결정(A안)**: `supabase/letters-kind.sql` — `kind text not null default 'letter'` + check(`letter`/`card`) + 백필(`number in ('2512','2601')` → card). **우진이 콘솔에서 실행 완료(2026-09-24 확인)**. 대안 B(summary 없으면 제외)·C(year_month 2026-08 + sort 99)는 라벨 왜곡·루틴 오작동으로 기각.
- `lib/portfolio.ts` — `PortfolioLetter.kind` + `latestIssue(letters)`(card 아닌 첫 항목, 없으면 첫 항목).
- `app/p/[slug]/LetterSection.tsx` **V11** — 최신호·연도 대표 표지 모두 `latestIssue`. 목록·연도 그리드에는 카드 그대로 표시.
- `app/portfolio/LetterEditor.tsx` **V7** — 추가 폼 "인사 카드" 체크박스(`kind`) · 목록 아이콘 🎴.
- `scripts/insight-pull.ts` — 최신호 조회 r1 에 `.eq('kind','letter')`(컬럼 없으면 기존 r2 fallback).
- `scripts/import_letters.py` **V3** — 폴더에 `.card` 마커 파일 → `kind='card'`; 폴더명 번호가 비면(`YYYYMMDD_MFH_제목`) `number=null`.
- **발행·등록**: `News Letter/20260924_MFH_2026 추석인사/`(PDF · 카드 PNG · 3:4 cover PNG · message.md · `.card`) → `import_letters.py --apply` insert 1건 성공. row: `2026-09 · number null · sort 24 · kind card · public true · title "2026 추석인사"` (id `fc9d5d1d-b20c-437c-a7b5-5cd56e3ee4be`). `set-letter-summary.mjs --list` 에서는 첫 줄에 뜨지만(정렬만) 최신호 판정에서는 제외.
- 발송 문구는 `cards/chuseok-2026/message.md` (카톡/페이스북 2종).

## 확인 결과
- 배포 후 `https://mfh-snowy.vercel.app/p/mfh` 최신 선교편지 블록 = **"다시 온두라스로"(8월호)**, 연도 그리드·전체 목록에 "2026 추석인사" 표시 — 2026-09-24 배포 후 curl 로 확인 완료(전체 편지 페이지에 "2026 추석인사" 노출, 최신 블록 "다시 온두라스로").

## 다음 과제
1. **letter 프롬프트 실사용 관찰**(v2dd 이월) — 2100 루틴 결과 관찰: V3 압축 후 【0】【1】 두께, 자료 공백 질문 유용성, 온두라스 소식 분량, `honduras_news` 정치 섹션 제외 적정성. **이번부터 최신호 = kind letter 기준(추석 카드 무시)인지 로그로 확인.**
2. **9월호 제작 시** — collector 가 앱 letter 인사이트를 출발점으로 받되 자료 기준 기간은 우진과 확정(런북 §5). 발행 마지막 단계에 `set-letter-summary.mjs --period 2609 <종료일>` 입력. 9월호 번호 `#2609` 는 추석 카드(번호 없음)와 충돌 없음.
3. 인사 카드 후속(선택): 성탄 2026 등 다음 카드는 `cards/<name>/` 복제 + `News Letter/…/.card` 마커 방식 재사용. 편집 화면에서 기존 편지의 kind 토글은 미구현(콘솔 update).
4. 회계 후속(필요 시): 기록 폼 계좌 select 에 "＋ 새 계좌…" 연동 · 통화별 기본계좌 `즐겨찾기` 우선 · 계좌 이름/계좌정보 수정.
5. 이월(v2dc~v2df): 공유본 빌드·OG 생성 스크립트화, 통독 실사용 조정, 건축 예산 개정판·예수소망교회 건, 사진 15장 실기기 관찰, 버전 제안(우진이 "버전" 꺼낼 때 — 누적 MINOR 후보 3.6.0: letter 렌즈 재설계·period_end·사진 15장·계좌 추가·letters.kind).

## 유의 사항
- **git 환경**: 이 Mac 의 `/usr/bin/git` 은 Xcode 라이선스 미동의로 실패할 수 있음 → `/Library/Developer/CommandLineTools/usr/bin/git`(메모리). 이번 세션은 `git` 그대로 동작.
- **빌드 잡음**: 미커밋 `docs/bible-qt-kit/` 발췌 `.tsx` 때문에 `npm run build` 가 타입 단계에서 실패(`../JournalForm` 모듈 없음). Next 컴파일 자체는 성공, git 에 없어 Vercel 무관. 로컬 검증은 `npx tsc --noEmit | grep -v "^docs/bible-qt-kit"`.
- Chrome 헤드리스 `--screenshot` 은 body 패딩까지 찍으므로 카드 렌더는 `--window-size=1080,1994` 후 PIL 로 (0,24)~(1080,1944) 크롭.
- `.env.local` 에 `SUPABASE_SERVICE_ROLE_KEY` 존재(import·set-letter-summary 용). 우진 지시 있을 때만 쓰기.
- 미커밋 잔여물(그대로 둠): `flyers/dongsan-2026-07/`(수정 2건 + `_slim_frame.py`), `applications/`, `reports/2026-H1/06-sermon-manuscript.md`, `scripts/measure-usage.ts`, `docs/bible-qt-kit/`, `letter-templates/assets/2026추석.heic`.
- 핸드오프 아카이브: `v2df` → `docs/archive/` 이동.
