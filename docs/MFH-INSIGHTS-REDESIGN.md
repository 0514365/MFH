# MFH 인사이트 전면 개정 — 설계 사양 + Claude Code 핸드오프

> **용도:** Claude Code 에서 이 문서 + `MFH-CONTEXT.md` 를 첨부해 "인사이트 페이지 전면 개정(목적 렌즈 구조)" 구현 시작.
> **상태:** 기획·UI 목업 확정(우진 승인). 코드 0. 다음 단계 = Claude Code 구현.
> **성격:** `MFH-PORTFOLIO-DESIGN.md` 와 동일한 "신규 모듈 설계 사양서"(v2-n 표준). 수정 시 새 버전(v2, v3) 누적.

-----

## 0. 한 줄 요약

인사이트 페이지를 **데이터 출처 중심**(일지/프로젝트/할일/종합 4탭) → **선교 목적 렌즈 중심**(Prayer / Balance / Fruit / Letter)으로 재편한다. 백엔드 엔진(`insightExport` + `insightPrompt` + `/api/insights/*`)은 그대로 재사용하고, 렌즈별 **전용 프롬프트 관점**과 **전용 표현**을 입힌다. 기존 4도메인 분석은 하단 "Raw domain analysis" 접이식으로 보존.

-----

## 1. 인프라 (v2-o 기준 — 변동 없음)

| 항목 | 값 |
|---|---|
| 작업 폴더 (Mac) | `/Users/wbook_m1/Dropbox (개인용)/MFH` |
| GitHub | `0514365/MFH` (main, private) → Vercel auto-deploy |
| 배포 | `mfh-snowy.vercel.app` |
| Supabase | `https://ocygdrwdpoytwwbsrdmp.supabase.co` (Pro) |
| Auth | `honduras0691@gmail.com` |
| 환경변수 | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY` |

스택: Next.js 14 (App Router) + TS(strict) + Tailwind + Supabase + Vercel + PWA + Anthropic API.

### 비용 모델
- Claude Max ≠ API 크레딧(분리). 자동 인사이트 = API 종량제.
- 모델: `claude-sonnet-4-6`(인사이트) / `claude-opus-4-7` / `claude-haiku-4-5-20251001`. SDK 미설치 → `fetch` 직접호출.
- **Balance 렌즈는 집계 기반이라 API 호출 없이 무료 동작 가능**(아래 §5-B 참조).

-----

## 2. 작업 방식 — ⭐ Claude Code 전환

기존 claude.ai 패치 방식(`/home/claude/patchN/` → `tar -cf` → `apply.py`)은 **이번부터 사용 안 함.** Claude Code 가 repo 에 직접 접근해 파일을 수정·커밋한다. 다만 아래 컨벤션은 도구와 무관하게 **그대로 유지**:

- **마커 주석 유지** — 신규/수정 파일 상단에 `MFH-XXX-VN` 마커 주석. (예: `// MFH-INSIGHTS-CLIENT-V2`)
- **TS strict + `--noUnusedLocals --noUnusedParameters` 통과.** 빌드 깨지는 코드 금지.
- **`'use client'` 경계 정확히** — 서버컴포넌트(page.tsx)와 클라이언트 분리.
- **RLS 필수** — 모든 supabase 쿼리는 `auth.uid()` 기반. insights 테이블 RLS 이미 on.
- **브랜드 토큰만 사용**(§3). 동적 클래스·색슬래시 opacity 금지.
- **검증:** 로컬에 Node/npm 가용하면 `npm run build` 또는 `tsc --noEmit` 로 선검증. 불가하면 **Vercel auto-build 가 유일 검증** → 작은 단위로 커밋·푸시.
  - ⚠️ **확인 필요:** Claude Code 실행 환경에 Node 설치 여부. 없으면 push 후 Vercel 빌드 로그로 검증.
