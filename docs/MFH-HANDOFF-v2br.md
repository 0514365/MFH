# MFH 핸드오프 v2br (세션 종료)

> 이전: `v2bq`(인사이트 기도제목 음영 박스). 이번 세션: **선교편지를 "모바일 우선" 체계로 전환 + 5-에이전트 프로세스 대폭 개선 + 6월호 "세움의 계절" 리허설로 모바일 디자인 확정.** 앱 코드·DB 무변경. 편지 산출물은 `issues/`(gitignore) 로컬 보존(리허설 — 앱 미등록). 지침·프롬프트·스크립트 커밋·push.

---

## 현재 위치 (한 줄)

선교편지 **메인 = 모바일 HTML**(Variant 베이스, 따뜻한 maroon, 1면 1주제·사진 우선), 카드뉴스 PDF는 **모바일 확정본을 변환**해 오프라인 게시용으로. 6월호 "세움의 계절" 모바일 `letter.html` 디자인 확정(리허설). 다음은 **모바일 → 카드뉴스 PDF 변환 리허설**.

---

## 이번 세션 작업

### 1. 모바일 Variant 프롬프트 신설 — [mobile-variant-prompts.md](../letter-templates/mobile-variant-prompts.md)
- Variant(variant.ai)가 모바일 세로 HTML 편지를 생성하도록 **구조·방향성·정신**만 전달(디자인 다양성은 Variant 몫). 선례 `v2bg/v2bh`(앱 UI), `v2bm`(flyers).
- 담은 것: WHO/WHY/SPIRIT(선교 정체성·편지 목적·분위기) · 구조(표지·온두라스·사역·가정·아웃트로) · **1면 1주제·사진 우선·2면 분할** · `data-link` 슬롯 · **폰트 스케일(가독성 기준)** · 도메인 규칙.

### 2. 5-에이전트 프로세스 개선 (지침 반영)
- **strategist = 3단계**(각 우진 승인): ① 주제 후보 2~3 + 선정 이유 → ② **기조문**(이달 주제·**도입 아이디어**·주요내용/강조점) → ③ **개요문**(항목별 **사실 골자**[무슨일·어디까지·앞으로·필요자원]·사진 계획·기도 배분).
- **writer = 사실 보고 기조**: 감상·추상·작위 금지, 타이틀=행사·목적(추상은 부제), 기도=활동 연결. **본문 전문을 축약 없이 제시**하고 한 문장씩 확정 후 designer. **작성 팁 9가지**(리허설 교정 패턴) 정의서에 박음.
- **모바일 지면**: 1면 1주제·사진 우선·2면 분할·추가사진 요청 + **폰트 스케일**(본문 ~18px·제목 26~30px 볼드·캡션 ~12.5px·표지 40px+, 실기기 확정).
- **모바일 우선 → 카드뉴스 변환**: 모바일 HTML 먼저 완성 → 내용 동일하게 카드뉴스 PDF(4:5)로 변환(레이아웃 일부 변경·사진 일부 추가).
- 반영 파일: [letter-strategist.md](../.claude/agents/letter-strategist.md)·[letter-writer.md](../.claude/agents/letter-writer.md)·[MFH-LETTER-AGENTS.md](MFH-LETTER-AGENTS.md)·[MFH-LETTER-WORKFLOW.md](MFH-LETTER-WORKFLOW.md).

### 3. 6월호 "세움의 계절" 리허설 (collector→…→designer 전 과정)
- collector 5~6월 재수집(일지 27·사진 46) → strategist 3단계(주제 "세움의 계절") → writer(사실 보고 본문) → designer(모바일 `letter.html`).
- 우진 다회 수정 반영: 한국행=김우진 단독·가족 잔류, 폰트 확대·제목 `—` 단어단위 2줄·부제 볼드, 줄간격 축소·캡션 한 줄·마무리 본문 확대, **하단 고정 앱바 제거**, 후원 계좌복사 버튼 삭제, **"MFH 앱에서 더 보기" → 공개페이지 링크**, **카카오톡 QR**(연락=이메일+카톡 QR).

---

## 핵심 메모 (다음 세션)

- **편지 산출물 = `letter-templates/issues/2026-06/`** (gitignore, 로컬 참고용). `letter-mobile.html`·`manuscript.md`·`direction.md`·`photo-index.md` 등. **리허설이라 앱 미등록**. 실제 6월말 발송 호는 **동산 단기팀 7/1 사역 실시 후 표지를 단기팀 사진으로 교체 + 단기팀 내용 일부 수정** 예정(나머지는 거의 동일 → 참고).
- **정적 프리뷰**: `.claude/launch.json` 의 **`letter-static`**(`node scripts/static-server.mjs`, port 8765, 루트=`letter-templates`). ※ python `http.server`는 sandbox `getcwd` 권한 오류로 안 떠서 node 서버로 대체. **폰 실기기 확인** = `http://<맥IP>:8765/issues/2026-06/letter-mobile.html`(같은 wifi). `preview_eval` scroll 제어 불안정 → viewport 큰 높이로 전체 캡처 우회.
- **링크 확정값**: 공개페이지 `https://mfh-snowy.vercel.app/p/mfh`(앱에서 더 보기 버튼, target=_blank) / 연락=이메일 `mailto:honduras0691@gmail.com` + 카톡 QR(`photos/kakao-qr.JPG`) / 후원 계좌는 푸터 텍스트(우리은행 1002-349-524757 예금주 김우진) / nav 'MFH' 로고는 **링크 없음**.
- 카드뉴스 마스터 = [mfh-cardnews.html](../letter-templates/mfh-cardnews.html)(V4 에디토리얼, 4:5 1080×1350, `@media print` PDF). 변환 시 색·톤 정합 참조.

---

## 다음 세션 (예정)

**모바일 `letter.html` → 카드뉴스 PDF(4:5) 변환 리허설.** 내용 동일, designer가 지면 특성에 맞춰 레이아웃 일부 변경·사진 일부 추가. 마스터 `mfh-cardnews.html` 규격(1080×1350·9장 내외)·`@media print`·Chrome headless `--print-to-pdf` 활용.

## 백로그 (v2bq 이월)
1. `news-update.md` 19행 `url` 안내(에이전트 커맨드 자동 차단 — 우진 직접/권한).
2. **선교편지 실제 발송 호**(6월말, 단기팀 7/1 사역 포함) · 인사이트 상세 리프레시 · 온두라스 동향·사진·캘린더·중보 화면 리프레시 · (보류)포트폴리오 공개 페이지.

*작성: 2026-06-17 세션 종료. 선교편지 모바일 우선 전환 + 프로세스 3단계 개선 + 6월호 리허설. 편지 산출물은 issues/ 로컬 보존(앱 미등록). 직전 v2bq → `docs/archive/`.*
