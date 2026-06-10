# MFH 핸드오프 v2ab

> 이전 상태: `MFH-HANDOFF-v2aa.md` (포트폴리오·영상편지·patch80/81 등) 참조.
> **이번 세션 주제: 선교편지 디자인 시스템 + 작성 프로세스 + 재료 자동화 확립.**

---

## 현재 위치 (한 줄)

선교편지 **제작 워크플로·마스터 템플릿·작성 프로세스가 확립**됨. 6월 실제 편지를 동일 프로세스로 만들 준비 완료.

---

## 이번 세션 완료

### 1. 마스터 템플릿 (`letter-templates/`)
- `mfh-cardnews.html` — 카드뉴스 3장(표지·내지·마무리), 4:5(1080×1350)
- `mfh-mobile-letter.html` — 모바일 세로 스크롤 (앱 링크 3곳)
- 디자인: **브랜드킷 파스텔**(`--cool` 더스티로즈 `#DCC2C3` / `--accent` 살구코랄 `#EFC8B8` / `--navy` 딥마룬 `#5E2A2B`), 제목 명조(Nanum Myeongjo)
- **로고 3종 배치**: Brand kit(`logo-primary`)=표지헤더·마무리푸터 / 지도(`온두라스로고4`)=마무리상단 / MFH아이콘(`mfh-icon`)=CTA
- 표지 별 없음, 내지 헤더=테마컬러 띠, 본문·기도제목 큰 폰트
- `assets/`: logo-primary.png, 온두라스로고4.png, mfh-icon.png, cover.jpg

### 2. 작성 프로세스 (`docs/MFH-LETTER-WORKFLOW.md` — 지침)
- **①자료수집 → ②분석·방향 → ③제목·본문 → ④레이아웃시안 → ⑤최종**, 매 단계 검토·확정 (임의 직진 금지)
- 기도제목 **[온두라스]→[사역]→[가정]** 순, "나라" 대신 "온두라스" 타이틀
- 2026년 주제: **"주님은 길을 내십니다"** (표기: "2026년 주제")

### 3. 재료 자동화
- 앱 `/letter-materials` (`app/letter-materials/`) — 월별 일지·사진 내보내기. insights 페이지에 진입 버튼. (무료, RLS)
- `scripts/fetch-letter-materials.mjs` — Supabase 직접 (완전자동, `.env.local` 키)

### 4. 시연 결과
- **5월 편지 "두 개의 집을 짓습니다"** 완성 — 프로세스 ①~⑤ 전 과정. `letter-templates/issues/2026-05/` (git 제외)

---

## 다음 할 일

1. **6월 실제 편지** — "6월호 만들어줘" → 프로세스 ①~⑤ 진행 (이 핸드오프·지침대로)
2. (선택) 사진 ZIP 일괄다운로드 기능, Canva 버전
3. (확인) `/letter-materials` 실기기 동작 — `mfh-snowy.vercel.app/insights` → 편지 재료 버튼

---

## 주의사항

- `letter-templates/issues/` 와 호별 인스턴스 html = 개인 일지·사진 → **gitignore**
- CTA의 MFH 아이콘이 마룬 배경에 빨강이라 **대비가 약간 약함** — 필요시 아이콘에 흰 라운드 배경 추가
- 디자인 선호: 강렬한 마룬·원색 거부, **파스텔·차분** (memory `design-tone-preference`)
- 미리보기 패널은 외부 사진 참조 html을 못 띄움 → **PDF 출력(`open`)으로 확인**

---

## 관련 커밋 (push 완료)
- `dfe701c` 마스터 템플릿 + 워크플로 문서
- `e0fe849` 재료 내보내기 페이지
- `55e929a` DB 직접 스크립트 + gitignore
- `5a0b3ec` 마스터 최종(브랜드 파스텔·로고·폰트·기도제목 순서)
- `377ad8f` launch.json
- *(모바일 V3 갱신·이 핸드오프는 다음 커밋 대상)*

*작성: 2026-06 세션.*
