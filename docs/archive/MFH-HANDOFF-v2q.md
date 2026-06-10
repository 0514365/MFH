# MFH 핸드오프 — v2-q (2026-05-28)

> Claude Code 전환 후 **경량 핸드오프**(A 방식). 코드·git 으로 확인 가능한 마커 스택·파일 목록·패치 이력은 **제외**(코드가 진실의 원천). 여기엔 **코드만으로 안 드러나는 것**만 적는다: repo 밖 상태(Supabase) · 의사결정 맥락 · 다음 작업 · 열린 결정.
> 상세 사양은 `MFH-CONTEXT.md`(.rtfd) + `MFH-PORTFOLIO-DESIGN.md`(.rtfd, v4) 참조. 이전 풀버전 = `MFH-HANDOFF-v2p.md`.

---

## 0. 한 줄 요약

포트폴리오 Step B-2(선교편지 PDF) **완료 + 과거 편지 26건 일괄 import 완료**. 공개 페이지(`/p/mfh`)에 영상 아래 선교편지 섹션 노출 중. 다음 후보 = 영상 5건 YouTube 등록 / 다크모드 / 방명록(Step C).

---

## 1. repo 밖 상태 (코드로 추적 안 됨 — 꼭 기록)

### Supabase 데이터 (2026-05-28 기준)
- **`letters` 테이블 = 26건** (전부 `public_view=true`). 과거 선교편지 PDF import 완료.
  - 출처 = `News Letter/` 폴더 31개 중 PDF 있는 26개. 파일명 `YYYYMMDD_MFH#호수_제목` 파싱.
  - `year_month`=폴더 앞 6자리, `number`=호수(`1605`/`2512-1` 등 string), `title`=제목 없으면 "YYYY년 M월호" 자동, `sort_order`=일(DD).
  - Storage `portfolio-letters` 버킷 = PDF 26 + 표지 26 (총 52파일). 경로 `{uid}/letter-{YYYYMMDD}.pdf` / `cover-{YYYYMMDD}.{ext}`.
  - 표지 = 23건 PDF 1쪽 qlmanage 추출 + 3건 폴더 내 기존 이미지(1801/성탄/2601).
- **영상만 있어 import 제외한 5건** (추후 YouTube 업로드 → `portfolio_videos` 등록):
  - `20160304_MFH#1603_파송예배와선교지도착` (mov)
  - `20171001_MFH#1710_발로전하는복음` (mov)
  - `20171027_MFH#번외_온두라스 긴급구호` (mp4)
  - `20180114_MFH#1802_Rio Blanco 주일학교` (mp4)
  - `20201108_MFH#2011_태풍ETA` (mp4)
- patch62 검증용 테스트 편지 1건은 import 전 삭제함(중복 방지).

### 환경변수 / 키
- `.env.local` 에 `SUPABASE_SERVICE_ROLE_KEY` **임시 추가됨** (import 용).
  - ⚠️ **import 끝났으니 회수 권장**: Supabase 대시보드 → Settings → API → service_role → Reset, 또는 `.env.local` 값 삭제. (`.env*.local` 은 gitignore 라 commit 위험은 없음.)
- `ANTHROPIC_API_KEY` 는 로컬 비어있어도 됨(운영은 Vercel 환경변수). 인사이트·편지생성에만 사용.

### 로컬 환경 (CLAUDE.md 의 "Node 설치됨" 은 부정확)
- 이 Mac = **Python3 3.9.6 만 있고 Node/npm/node_modules 없음.** → 빌드 검증은 Vercel auto-build 가 유일. 로컬 `npx tsc`/`npm run build` 불가.
- 1회성 스크립트는 Python stdlib(`urllib`) + Supabase REST/Storage API 직접 호출로 작성(의존성 0). PDF→이미지는 macOS 내장 `qlmanage`(poppler 없음).

### import 도구
- `scripts/import_letters.py` (`MFH-IMPORT-LETTERS-V1`). `--dry`/`--apply`. 멱등 키=`pdf_path`(재실행 시 전건 skip 확인됨).

---

## 2. 이번 세션(v2-q) 한 일

1. Claude Code 전환 후 첫 세션. 문서·patch62 코드 반영 확인.
2. **선교편지 26건 일괄 import** (후보1 완료). 위 §1 참조.
3. 핸드오프를 경량(A) 방식으로 전환.

### 교훈
- **코드 변경 0인 작업(데이터 import)은 git/push 와 무관** — Supabase 클라우드에 직접 들어가 공개 페이지에 즉시 반영됨.
- **멱등 키는 신중히**: 같은 호수 `2512` 가 2건이라 `(year_month, number)` 로는 부족 → 고유한 `pdf_path` 를 키로.
- **`News Letter/` 는 대용량 영상 포함 → git 금지** (`.gitignore` 에 추가 필요/완료).

---

## 3. 다음 작업 후보

| # | 후보 | 비고 |
|---|---|---|
| 1 | **영상 5건 YouTube 등록** | import 의 자연 후속. mov/mp4 5건을 YouTube 업로드 후 `portfolio_videos` 에 추가(앱 영상 관리 UI 또는 스크립트) |
| 2 | 다크모드 | 죽은 splash CSS 제거 + palette dark + 포트폴리오(영상·편지 카드) 다크 토큰. Tailwind dark variant 전략 결정 |
| 3 | 포트폴리오 Step C (방명록) | guestbook 테이블 + 우진 승인 UI + 앱 배지 알림. 승인제 + rate limit |
| 4 | 일괄변경 정교화 | 기간변경/복사/Undo/칩 검색 |
| ▷ | 인사이트 별점 누적 | 실사용 데이터 축적 후 few-shot 품질↑ |

---

## 4. 열린 결정사항

- [ ] **service_role 키 회수** (위 §1 — import 끝났으니).
- [ ] **호수 2512 중복 라벨**: `20251205`(2512) + `20251224`(2512, 성탄). 둘 다 number="2512" — 거슬리면 성탄호를 `2512-2` 로 LetterEditor 에서 수정.
- [ ] **표지 비율**: LetterSection 카드 = `aspect-[3/4] object-cover` → 가로형/정사각 PDF 표지는 위아래 잘림. 어색하면 ① 더 좋은 표지 이미지 교체 ② `object-contain` 변경.
- [ ] 편지 카드 클릭 = 현재 새 탭 PDF. 추후 인앱 뷰어(react-pdf 등) 원하면 변경.
- [ ] 포트폴리오 후원 계좌 / SEED 로고 / QR 노출 여부 (DESIGN §12 보류).
- [ ] 다크모드 / N:N 연계 모델 / 일괄변경 Undo / `tasks.status` CHECK / 성경출처 한글vs영문.

---

## 5. 다음 세션 시작 문구(예시)

> "안녕 Claude. MFH 이어서. `docs/MFH-HANDOFF-v2q.md` 기준, 편지 26건 import 완료됨. 이번엔 **영상 5건 YouTube 등록**(또는 다크모드 / 방명록)."
