# MANNA → MFH 이관: 스페인어 성경 RVR1960(rvr) 버전 추가

> 작성 2026-10-13 (Manna v2-x, 앱 1.8.0). Manna 에 구현·시딩·실기기 검증까지 끝난 **Reina-Valera 1960** 버전을 MFH 앱에 같은 방식으로 넣기 위한 인수인계 자료.
> 선행 이관 문서 `MANNA-TO-MFH-BIBLE-TEXTS.md`(bible_texts 3버전)의 **후속편**이다. MFH 는 이미 같은 구조(patch105 `bible_texts` · `lib/bible/texts.ts` · `scripts/bible-seed.ts` · `BIBLE_DIR=../Manna/Bible`)라 변경은 작다.
> 이 문서가 정본, 코드는 Manna 파일이 정본(경로로 가리킴). 같은 문서를 `MFH/docs/MANNA-TO-MFH-RVR1960.md` 에 복사해 둔다(MFH repo 커밋은 MFH 세션에서).

---

## 0. 한눈에

| 블록 | 무엇 | Manna 정본 | MFH 에서 할 일 |
|---|---|---|---|
| ① 원자료 | RVR1960 절 단위 텍스트 31,103절 | `../Manna/Bible/rvr1960.txt`(이미 있음, repo 밖) | **할 일 없음** — MFH `BIBLE_DIR=../Manna/Bible` 이 그대로 가리킴 |
| ② SQL | `bible_texts.version` check 제약에 `'rvr'` 추가 | `supabase/patch36-bible-rvr.sql` | 다음 번호로 새 patch(§3 초안, 현재 MFH 최신 = patch108 → 예상 `patch109-bible-rvr.sql`). 콘솔 실행 |
| ③ 시딩 | `parseRvr()` — txt 한 줄 = 한 절 | `scripts/bible-seed.ts` V4 | MFH `scripts/bible-seed.ts` 에 함수 1개 + parsers 맵 1줄 + 사용법 문구(§4) |
| ④ 상수 | `rvr: 'RVR1960'` | `lib/bible/texts.ts` V3 | MFH `lib/bible/texts.ts` 2줄(§5) |
| ⑤ 화면 | 버전 선택 4단 | 자동(`BIBLE_VERSIONS` 사용처 전부) | **코드 수정 없음** — `app/bible/read/VersionSelect.tsx` 머리 주석만 V2(4단)로 |

PDF → txt 추출기(`../Manna/scripts/rvr-extract.py`)는 Manna 에만 둔다. 원자료를 다시 만들 일이 생기면 Manna 에서 돌리고, MFH 는 같은 txt 로 재시딩만 한다.

---

## 1. 전제·가드레일 (반드시 유지)

- **저작권**: RVR1960 = © Sociedades Bíblicas en América Latina 1960, 갱신 © Sociedades Bíblicas Unidas 1988. "Reina-Valera 1960" 은 등록상표. **공개 본문 아님.** 원천 PDF(Bibles.org.uk 조판본)는 「Permission for personal use only」.
- → 개역개정과 **같은 원칙**: 멤버 전용 RLS(MFH = `is_member`) 안에서 내부 열람만. repo·공개 URL·공개 페이지(`/p/…`) 노출 금지. 화면 하단 「RVR1960 · 내부 열람용」(기존 문구가 `BIBLE_VERSION_LABEL` 로 자동).
- 원자료(`Bible/` 의 PDF·txt)는 repo 밖(.gitignore). **MFH repo 에 txt 를 복사하지 않는다.**
- 시딩은 service role 스크립트만(앱은 읽기만).

---

## 2. 원자료 — `../Manna/Bible/` (repo 밖)

| 파일 | 내용 |
|---|---|
| `Biblia-Reina-Valera-1960.pdf` | 원천. 1,720쪽 pdfLaTeX 조판본(2005, Bibles.org.uk) |
| `rvr1960.txt` | **시딩 입력.** UTF-8, 31,103줄, 한 줄 = `BB C:V 본문`(BB = 정경 순서 01~66, 두 자리) |

예:
```
01 1:1 En el principio creó Dios los cielos y la tierra.
19 23:1 <Salmo de David.>Jehová es mi pastor; nada me faltará.
43 3:16 Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, …
```