- **단계 분리** — 렌즈 하나씩(§7 빌드 순서). 큰 단일 커밋 지양.
- 협업: 간결한 한국어, 결정 테이블, 한 단어 confirmation(`진행`/`성공`/`에러`).

-----

## 3. 브랜드 토큰 + Tailwind 주의 (변동 없음)

라이트 토큰(`lib/palette.ts`): primary#661F20 / primaryHover#531719 / accent#B61821 / accentHover#9A141B / danger#B61821 / primarySoft#F1E4E4 / accentSoft#FAE3E4 / paper#FAF8F7 / surface#FFFFFF / surfaceSubtle#F2EEEC / line#E5DFDC / text#221C1C / textMuted#80807F / textFaint#A8A6A4.

- ⚠️ **색-슬래시 opacity 동작 안 함**(`text-accent/70` ✗) → 요소 `opacity-*` 만. (검정 슬래시 `bg-black/55` 는 예외로 동작.)
- ⚠️ hover 배경 = `hover:opacity-90` 또는 `hover:border-primary`. `hover:bg-accent-soft`/`hover:bg-primary-soft` 안전.
- ⚠️ **동적 클래스 금지**(`bg-status-${x}` JIT 미감지) → 정적 전체 문자열.
- ⚠️ `bg-paper` 클래스 금지 → `style={{ background: 'var(--paper)' }}`.
- 검증색키: `bg-accent` `bg-accent-soft` `bg-primary` `bg-primary-soft` `bg-surface` `bg-surface-subtle` `bg-line` `border-line` `border-primary` `border-accent` `text-accent` `text-danger` `text-faint` `text-muted` `text-primary` `text-white` `text-ink` `focus:border-primary`.
- 반응형: 앱 내부 모듈 = `min-[740px]:` 단일 기준(마스터-디테일 2열).
- UI 텍스트 규칙: **모듈 라벨·제목·버튼 = 영어** / 그 외 한국어. 이모지 절제.

-----

## 4. 도메인 가드레일 (반드시 내장 — 변동 없음)

**기도제목 3원칙** (`lib/insightPrompt.ts` `PRAYER_GUARDRAILS`):
1. 온두라스 정치 **항상 중립**(정당·인물 거명 금지)
2. 사역 기도제목 **1~2개로 압축**
3. 가정 평강·문제예방·사전축복 비중

**인사이트 톤:** 따뜻한 목양적 동행(평가·코칭 아님, 2인칭 권면). `TONE_GUIDE`.
→ Prayer 렌즈는 3원칙이 핵심이므로 특히 엄격히 준수.

-----

## 5. 현재 인사이트 구현 현황 (재사용 자산)

전면 개정이지만 **백엔드는 거의 그대로 재사용**한다. 현재 배포·동작 중:

### 파일·마커
| 파일 | 마커 | 역할 | 개정 시 |
|---|---|---|---|
| `lib/insightExport.ts` | `MFH-INSIGHT-EXPORT-V1` | 데이터→Markdown 직렬화 + INSIGHT_PERIODS·DOMAIN_LABEL·periodStart/todayStr | **유지** (Balance/Fruit 집계 함수 추가) |
| `lib/insightPrompt.ts` | `MFH-INSIGHT-PROMPT-V1` | MISSION_BACKGROUND + PRAYER_GUARDRAILS + DOMAIN_FOCUS + TONE_GUIDE + OUTPUT_FORMAT + buildFewShot(rating>=4) + buildSystemPrompt + buildManualInstruction | **확장** (LENS_FOCUS 추가) |
| `app/api/insights/route.ts` | `MFH-INSIGHT-API-V1` | POST 자동생성. RLS 조회 → Anthropic `/v1/messages` fetch(sonnet-4-6, system 캐싱, max_tokens 1500) → insert. 키없음 503 / 402·429 분기 | **유지** (lens 파라미터 분기 추가) |
| `app/api/insights/[id]/route.ts` | `MFH-INSIGHT-ID-API-V1` | PATCH rating(1~5)·feedback_note / DELETE | **유지** |
| `app/api/insights/export/route.ts` | `MFH-INSIGHT-EXPORT-API-V1` | GET `?domain=&days=` → manualInstruction + dataMarkdown `.md` 다운로드(무료) | **유지** (lens 대응) |
| `app/api/insights/manual/route.ts` | `MFH-INSIGHT-MANUAL-API-V1` | POST domain·days·content → insert(model='manual')(무료) | **유지** (lens 대응) |
| `app/insights/page.tsx` | (마커 없음) | 서버. insights 50건 조회 + PageHeader + hasApiKey 전달 | **소폭 수정** (렌즈별 데이터 prefetch) |
| `app/insights/InsightsClient.tsx` | `MFH-INSIGHTS-CLIENT-V1` | 도메인탭(4)·기간칩(7/30/90)·수동/자동 패널·결과카드(별점·메모·삭제) | **전면 재작성 → V2** |

