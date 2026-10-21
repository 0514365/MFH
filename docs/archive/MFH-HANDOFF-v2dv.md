# MFH 핸드오프 v2dv (세션 종료)

> 이전: `v2du`(회계 검색 화면·공용 검색 필터, `docs/archive/`). 이번 세션(2026-10-20): **2027 리브랜딩 "Minimal Block" 기획 → 회계 모듈 선적용(a~c-4) 완료·푸시**. 앱 버전 **3.8.0 유지**(디자인 전환 누적 → 다음 "버전" 때 MINOR 후보 `3.9.0`). 커밋 전부 빌드 통과 후 푸시, 실기 통합 확인은 우진이 다음 세션 피드백.

---

## 현재 위치 (한 줄)
회계 모듈 전 화면이 2027 "Minimal Block" 디자인(흰 바탕·파스텔 블록 8색 + 할로·남색 앵커·터키석 ＋ 하나·Manrope)으로 전환됨. 다음 = **실기 통합 피드백 반영** → 2027년 전체 앱 확장(루트 승격·로고·홈·편지).

---

## 디자인 결정(확정, 우진 승인)
| 항목 | 결정 |
|---|---|
| 컨셉 | **D Minimal Block** — 참고 시안(Midjourney, 작은 달력 + 색 블록 격자 + 터키석 ＋) 구도. "한 화면에 한 가지", 카드 테두리·그림자·아이콘·칩 최소화 |
| 색 | 바탕 `#FFFFFF` · 카드면 `#F6F8FA` · 글자/선택/오늘/앵커 **남색 `#2B3160`** · ＋ 기록 **터키석 `#2EC4B6`**(유일) · 보조 `#8A90A0` · 선 `#EEF0F3` · 수입 `#2A5BC0` · 지출 `#C23A34` · 대기 `#B45309` · 일요일 `#D64A58` · 토요일 `#2EC4B6` |
| 블록 8색 | Lagoon `#8ED0CE` · Salmon `#F9ADA4` · Apricot `#FCD79B` · Mint `#C6EBE1` · Lavender `#CFCAED` · Rose `#F07F8A` · Blush `#F4CBD0` · Periwinkle `#B3B9E2` — 대분류 안 항목 정렬 순서대로 순환 |
| 블록 위 글자 | **흰 글자 + 같은 색 어두운 할로**(`text-shadow` 3겹, 50% · Apricot/Mint 65%) — 파스텔 위 흰 글자 단독은 대비 미달(1.3~2.6), 할로 적용 시 가장자리 기준 3.3~5.8. 남색 앵커 블록은 할로 없음 |
| 글꼴 | 숫자·제목 **Manrope 400/500/600**(`font-num`) · 한글 Pretendard · 800 무게 금지 |
| 네비(실기 피드백) | 하단 탭 아이콘 26px + 라벨 11px · 홈 = 중앙 돌출 남색 원 56px · ＋ = 오른쪽 아래 · L/$ = 알약 15px 남색 채움 · 승인 배지 = 내역 아이콘 우상단 |
| 적용 범위 | **회계만**(`.theme-2027` 스코프). 다른 화면·`/p` 포트폴리오는 현행 Brand Kit 그대로. 2027년에 루트로 승격 |

## 구현 구조
- `lib/palette.ts` — `brand2027` 토큰(ink·plus·paper·card·muted·line·income·expense·wait·sun·sat·block1~8·halo1~8) · `blockColor(n)` · `blockHalo(n)`(text-shadow 문자열) · `brand2027ToCssVars()` → `--b27-*`
- `app/layout.tsx` — `.theme-2027{--b27-*}` 주입 + `manrope.variable` · `app/globals.css` — `.theme-2027` 스코프가 공용 토큰(`--paper`·`--text`·`--accent`…)을 2027 값으로 브릿지, 노이즈 오버레이 해제
- `tailwind.config.ts` — `b27-*` 색 키 19개 · `fontFamily.num`
- `lib/fonts.ts` — `manrope`(next/font) · `FONT_STACK.num`
- `lib/acct-display.ts` — 항목 색 15색 사전 **폐지** → `itemPastels` = 블록 8색 순번, `pastelOf` = 대분류 고정(생활비 1 · 사역비 5 · …), `Pastel` 에 `n`·`halo` 추가(`.fill`·`.fg` 호환)
- `lib/acct-icons.tsx` — `CatIcon` 선 색 흰 → 남색(연한 블록 위 가독성, 검색·필터 시트에만 남음)
- `app/(app)/accounting/layout.tsx` — `<main className="theme-2027">`, `portfolio-theme.css` import 제거, 헤더 흰 바탕