검증 상태(Manna 에서 확인 완료):
- 66권 · 1,189/1,189장 · 31,103절 · 모든 장이 1절부터 빈틈 없이 연속 · 추출 경고 0.
- 책별 절수 = KJV 계열 표준과 일치. 개역개정 대비 차이(판 차이, 정상): 신 959(+3) · 대상 942(+1) · 시 2461(+3) · 렘 1364(+3) · 겔 1273(+1) · 요 879(-1) · 행 1007(+2) · 롬 433(+1) · 고후 257(+1).
- 시편 표제 125개 + 119편 히브리 자모(Alef…)는 1절(또는 해당 절) 앞 `<표제>` — `VerseText` 가 소제목 블록으로 그린다(새한글 `<소제목>` 과 같은 규칙).
- 원자료 결함 보정(추출기에 내장): 시47 여백의 잘못된 「10」→ 9절에 합침 · 시47:3 El→Él · 출1:1·신1:1 장식 대문자 강세 É.
- 알려진 한계: 줄 끝 하이픈으로 끊긴 단어는 붙여 복원 → 원래 하이픈 지명(Bet-el 등)이 마침 줄 끝에서 끊긴 드문 경우 「Betel」처럼 붙을 수 있다.

---

## 3. SQL 초안 — `supabase/patch109-bible-rvr.sql` (번호는 MFH 최신 확인 후)

MFH patch105 의 check 제약은 이름 없는 컬럼 제약 → Postgres 기본 이름 `bible_texts_version_check`(Manna 와 동일, Manna 에서 그대로 성공).

```sql
-- MFH patch109 — 인앱 성경 본문에 스페인어 Reina-Valera 1960(rvr) 버전 추가. Manna patch36 이식(docs/MANNA-TO-MFH-RVR1960.md).
--   bible_texts.version check 제약을 nkrv·nkt·esv·rvr 로 넓힌다. 본문 시딩은 scripts/bible-seed.ts rvr(service role).
--   열람 범위·RLS 는 patch105 그대로(멤버 전용 · 내부 열람용).
--   멱등: 다시 실행해도 결과 같음.

alter table public.bible_texts drop constraint if exists bible_texts_version_check;
alter table public.bible_texts
  add constraint bible_texts_version_check check (version in ('nkrv', 'nkt', 'esv', 'rvr'));
```

순서: **SQL 콘솔 실행 → 시딩**(제약이 먼저 넓어져야 insert 가 통과). 앱 코드는 rvr 행이 없어도 개역개정 폴백이라 배포 순서는 무관.

---

## 4. 시딩 — MFH `scripts/bible-seed.ts`

Manna V4 와 같은 변경 3곳. MFH 는 이미 `existsSync`·`readFileSync`·`join`·`BIBLE_DIR`·`makeRow` 를 갖고 있다.

(1) 머리 주석·사용법
```ts
// MFH-BIBLE-SEED-V2 — RVR1960(rvr) 추가(docs/MANNA-TO-MFH-RVR1960.md, Manna bible-seed V4).
// 사용: npx tsx scripts/bible-seed.ts [nkrv|nkt|esv|rvr|all] [--dry]
//   RVR1960   <BIBLE_DIR>/rvr1960.txt (UTF-8, "BB C:V 본문", BB = 정경 순서 01~66). 원천 PDF·추출기는 Manna(scripts/rvr-extract.py).
```
(`console.error('사용법: …')` 문구에도 `rvr` 추가)

(2) 파서 — ESV 블록 뒤, 검증 리포트 앞에
```ts
// ── RVR1960 ────────────────────────────────────────────────────────────────
function parseRvr(): Row[] {
  const file = join(BIBLE_DIR, 'rvr1960.txt')
  if (!existsSync(file)) throw new Error('rvr1960.txt 없음 — Manna 에서 python3 scripts/rvr-extract.py')
  const rows: Row[] = []
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue
    const m = /^(\d{2}) (\d+):(\d+) (.+)$/.exec(line)
    if (!m) throw new Error(`RVR 형식 불명: ${line.slice(0, 60)}`)
    rows.push(makeRow('rvr', Number(m[1]), Number(m[2]), Number(m[3]), null, m[4]))
  }
  return rows
}
```

(3) parsers 맵
```ts
const parsers: Record<string, () => Row[]> = { nkrv: parseNkrv, nkt: parseNkt, esv: parseEsv, rvr: parseRvr }
```