### 설계 결정(기존, 유지)
- 트리거 = 수동 버튼(자동 cron 아님).
- 피드백 = 별점(1~5)+메모 인라인. rating>=4 과거 인사이트를 few-shot 으로 주입(프롬프트 레벨 개인화, 재학습 아님).
- 조회 범위 = 7/30/90일.

### Supabase `insights` 테이블 (변동 없음)
`id, user_id, domain(text), period_start, period_end, content, model, rating, feedback_note, created_at`. RLS on.
- ⭐ **`domain` 은 text(자유값, CHECK 없음)** → **스키마 변경 없이** 새 렌즈 키(`prayer`/`balance`/`fruit`/`letter`)를 그대로 저장 가능. 기존 `journal/project/task/overall` 행은 레거시로 공존(하단 Raw 탭에서 노출).

-----

## 6. 개정 설계 — 목적 렌즈 4종

### IA (정보 구조)
진입점이 "어떤 데이터를 분석할까"가 아니라 **"지금 무엇을 위해 보는가"**.

```
/insights (홈)
 ├─ 연 주제 strip (year_themes)
 ├─ Lens: Prayer   🤝  → 상세
 ├─ Lens: Balance  ⚖️  → 상세
 ├─ Lens: Fruit    🌱  → 상세
 ├─ Lens: Letter   ✉️  (v3, Prayer+Fruit 합류) → 상세
 └─ ▸ Raw domain analysis (접이식: journal/project/task/overall = 기존 4탭 보존)
```

### 렌즈별 사양

#### A. Prayer (🤝 기도제목 큐레이터) — **1순위 구현**
- **목적:** 일지 기도제목·기도후보를 모아 3원칙대로 정리 → 주간 기도카드 / 편지 재료.
- **데이터 출처:** `journal_entries.prayer`, `prayer_candidate=true`, (보조) `today`.
- **표현:** 3원칙 구조 목록(사역 / 가정 / 나라). 본문 + 별점 + "편지에 담기" 액션.
- **경로:** AI generate(sonnet) 또는 Manual export(무료). 기간 = This week / This month.
- **프롬프트 관점(LENS_FOCUS.prayer):** "흩어진 기도제목을 3원칙대로 1~2개 사역 + 가정 + 중립적 나라 기도로 압축. 후원자가 함께 기도할 수 있는 따뜻한 문장."
- **저장:** `domain='prayer'`.

#### B. Balance (⚖️ 사역·가정 리듬 레이더)
- **목적:** 5개 사역분류(+가정) 활동 비중 분석 → "이번 달 가정 시간이 사역에 밀렸어요" 식 균형 알림. 3원칙 ③(가정 보호)·번아웃 예방과 직결.
- **데이터 출처:** `journal_entries.category` / `tasks.category` / `projects.category` 집계(기간 내 건수·비중).
- **표현:** 5세그먼트 비중 막대 + 상위 분류 라벨 + (선택) AI 한 줄 권면.
- ⭐ **비용 0 옵션:** 비중 막대·수치는 **순수 집계**(클라이언트/서버 계산, API 불필요). AI 권면 문장만 선택적으로 호출. → `lib/insightExport.ts` 에 `buildCategoryBreakdown(rows, period)` 집계 헬퍼 추가.
- **프롬프트 관점(LENS_FOCUS.balance):** "분류 비중을 보고 사역과 가정의 균형을 목양적으로 짚되, 죄책감 주지 말 것. 쉼·가정 시간을 사전축복으로 격려."
- **저장:** `domain='balance'` (AI 권면 저장 시).

