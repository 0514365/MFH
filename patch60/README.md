# MFH patch60 — Portfolio Step A

## 개요

포트폴리오 페이지 Step A 구현.
- 공개 readonly 페이지: `/p/mfh` (로그인 불필요)
- 편집 페이지: `/portfolio` (로그인 필요)
- 신규 테이블 2개 + Storage 버킷 1개

## 사양 문서

**`MFH-PORTFOLIO-DESIGN.md`** (프로젝트 지식)

## 실행 순서

### 1) 패치 적용 (Mac 터미널)

```
cd /tmp
tar -xf "/Users/wbook_m1/Downloads/patch60.tar"
cd "/Users/wbook_m1/Dropbox (개인용)/MFH"
python3 /tmp/patch60/apply.py            # dry-run
python3 /tmp/patch60/apply.py --apply    # 실제 적용
```

### 2) Supabase SQL 실행

Supabase 대시보드 → SQL Editor → 새 쿼리 → `/tmp/patch60/portfolio.sql` 내용 붙여넣고 실행.

**자동 동작:**
- `portfolio` + `portfolio_history` 테이블 생성
- RLS 정책 설정 (owner_all + public_read)
- Storage 버킷 `portfolio-photos` 생성 + 정책
- honduras0691@gmail.com 의 user_id 로 시드 데이터 8건+1건 자동 INSERT

**확인:**
```sql
select count(*) from portfolio;          -- 1
select count(*) from portfolio_history;  -- 8
```

### 3) Vercel 배포

```
git add -A
git commit -m "patch60: portfolio step A (public /p/mfh + edit /portfolio)"
git push
```

Vercel auto-deploy → 빌드 성공 확인.

### 4) 첫 사용

1. 앱 로그인 후 브라우저에서 `/portfolio` 직접 진입 (홈 메뉴엔 아직 미연결, Step B 에서 연결)
2. 사진 3장(히어로, 김우진, 서진아) 업로드
3. 본문/연혁 확인·수정
4. 저장
5. 우상단 **"공개 페이지 보기 ↗"** 클릭 → `/p/mfh` 새 탭으로 열림
6. 공개 URL 후원자에게 공유: `https://mfh-snowy.vercel.app/p/mfh`

## 파일

```
patch60/
├── apply.py            # 멱등 적용 스크립트
├── portfolio.sql       # 스키마 + RLS + 시드
├── new/                # 신규 파일 (7개)
│   ├── lib/portfolio.ts
│   ├── app/p/[slug]/page.tsx
│   ├── app/p/[slug]/PortfolioView.tsx
│   ├── app/portfolio/page.tsx
│   ├── app/portfolio/PortfolioForm.tsx
│   ├── app/portfolio/HistoryEditor.tsx
│   └── components/PortfolioPhotoUpload.tsx
└── README.md           # 본 문서
```

## 마커

- `MFH-PORTFOLIO-TYPES-V1` — lib/portfolio.ts
- `MFH-PORTFOLIO-PUBLIC-PAGE-V1` — app/p/[slug]/page.tsx
- `MFH-PORTFOLIO-VIEW-V1` — app/p/[slug]/PortfolioView.tsx
- `MFH-PORTFOLIO-EDIT-PAGE-V1` — app/portfolio/page.tsx
- `MFH-PORTFOLIO-FORM-V1` — app/portfolio/PortfolioForm.tsx
- `MFH-PORTFOLIO-HISTORY-EDITOR-V1` — app/portfolio/HistoryEditor.tsx
- `MFH-PORTFOLIO-PHOTO-UPLOAD-V1` — components/PortfolioPhotoUpload.tsx

## 알려진 사항

- **홈에 진입점 없음**: 이번 패치는 홈 4모듈 외부에 별도 라우트만 만듭니다. 홈에서 `/portfolio` 로 가는 작은 링크는 Step B 에서 추가 예정.
- **사진 없는 상태**: 사진 업로드 전엔 placeholder(연분홍 그라데이션) 표시. 우진이 편집 페이지에서 사진 3장 업로드해야 완성됨.
- **lib/palette.ts CSS 변수 필요**: `--accent`, `--primary`, `--accent-soft`, `--primary-soft`, `--text-muted`, `--paper` 등이 globals.css 에 정의되어 있어야 함 (기존 마커 V1 정의). 없으면 색이 fallback 으로 표시.
- **slug 기본값 'mfh'** — 시드 SQL 에서 자동 설정. 변경 가능.
- **다크모드 미적용** — 본 패치는 라이트 토큰 기준. 다크모드는 별도 작업(핸드오프 §9 후보 1).