실행:
```
npx tsx scripts/bible-seed.ts rvr --dry
npx tsx scripts/bible-seed.ts rvr
```
기대 출력: `[rvr] 절 행 31103 · 장 1189/1189 · 책 66/66` + §2 의 절수 차이 9권 → `[rvr] 시딩 완료 31103행`. (`all` 은 4버전 전부 재시딩이므로 쓰지 말 것.)

---

## 5. 상수 — MFH `lib/bible/texts.ts`

```ts
// MFH-BIBLE-TEXTS-V2 — 스페인어 RVR1960(rvr) 버전 추가(patch109).
export const BIBLE_VERSIONS = ['nkrv', 'nkt', 'esv', 'rvr'] as const
export const BIBLE_VERSION_LABEL: Record<BibleVersion, string> = {
  nkrv: '개역개정',
  nkt: '새한글',
  esv: 'ESV',
  rvr: 'RVR1960',
}
```

이것만으로 반영되는 곳(MFH 에서 `BIBLE_VERSIONS`/`BIBLE_VERSION_LABEL` 사용처 확인 완료): `app/bible/read/VersionSelect.tsx`(SegmentedTabs 4단) · `app/bible/read/page.tsx` · `app/qt/PassageAccordion.tsx` · `app/bible/study/Pane.tsx`(패널 버전 select·폴백 안내·하단 문구) · `app/bible/study/FinderSheet.tsx`(검색 버전 select) · `/api/bible/chapter·passage·search`(`parseBibleVersion`).
`VersionSelect.tsx` 머리 주석만 `MFH-BIBLE-VERSION-SELECT-V2 — 본문 버전 4단(개역개정·새한글·ESV·RVR1960)` 으로.

검색: 기존 `body ilike '%단어%'` + patch106 트라이그램 인덱스가 버전 무관하게 동작. 강세 포함 정확 입력 필요(예: `Jesús lloró` → 요 11:35).

---

## 6. 검증 체크리스트

1. `npx tsc --noEmit` → `npm run build`.
2. 시딩 뒤 DB: `select count(*) from bible_texts where version='rvr'` = **31103**.
3. 표본: 창1:1 「En el principio creó Dios…」 · 시22:1 표제 `<Al músico principal; sobre Ajelet-sahar. Salmo de David.>` · 요3:16 · 계22:21.
4. 실기기: 통독 「본문 읽기」·QT 「본문 읽기」·/bible/study 에서 RVR1960 선택 → 본문 · 하단 「RVR1960 · 내부 열람용」 · 버전 4단이 모바일 폭에서 줄바꿈 없이 들어가는지.

---

## 7. MFH 세션 첫 프롬프트 (복사)

```
MFH 앱 세션이다. 이번 목표 = Manna 에 들어간 스페인어 성경 RVR1960(rvr) 을 MFH 에도 추가.

먼저 읽어라:
1. CLAUDE.md
2. docs/MFH-HANDOFF-*.md 최신본
3. docs/MANNA-TO-MFH-RVR1960.md (이번 작업 정본 — §3 SQL · §4 시딩 · §5 상수 · §6 검증)
4. 참고: docs/MANNA-TO-MFH-BIBLE-TEXTS.md (bible_texts 3버전 선행 이관)

전제: 원자료는 ../Manna/Bible/rvr1960.txt (31,103절, 이미 검증). MFH .env.local 의 BIBLE_DIR=../Manna/Bible 그대로 쓴다 — txt 를 MFH 로 복사하지 말 것.
저작권: RVR1960 은 공개 본문 아님 → 멤버 전용 내부 열람 원칙 유지(repo·공개 URL 금지).

시작할 때 결정 테이블로 확인해 줘:
- patch 번호(최신 확인 후, 예상 patch109-bible-rvr.sql)
- 버전 코드·표시명 rvr / RVR1960 (Manna 와 동일 추천)
- 앱 버전 올리기 여부(MFH 현재 package.json 버전 기준 한 줄 제안)

순서: 계획 승인 → texts.ts·bible-seed.ts·VersionSelect 주석 → patch SQL → tsc/build → 내가 콘솔 SQL 실행 → rvr --dry → rvr 시딩 → DB 31103 확인 → 커밋 승인. push 는 내가 "push"/"푸시" 라고 할 때만.
```