#### C. Fruit (🌱 간증·열매 아카이브)
- **목적:** 흩어진 '감사·응답'을 모아 연 단위 간증 타임라인 → 포트폴리오·편지·보고. "하나님이 하신 일".
- **데이터 출처:** `journal_entries.thanks`, (응답된) `prayer`, `headline`.
- **표현:** 시간순 타임라인(점 + 날짜 + 간증 요약). AI 가 흩어진 감사 메모를 간증 문장으로 다듬음.
- **프롬프트 관점(LENS_FOCUS.fruit):** "감사·응답 기록에서 하나님의 일하심을 1~3개 간증으로 모아 감사의 언어로. 과장 금지, 기록에 충실."
- **저장:** `domain='fruit'`.

#### D. Letter (✉️ 월간 편지 초안) — **v3, 후순위**
- **목적:** Prayer + Fruit + 종합을 묶어 3단 구조 월간 기도편지 초안. 인사이트의 최종 출구.
- **의존:** `letters` 테이블(정의됨, 미사용). Step B-2(포트폴리오 선교편지)와 연계.
- **이번 개정에서는 진입점(렌즈 카드 + "v3" 배지)만 노출**, 생성 로직은 후속.
- **저장:** `domain='letter'`.

### 공통 (모든 렌즈)
- 별점(1~5) PATCH·메모·삭제 = 기존 InsightCard 로직 재사용.
- "편지에 담기" = Prayer/Frut 결과를 Letter 재료로 표시(이번엔 UI 플래그만, 실제 합류는 v3).
- 결과는 `insights` 테이블에 누적, 렌즈 상세에서 Past 리스트로 표시.

-----

## 7. 구현 범위 & 빌드 순서

### 파일 변경 요약
| 구분 | 파일 | 내용 |
|---|---|---|
| **재작성** | `app/insights/InsightsClient.tsx` → `MFH-INSIGHTS-CLIENT-V2` | 4탭 → 4렌즈 카드(홈) + 렌즈 상세 뷰. Raw domain 접이식 보존. |
| **확장** | `lib/insightPrompt.ts` | `LENS_FOCUS` 상수(prayer/balance/fruit/letter) + buildSystemPrompt 에 lens 분기. DOMAIN_FOCUS 는 Raw 탭용으로 유지. |
| **확장** | `lib/insightExport.ts` | `buildCategoryBreakdown()` 집계 헬퍼(Balance용, API 불필요) + LENS_LABEL. |
| **수정** | `app/api/insights/route.ts` 외 export/manual | `lens` 파라미터 수용(없으면 기존 domain 호환). |
| **수정** | `app/insights/page.tsx` | 렌즈 홈 미리보기용 경량 집계 prefetch(Balance 비중, Fruit 건수). |
| **신규(선택)** | `app/insights/LensCard.tsx` / `BalanceBar.tsx` / `FruitTimeline.tsx` | 렌즈 표현 컴포넌트(InsightsClient 안에 인라인해도 무방). |
| **유지** | `/api/insights/[id]`, 별점 PATCH, insights 스키마 | 손 안 댐. |

