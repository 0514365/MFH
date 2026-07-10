# MFH 핸드오프 v2cp (세션 종료)

> 이전: `v2co`(데스크톱 날짜/시간 필드 수정). 이번 세션: **2026 상반기 선교 보고자료 제작 완료(23면, 우진 "전체 통과")** + static-server V2 수리. 앱 버전 3.4.0 유지(앱 코드 변경 없음).

---

## 현재 위치 (한 줄)
**2026 상반기 선교 보고자료 완성·통과** — `reports/2026-H1/MFH-2026-H1-report.pdf`(23면, 6월호 편지 디자인). 다음 = **설교문 작성**(참고자료 준비돼 있음 → `reports/2026-H1/05-sermon-reference.md`).

---

## 이번 세션 작업

### A. 상반기 보고자료 (신규 폴더 `reports/2026-H1/`)
- 4단계 승인 프로세스: 기조문(01-keynote) → 개요문(02-overview) → 본문배치(03-layout) → 디자인(04-design). 각 단계 우진 승인.
- 디자인 최종 = **6월호(#2606) 편지 디자인 계승**: 크림 `#F7F5F0` · Nanum Myeongjo 제목/본문 · 마룬 `#6A2323` · 레드 `#D34D4D` · 상단 "— 섹션" 바 · 하단 브랜드 바. (V1 마룬 A안 → V2 대형타이포 → **V3.2 최종**)
- 구성(23면): 표지(포트폴리오 hero 콜라주) / 개요 / 선교사 소개(커플사진+통합 약력) / 열매세대 / 연혁 / **온두라스 소개 2면**(지정학·한국 비교) / 비전 / 한눈에 / 광야의 시간 / 사역 5주제(주제면+콜라주면, 기도제목 없음 — 사역 보고) / **SEED 새 출발** / **SEED 소개** / 기도(2606 14면 형식) / 감사(2606 15면 형식).
- 본문 타이포 대형(명조 27~31px) — 주제당 대표사진 1장(가로=rep-landscape 원본비율 / 세로=rep-portrait), 나머지는 콜라주 면.
- **PDF 재출력**: `letter-static` 서버 켠 후
  `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-pdf-header-footer --virtual-time-budget=20000 --print-to-pdf="MFH-2026-H1-report.pdf" "http://localhost:8765/reports/2026-H1/report-2026-H1.html"`

### B. 자산 (reports/2026-H1/assets/, 80여 장)
- 편지 PDF(#2601·#2605·#2606)·사역소개 2026 PDF에서 fitz로 추출/크롭(`l2606-*`, `l2605-*`, `intro26-*`, `crop-*`).
- 앱 스토리지에서 수급: `couple-portfolio.jpeg`(선교사 소개), `hero-portfolio.jpeg`(표지) — supabase public portfolio-photos.
- 지도: `crop-honduras-map.jpg`(사역소개 PDF 41p FOR Honduras 로고).

### C. 인프라
- **static-server.mjs V2**: ROOT가 소멸한 옛 경로(`Dropbox-개인용`)여서 repo 루트로 수리·확장 — 편지 `/letter-templates/...`, 보고서 `/reports/...`. `.claude/launch.json` 경로도 현행화.

## 우진 확인 대기 (열린 항목)
1. **온두라스 소개 2면 수치 검수** — 세계은행·CIA Factbook 근사치(인구 약 1,000만·개신교 55%·가톨릭 33%·1인당 GDP 약 $3,500 등).
2. **SEED 소개 면 문구** — seedtoday.org 기준 작성, 실제와 다르면 수정.
3. 서진아 약력은 **포트폴리오 기준**(강도사 임직 2011) — 사역소개 PDF(목사 임직 2016)와 상이. 포트폴리오 쪽 채택함.

## 다음 작업
1. **설교문 작성** — `reports/2026-H1/05-sermon-reference.md` 참고(본문 사 43:16–21, 예화 표, 구조 제안, 가드레일). 시작 시 대상 교회·예배·길이 확인. "설교" 키워드 → `sermon-writer` 스킬.
2. 다음 편지 #2607(7/2~, ICMS 훈련) — 훈련 결과·소감 포함.
3. 백로그: import_letters V3(og 자동 업로드) / 리허설 노트 / v2ck 앱 백로그.

## 배움·함정 (신규)
- 이미지 기반 PDF 자산화: fitz `get_images`(임베디드) + 고DPI 렌더 후 부분 크롭. 추출 파일명 번호는 내용과 무관 — **캡션은 반드시 육안 확인** (이번에 침술/치과/가족사진 오매핑 3건 잡음).
- Chrome headless PDF: `@page { size:1280px 720px }` + `.slide { page-break-after }` 로 슬라이드덱 PDF 안정 출력.
- Browser pane: reload 후 viewport 에뮬레이션 리셋 → resize 재호출 필요, screenshot 이 직전 상태를 반환하기도 함(재촬영으로 해결).
- 포트폴리오 공개 페이지(`mfh-snowy.vercel.app/p/mfh`)에서 supabase public URL 을 curl 로 수급 가능.

## 빌드·검증 함정 (변동 없음 — v2ck·v2cl 참조)
- 앱 코드 미변경(타입체크/빌드 불필요). worktree 심링크 / prettier 금지 / push 명시 승인.

## 참고
- `docs/MFH-HANDOFF-v2cm.md`(untracked 잔존 파일)와 `CLAUDE.md`·`flyers/dongsan-2026-07/*`·`scripts/measure-usage.ts`의 로컬 수정/신규 파일은 이번 세션과 무관 — 커밋에서 제외함.

---

*작성: 2026-07-10 세션. 상반기 보고 V1→V3.2(우진 피드백 3회 반영) 완성·통과. 직전 v2co→archive.*
