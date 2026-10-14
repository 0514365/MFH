# MFH 핸드오프 v2dm (세션 종료)

> 이전: `v2dl`(9월호 MFH #2609 발행 · 편지 팀 지침 보강 · 3.6.0). 이번 세션(2026-10-13): **Manna 의 스페인어 성경 RVR1960(rvr) 을 MFH 인앱 성경에 추가** — 코드·SQL·시딩·실기기 확인까지 완료. 앱 버전 **3.6.0 → 3.7.0**(MINOR, v2dk 누적분 포함).

---

## 현재 위치 (한 줄)
**RVR1960 4번째 본문 버전 반영 완료**(DB 31,103절 · 실기기 「성공」). 다음 = 10월호(MFH #2610) 또는 v2dk 이월 과제.

---

## 이번 세션 결과

### RVR1960(rvr) 이관 — 정본 `docs/MANNA-TO-MFH-RVR1960.md`
| 블록 | 결과 |
|---|---|
| 상수 | `lib/bible/texts.ts` V2 — `BIBLE_VERSIONS` 에 `rvr`, 표시명 `RVR1960`. 사용처(VersionSelect 4단·QT·/bible/study·API)는 자동 반영 |
| 시딩 | `scripts/bible-seed.ts` V2 — `parseRvr()`(`<BIBLE_DIR>/rvr1960.txt`, 한 줄 = `BB C:V 본문`). 원자료는 `../Manna/Bible`(repo 밖, 복사 안 함) |
| 화면 | `app/bible/read/VersionSelect.tsx` 머리 주석만 V2(4단) |
| SQL | `supabase/patch109-bible-rvr.sql` — `bible_texts_version_check` 를 nkrv·nkt·esv·rvr 로 확장. 우진 콘솔 실행 완료 |
| DB | `version='rvr'` **31103행**. 표본 창1:1 · 시22:1(표제 `<Al músico principal; …>`) · 요3:16 · 계22:21 확인 |
| dry 리포트 | 1189/1189장 · 66/66권 · 개역개정 대비 절수 차이 9권(정본 §2 와 동일, 판 차이 정상) |
| 실기기 | 통독·QT·/bible/study RVR1960 선택 · 하단 「RVR1960 · 내부 열람용」 · 4단 모바일 폭 — 우진 「성공」 |

### 커밋 (전부 pushed)
| 커밋 | 내용 |
|---|---|
| `d06ee6a` | `feat: add Spanish RVR1960 (rvr) bible version` (+ 이관 문서) |
| `f821af4` | `chore: bump version to 3.7.0` |

---

## 유의 사항
- **저작권**: RVR1960 은 공개 본문 아님 — 개역개정과 같이 멤버 RLS 내부 열람만. repo·공개 URL·`/p/…` 노출 금지.
- **재시딩**: `npx tsx scripts/bible-seed.ts rvr` (버전 단위 delete→insert, 안전). **`all` 은 4버전 전부 재시딩이니 쓰지 말 것.** 인자 없이 실행하면 기본값이 `all` 임에 주의.
- 원자료를 다시 만들어야 하면 Manna(`scripts/rvr-extract.py`)에서 추출 → MFH 는 같은 txt 로 재시딩만.
- **로컬 빌드 함정**: 미추적 `docs/bible-qt-kit/src/**/*.excerpt.tsx` 가 `tsc`·`npm run build` 를 깨뜨림(Vercel 은 git 미포함이라 무관). 이번엔 폴더를 잠시 옮겨 빌드 확인. **이 폴더를 커밋하면 배포 빌드가 깨짐** → 커밋 전 tsconfig `exclude` 에 `docs` 추가 또는 폴더 정리 결정 필요.
- `package-lock.json` 의 루트 version 은 3.2.0 에 멈춰 있음(기존 관행상 package.json 만 올림). SoT 는 `package.json`.
- 미커밋 잔여물(그대로 둠): `flyers/dongsan-2026-07/` 수정분, `flyers/dongsan-2026-07/_slim_frame.py`, `applications/`, `reports/2026-H1/06-sermon-manuscript.md`, `scripts/measure-usage.ts`, `docs/bible-qt-kit/`, `letter-templates/assets/2026추석.heic`.

## 다음 과제
1. **10월호(MFH #2610)**: 자료 기간 2026-10-05~. 예고된 후속: 10/6~9 벧엘교회 단기선교, 어린이 전도 시작·결과, Zapotal 건축 착공 준비, KCPC 의료팀 일정, UNAH 한국문화축제(11/9~12), 신약 통독. 2026년 디자인 고정(직전 호 복제) 규칙 적용.
2. `docs/bible-qt-kit/` 처리 결정(tsconfig exclude / 이동 / 삭제).
3. (v2dk 이월) `/bible` 진행 표시·딥링크·통독 통계 · `/bible/study` 무한 스크롤·패널별 글꼴 · 즐겨찾기 DB 동기화 · 인사 카드 kind 토글 UI · 회계 계좌 후속.