### 빌드 순서 (단계 분리)
1. **Phase 1 — Prayer 렌즈** (최우선): 렌즈 홈 IA + Prayer 상세(AI/Manual/별점/편지에담기). LENS_FOCUS.prayer. 가장 데이터·3원칙이 준비됨.
2. **Phase 2 — Balance 렌즈**: buildCategoryBreakdown 집계 + 비중 막대 + 선택적 AI 권면.
3. **Phase 3 — Fruit 렌즈**: thanks 집계 + 타임라인 + AI 간증 다듬기.
4. **Phase 4 — Raw domain 접이식**: 기존 4탭을 접이식 섹션으로 이전(레거시 보존).
5. **Phase 5 (v3) — Letter**: letters 연계, Step B-2 와 함께.

각 Phase 끝에 Vercel 빌드 확인 → 커밋.

-----

## 8. UI 목업 (확정)

브라우저로 열어 확인: `mfh-insights-redesign-mockup.html` (이 핸드오프와 함께 전달). 폰 화면 2개 = 인사이트 홈(4렌즈) + Prayer 렌즈 상세.

### 목업 전문 (자체 완결 — Claude Code 가 이 코드블록만으로 렌더 가능)

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MFH · Insights 전면 개정 목업</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/tabler-icons/3.31.0/tabler-icons.min.css">
<style>
  :root{
    --primary:#661F20; --primaryHover:#531719;
    --accent:#B61821; --accentHover:#9A141B;
    --primarySoft:#F1E4E4; --accentSoft:#FAE3E4;
    --paper:#FAF8F7; --surface:#FFFFFF; --surfaceSubtle:#F2EEEC;
    --line:#E5DFDC; --text:#221C1C; --textMuted:#80807F; --textFaint:#A8A6A4;
    --on:#FFFFFF;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--paper);color:var(--text);
    font-family:"Pretendard","Montserrat",-apple-system,BlinkMacSystemFont,sans-serif;
    -webkit-font-smoothing:antialiased;padding:34px 18px 64px}
  .en{font-family:"Montserrat",sans-serif}
  .head{max-width:760px;margin:0 auto 26px}
  .logo{font-family:"Montserrat";font-weight:800;letter-spacing:.06em;color:var(--primary);font-size:21px}
  .head h1{font-family:"Montserrat";font-weight:700;font-size:18px;margin:12px 0 4px}
  .head p{color:var(--textMuted);font-size:13.5px;margin:0;line-height:1.55}

  .stage{display:flex;gap:26px;flex-wrap:wrap;justify-content:center}
  .col{display:flex;flex-direction:column;align-items:center;gap:10px}
  .label{font-family:"Montserrat";font-weight:600;font-size:11.5px;letter-spacing:.05em;
    text-transform:uppercase;color:var(--textMuted)}
  .phone{width:316px;background:var(--surface);border:1px solid var(--line);
    border-radius:26px;padding:16px 16px 22px}

  .pbar{display:flex;align-items:center;gap:9px;margin-bottom:5px}
  .mark{width:26px;height:26px;border-radius:8px;background:var(--primary);color:#fff;
    display:flex;align-items:center;justify-content:center;font-size:14px}
  .ptitle{font-family:"Montserrat";font-weight:700;font-size:18px;color:var(--text)}
  .theme{font-size:11.5px;color:var(--textMuted);border-bottom:1px solid var(--line);
    padding-bottom:11px;margin-bottom:13px}

  .lens{border:1px solid var(--line);border-radius:14px;padding:12px 13px;margin-bottom:10px}
  .lens.feat{border-color:var(--primary);border-width:1.5px}
  .lrow{display:flex;align-items:center;gap:10px}
  .ico{width:32px;height:32px;border-radius:9px;background:var(--primarySoft);color:var(--primary);
    display:flex;align-items:center;justify-content:center;font-size:18px}
  .lt{flex:1}
  .lt .nm{font-family:"Montserrat";font-weight:700;font-size:14.5px;color:var(--primary)}
  .lt .ds{font-size:12px;color:var(--textMuted);margin-top:1px}
  .chev{color:var(--textFaint);font-size:18px}
  .vbadge{font-family:"Montserrat";font-size:10px;font-weight:700;background:var(--primarySoft);
    color:var(--primary);border-radius:7px;padding:2px 7px}
  .prev{font-size:12px;color:var(--textMuted);margin-top:9px;line-height:1.5}

  .barwrap{display:flex;height:8px;border-radius:5px;overflow:hidden;margin-top:10px}
  .barwrap span{display:block}

  .advanced{display:flex;align-items:center;justify-content:space-between;
    font-size:11.5px;color:var(--textMuted);padding:9px 3px 0}

  .back{display:flex;align-items:center;gap:9px;margin-bottom:14px}
  .back i{font-size:19px;color:var(--primary)}
  .chips{display:flex;gap:7px;margin-bottom:12px}
  .chip{font-family:"Montserrat";font-weight:600;font-size:11.5px;border:1px solid var(--line);
    border-radius:20px;padding:4px 11px;color:var(--textMuted);background:var(--surface)}
  .chip.on{background:var(--primary);color:#fff;border-color:var(--primary)}
  .gens{display:flex;gap:8px;margin-bottom:14px}
  .btn{font-family:"Montserrat";font-weight:600;font-size:11.5px;border-radius:9px;
    padding:7px 12px;border:1px solid var(--primary);color:var(--primary);background:var(--surface);
    display:flex;align-items:center;gap:5px}
  .btn.fill{background:var(--primary);color:#fff}

  .card{border:1px solid var(--line);border-radius:14px;padding:12px 13px}
  .ctop{display:flex;justify-content:space-between;align-items:center;margin-bottom:9px}
  .src{font-family:"Montserrat";font-size:10.5px;font-weight:600;background:var(--primarySoft);
    color:var(--primary);border-radius:7px;padding:3px 8px}
  .stars i{font-size:14px;color:var(--textFaint)}
  .stars i.on{color:var(--accent)}
  .pt{font-size:12.5px;line-height:1.55;color:var(--text);margin-bottom:6px}
  .pt b{color:var(--primary);font-weight:600}
  .cact{display:flex;gap:14px;align-items:center;margin-top:11px;padding-top:10px;
    border-top:1px solid var(--line);font-size:11.5px;color:var(--textMuted)}
  .cact .del{margin-left:auto;color:var(--accent)}
  .past{font-family:"Montserrat";font-weight:600;font-size:11px;letter-spacing:.05em;
    text-transform:uppercase;color:var(--textMuted);margin:15px 3px 4px}
  .prow{display:flex;justify-content:space-between;font-size:12.5px;color:var(--text);
    padding:9px 3px;border-top:1px solid var(--line)}
  .prow .r{color:var(--textFaint)}
  .prow .r i{color:var(--accent);font-size:13px}

  .note{max-width:760px;margin:28px auto 0;border-top:1px solid var(--line);padding-top:18px;
    font-size:13px;color:var(--textMuted);line-height:1.7}
  .note b{color:var(--text);font-weight:600}
</style>
</head>
<body>

<div class="head">
  <div class="logo">MFH</div>
  <h1 class="en">Insights — redesign concept</h1>
  <p>데이터 출처(일지·프로젝트·할일·종합) 중심 → <b>선교 목적 렌즈</b> 중심으로 재편.
     기존 4도메인 분석은 하단 <span class="en">Raw domain analysis</span>로 보존.</p>
</div>

<div class="stage">

  <!-- SCREEN 1 -->
  <div class="col">
    <div class="phone">
      <div class="pbar">
        <div class="mark"><i class="ti ti-building-church"></i></div>
        <span class="ptitle en">Insights</span>
      </div>
      <div class="theme">2026 · 길을 만드시는 주님</div>

      <div class="lens">
        <div class="lrow">
          <div class="ico"><i class="ti ti-heart-handshake"></i></div>
          <div class="lt"><div class="nm en">Prayer</div><div class="ds">이번 주 기도제목 모으기</div></div>
          <i class="ti ti-chevron-right chev"></i>
        </div>
        <div class="prev">3 points · 시 119:105</div>
      </div>

      <div class="lens">
        <div class="lrow">
          <div class="ico"><i class="ti ti-scale"></i></div>
          <div class="lt"><div class="nm en">Balance</div><div class="ds">사역·가정 리듬</div></div>
          <i class="ti ti-chevron-right chev"></i>
        </div>
        <div class="barwrap">
          <span style="width:42%;background:#661F20"></span>
          <span style="width:20%;background:#9A141B"></span>
          <span style="width:16%;background:#B61821"></span>
          <span style="width:13%;background:#D9A0A2"></span>
          <span style="width:9%;background:#E5DFDC"></span>
        </div>
        <div class="prev">Church 42 · Family 13 · Relief 9 · …</div>
      </div>

      <div class="lens">
        <div class="lrow">
          <div class="ico"><i class="ti ti-seeding"></i></div>
          <div class="lt"><div class="nm en">Fruit</div><div class="ds">간증·응답된 기도</div></div>
          <i class="ti ti-chevron-right chev"></i>
        </div>
        <div class="prev">7 testimonies this month</div>
      </div>

      <div class="lens feat">
        <div class="lrow">
          <div class="ico"><i class="ti ti-mail"></i></div>
          <div class="lt"><div class="nm en">Letter</div><div class="ds">월간 기도편지 초안</div></div>
          <span class="vbadge en">v3</span>
        </div>
        <div class="prev">Prayer + Fruit → 초안 생성</div>
      </div>

      <div class="advanced">
        <span><i class="ti ti-adjustments" style="vertical-align:-2px;margin-right:5px"></i>Raw domain analysis</span>
        <i class="ti ti-chevron-down"></i>
      </div>
    </div>
    <div class="label">Insights home</div>
  </div>

  <!-- SCREEN 2 -->
  <div class="col">
    <div class="phone">
      <div class="back">
        <i class="ti ti-arrow-left"></i>
        <div class="ico"><i class="ti ti-heart-handshake"></i></div>
        <span class="ptitle en" style="font-size:16px">Prayer</span>
      </div>

      <div class="chips">
        <span class="chip on en">This week</span>
        <span class="chip en">This month</span>
      </div>
      <div class="gens">
        <button class="btn fill en"><i class="ti ti-sparkles"></i>AI generate</button>
        <button class="btn en"><i class="ti ti-download"></i>Manual export</button>
      </div>

      <div class="card">
        <div class="ctop">
          <span class="src en">AI · 5/24–5/30</span>
          <span class="stars"><i class="ti ti-star on"></i><i class="ti ti-star on"></i><i class="ti ti-star on"></i><i class="ti ti-star on"></i><i class="ti ti-star"></i></span>
        </div>
        <div class="pt"><b>사역 ·</b> 방과후학교 새 학기 준비와 교사 충원</div>
        <div class="pt"><b>가정 ·</b> 가족이 함께 쉴 안식의 시간</div>
        <div class="pt" style="margin-bottom:0"><b>나라 ·</b> 온두라스의 평안과 회복</div>
        <div class="cact">
          <span><i class="ti ti-message" style="vertical-align:-2px;margin-right:4px"></i>메모</span>
          <span><i class="ti ti-bookmark" style="vertical-align:-2px;margin-right:4px"></i>편지에 담기</span>
          <span class="del"><i class="ti ti-trash"></i></span>
        </div>
      </div>

      <div class="past en">Past</div>
      <div class="prow"><span>5/17–5/23</span><span class="r"><i class="ti ti-star"></i> 5</span></div>
      <div class="prow"><span>5/10–5/16</span><span class="r"><i class="ti ti-star"></i> 4</span></div>
      <div class="prow"><span>5/03–5/09</span><span class="r"><i class="ti ti-star"></i> 5</span></div>
    </div>
    <div class="label">Prayer lens detail</div>
  </div>

</div>

<div class="note">
  <b>핵심 변화</b> — 진입점이 "어떤 데이터를 분석할까"가 아니라 "<b>지금 무엇을 위해 보는가</b>"(기도·균형·열매·편지)로 바뀝니다.
  각 렌즈는 같은 엔진(<span class="en">insightExport + insightPrompt + /api/insights</span>)을 재사용하되,
  렌즈마다 <b>전용 프롬프트 관점</b>과 <b>전용 표현</b>(기도=3원칙 목록 / 균형=비중 막대 / 열매=타임라인)을 가집니다.
  별점·메모는 그대로, 추가로 "<b>편지에 담기</b>"가 인사이트를 <span class="en">Letter</span>(v3)로 흘려보냅니다.
</div>

</body>
</html>
```

> 목업 아이콘은 Tabler(`ti-heart-handshake`/`ti-scale`/`ti-seeding`/`ti-mail`) 사용. 실제 앱은 ModuleIcon 패턴 또는 동일 아이콘셋 결정 필요(§9).

-----

## 9. 열린 결정사항

- [ ] **렌즈 키 저장 방식** — 추천: `insights.domain` text 에 새 키(`prayer`/`balance`/`fruit`/`letter`) 직접 저장(스키마 변경 0). 대안: `lens` 컬럼 신설. → **추천: 컬럼 추가 없이 domain 재사용.**
- [ ] **렌즈 아이콘** — 목업의 Tabler 아이콘을 그대로 쓸지, 기존 ModuleIcon/브랜드 SVG 로 맞출지.
- [ ] **Balance AI 권면** — 항상 집계만(무료) vs 버튼으로 선택적 AI 권면.
- [ ] **"편지에 담기"** — 이번 개정에서 UI 플래그만 둘지(추천), 아니면 임시 저장 테이블/필드까지 만들지.
- [ ] **Raw domain 접이식** — 유지 vs 완전 제거(레거시 행 처리). → **추천: 접이식 유지**(기존 데이터·디버그용).
- [ ] **Claude Code 환경 Node 가용 여부** — `npm run build` 선검증 가능한지 확인(§2).
- [ ] **기간 라벨** — This week / This month 2종으로 단순화 vs 기존 7/30/90 3종 유지.

-----

## 10. Claude Code 시작 문구(예시)

> "MFH 인사이트 전면 개정을 Claude Code 로 시작합니다. `MFH-INSIGHTS-REDESIGN.md` + `MFH-CONTEXT.md` 기준. 백엔드(insightExport/insightPrompt/api) 재사용하고 `InsightsClient.tsx` 를 목적 렌즈(Prayer/Balance/Fruit/Letter) 구조로 V2 재작성. **Phase 1 = Prayer 렌즈** 부터. 먼저 현재 `app/insights/InsightsClient.tsx`·`lib/insightPrompt.ts`·`lib/insightExport.ts` 를 읽고 LENS_FOCUS 설계안과 IA 골격을 제안해줘."

-----

## 11. 요약 — 한눈에

| 항목 | 결정 |
|---|---|
| 무엇을 | 인사이트 페이지: 데이터 출처 4탭 → 목적 렌즈 4종(Prayer/Balance/Fruit/Letter) |
| 왜 | 선교 활동 목적(기도 동원·가정 보호·간증·후원자 편지)과 시너지 |
| 재사용 | insightExport / insightPrompt / api/insights / insights 테이블 / 별점·메모 |
| 새로 | InsightsClient V2 재작성 + LENS_FOCUS + buildCategoryBreakdown + 렌즈 표현 |
| 스키마 | 변경 0 (domain text 에 렌즈 키 재사용 — 추천) |
| 순서 | Prayer → Balance → Fruit → Raw 접이식 → (v3) Letter |
| 도구 | Claude Code (apply.py/tar 폐기, git 직접) |
| 가드레일 | 3원칙·목양 톤·브랜드 토큰·TS strict·RLS 그대로 |
