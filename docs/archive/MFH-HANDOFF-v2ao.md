# MFH 핸드오프 v2ao

> 이전: `v2an`(Phase 4b L1 신호 칩). 이번: **보안 — Next.js 14.2 → 15.5 업그레이드 + async 요청 API 마이그레이션**. v2an 백로그였던 "audit 취약점" 해소.

---

## 현재 위치 (한 줄)

**npm audit high 취약점 0건.** `next` 14.2.35 → **15.5.19**(react 18.3.1 유지). Next 15 동기→비동기 요청 API(`cookies`/`params`/`searchParams`)에 맞춰 server 코드 전면 `await` 전환. `tsc`·`build` 통과.

---

## 이번 세션 변경 (보안 업그레이드)

**배경**: v2an 백로그의 audit 취약점(Next.js high 다수 + postcss moderate). `audit fix --force`는 next@16(React 19·proxy.ts·Turbopack 강제, breaking)을 요구 — 과함. **모든 next 취약점 범위가 `<15.5.16`** 이라 **15.5.x 한 번으로 high 전건 해소**, 16은 보류로 결정(경로 A).

**영향 평가 핵심**(이 앱 = Vercel 호스팅·App Router·`next/image`/`next/script`/rewrites/i18n 미사용): self-hosted·이미지최적화·smuggling·i18n 계열 취약점은 **해당 없음**, RSC DoS류는 가용성만+Vercel 완화로 **낮음**. 실질 위험은 낮으나 위생상 패치.

| 파일 | 수정 | 내용 |
|---|---|---|
| `package.json` | 수정 | `next` `^14.2.15` → `^15.5.19`. react/react-dom 18.3.1 유지(peer 경고 없이 설치) |
| `lib/supabase-server.ts` | 수정 | `createClient` async화 + `await cookies()` (Next 15 동적 API) |
| server route/page **28개** | 수정 | `createClient()` → `await createClient()` (browser 21개 파일은 무변경) |
| dynamic route/page **15개** | 수정 | `params`/`searchParams` → `Promise` 타입 + `await` |
| `tsconfig.json` | 수정 | `exclude`에 `patch60` 추가(옛 잔재가 타입체크 깸) |
| `patch60/**` | **삭제** | 옛 patch.tar 워크플로 잔재 10파일 제거(CLAUDE.md "더 이상 안 씀") |

**async 마이그레이션 패턴**(회귀 최소): 인자를 `props`로 받고 함수 첫 줄에서 `const params = await props.params`만 추가 → 본문의 `params.id`·`searchParams[k]` 사용처는 **무변경**. 라우트 핸들러는 2번째 인자를 `ctx`로 받아 `await ctx.params`.

---

## 우진 액션
- **배포 후 실기기 확인**: 로그인 → 일지/할 일/프로젝트 상세(`[id]`)·신규 작성(`?project=`·`?intercession=`)·공개 포트폴리오(`/p/[slug]`)·캘린더 ICS 정상 동작. (런타임 값은 동일, 형식만 async)

---

## 미결 과제 (우선순위)

| 순위 | 과제 | 상태 |
|---|---|---|
| 백로그 | **postcss moderate 2건**(Next 내부 번들) — 빌드타임·신뢰 CSS만이라 실질위험 0. `overrides`로 강제 가능하나 Next 후속 패치(15.5.x) 시 자동 해소 기대 → 수용 | 수용 |
| 백로그 | **Next 16** 업그레이드(React 19 + `middleware.ts`→`proxy.ts` + Turbopack 기본) — 별건·회귀 큼 | 보류 |
| 1 | (선택) 신호 칩 **클릭→필터** 연결 | 옵션 |
| 최하위 | 선교편지 5-에이전트 팀 피드백 반영 | 보류 |

---

## 운영 메모

- **react 18.3.1 유지** 의도적: Next 15는 React 18.3과 동작(공식 권장은 19). React 19는 Next 16 전환 시 함께. 지금 올리면 회귀 표면만 늘어남.
- `tsconfig.json`의 `"patch60"` exclude는 디렉터리 삭제 후 무의미하나 무해 — 남겨둠(필요 시 제거).
- 동적 API가 server 컴포넌트/라우트에서만 쓰임(`lib/supabase-server`에 집중) → 마이그레이션 표면이 작았음. client(`supabase-browser`)는 영향 없음.
- 검증 기준: `npx tsc --noEmit`(exit 0) + `npm run build`(전 라우트, 정적 7/7). audit high 0.

---

## 관련 커밋

- `fix: upgrade Next.js to 15.5 with async request APIs (security)` — 32파일
- `chore: remove obsolete patch60 workflow artifacts` — 10파일 삭제
- `docs: handoff v2ao — Next 15.5 security upgrade` — 이 문서

*작성: 2026-06-06 세션 (Next.js 15.5 보안 업그레이드).*