## 회계 화면별 (전부 푸시됨)
| 화면 | 파일 | 모습 |
|---|---|---|
| 셸·탭바 | `AccountingNav.tsx` · `AccountingTitle.tsx` | 위 네비 결정 그대로. md 이상 세그먼트는 색만 전환 |
| 달력 홈 | `CalendarHome.tsx` · `page.tsx` | 제목 줄(지출/수입 글자 토글 · 그달 금액 · 오늘) → 달력 **숫자만**(거래 있는 날 남색·없는 날 흐림, 오늘 남색 원, 주말 sun/sat) → **블록 지도**(3열 · 상위 7 + 기타 · 우하단 남색 합계 · 탭 → 그 항목 이번 달 내역) → 선택일 내역(10px 색 사각형). 요약 카드·카드대금 카드·승인 배너 제거(카드대금 → 자산, 승인 → 탭 배지) |
| 빠른 기록 | `QuickEntry.tsx` | ① 통화 남색 알약·계산 과정 위·큰 숫자 남색·[지출][수입] 연한 면·이체/조정/상세 글자·키패드 연회색(연산 연한 터키석, = 남색) ② 계좌 이름 행 ③ 항목 **블록 3열**(이름만, 할로, 탭 = 저장) · 대분류 알약 · `+` 회색 블록 |
| 통계 | `report/ReportView.tsx` | 지출/수입 글자 토글 · 월/연간 알약 · 큰 숫자 + 전기 대비 · **회색 추이 막대**(현재 남색) · **블록 지도**(1위 남색 2×2, % 표시, 탭 = 드릴다운 → 내역) · 지출: 현금/카드/납부 띠 한 줄 · 수입: 후원자 목록. 도넛·% 막대 제거(`report/charts.tsx` 의 도넛·TrendChart·Card 는 **미사용 잔존**) |
| 자산 | `assets/AssetsView.tsx` | 순자산 큰 숫자 · 자산/부채 한 줄 · 통화 띠(블록 5·7·1) · 그룹 머리줄 + 이름/금액 행(아이콘 없음) · 카드 그룹 + `CardRepayButton actionsOnly` |
| 내역 | `TransactionList.tsx` | **토큰만 교체**(구조 유지) + 모바일 행 = 구분선 + 항목 색 사각형(카드 테두리 제거). 데스크탑 표·일괄 수정 그대로 |
| 승인함 | `inbox/InboxView.tsx` | **토큰만 교체**. 승인/무시 버튼 유지 — 미니멀 안의 "밀어서 승인" 은 **미도입**(편집 폼 위 제스처 검증 불가) |
| 검색 | `search/*` · `SearchFilters.tsx` | 손대지 않음(스코프 브릿지로 바탕·글자색만 따라옴, 아이콘 남색) |

## 커밋 (v2du `29cce5e` 이후, 전부 origin/main)
`ef96a56` a 토큰 → `9ad6c26` b 셸 → `aaecfab` 네비 수정 → `461e587` 요일색 → `e869b80` c-1·c-2 달력 블록 → `0628bc2` c-3 빠른 기록 → `edd184a` c-4a 통계 → `6f31627` c-4b 자산 → (이번 푸시) c-4c·d 내역·승인함 + 이 핸드오프

## 기획 자료 (claude.ai 아티팩트, 비공개 링크 — 우진 계정)
- 진단·초기 3안: https://claude.ai/artifact/2efCFVkznkxnXR11Ubmtym
- 2027 브랜드 4안(Caribe·Pino·Guara·Pastel): https://claude.ai/artifact/WdrX8j7k7H4FrtP8aBbz2N
- D안 상세 스펙 v2 Bright: https://claude.ai/artifact/JNgZZU2WHaMvBubG6eivnH
- **Minimal Block 최종(흰 글자 3단·글로우·글자체×효과·남색 앵커)**: https://claude.ai/artifact/5m7yq2SqrW31ietTSo2g8X
- 최종 8화면 미리보기: https://claude.ai/artifact/Pzhm93Agxi1UomdeAVYoQh · 네비 수정안: https://claude.ai/artifact/PEapdkDRxVuqHVXkZrudej · 요일색: https://claude.ai/artifact/PhUNbwyS8ijJYZkEqD5CrT
- Midjourney 프롬프트(V7 문법)·Ideogram/Variant 프롬프트는 이 세션 대화에만 있음 — 필요 시 `docs/MFH-BRAND-2027-PROMPTS.md` 로 저장 요청

## 운용 (git 밖)
- 빌드 검증은 스크래치 복사본(`scratchpad/buildcheck`, node_modules 링크)에서 매 커밋 `tsc` + `npm run build`. 브라우저 preview 는 로그인 필요라 화면 검증은 우진 실기.
- 미커밋 잔여물(그대로): `flyers/dongsan-2026-07/`, `applications/`, `reports/2026-H1/06-sermon-manuscript.md`, `scripts/measure-usage.ts`, `docs/bible-qt-kit/`, `letter-templates/assets/2026추석.heic`.
- 원격 `main` 이 다른 세션 커밋으로 앞설 수 있음 → 푸시 전 `git fetch` + 리베이스(이번 세션 1회 발생, 마커 주석만 충돌).

## 다음 과제
0. **실기 통합 피드백 반영**(우진 예고) — 특히: 야외 햇빛에서 블록 흰 글자(할로) 가독성 · 토요일 터키석(약하면 `sat` → `#17A094`) · 달력에서 빠진 카드대금 요약이 자산 탭으로 충분한지 · 내역·승인함 "토큰만" 상태 추가 정리 여부.
1. 선택 정리: `report/charts.tsx` 미사용 코드 제거 · 검색 화면(`search/*`) 2027 정리 · 승인함 밀기 제스처.
2. 2027 전체 확장(별도 기획): `.theme-2027` → `:root` 승격 · 로고 재채색 · 홈 숫자 블록 · 편지 템플릿 · `/p`.
3. 이월: 11/3 이후 10월 마감 확인 · 11/13·11/15 카드 명세서 대조 · **10월호(MFH #2610)** 11월 초 착수.

## 다음 세션 시작 프롬프트(복사용)
```
docs/MFH-HANDOFF-v2dv.md 를 읽고 시작. 회계 2027 Minimal Block 실기 피드백을 반영. 각 변경은 결정 테이블로 확인 후 진행, 커밋·푸시는 내가 말할 때만.
```
