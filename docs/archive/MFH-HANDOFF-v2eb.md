# MFH 핸드오프 v2eb (세션 종료)

> 이전: `v2ea`(영상화 연구 중단 시점, `docs/archive/`). 이번 세션(2026-11-02~03): **격월 발행 달력 확정 · 미디어 수집 워크플로(iPhone 단축어 → Dropbox inbox) · 릴스 파이프라인을 Remotion + fal.ai 로 교체 · 구어체 자막 규칙**. 동료 편지(체코 72호) 검토는 "여러 통 비교 후 판단"으로 보류.

---

## 현재 위치 (한 줄)
**주중 릴스는 `/fb-update` 한 번으로 완성본(mp4)까지 자동** — 사진·클립·fal 애니메이션·어절 자막·현장음 믹스. 영상편지(6·12월호)는 같은 도구를 쓰되 아직 실물 없음. 10월호(#2610)가 마지막 월간호.

---

## 이번 세션 커밋 (전부 push 됨)
| 커밋 | 내용 |
|---|---|
| `5f9587e` | 격월 달력(`MFH-LETTER-AGENTS.md` §8-0) · `MFH-MEDIA-CAPTURE.md` · `index-media.py` · `build-video.py` V2(클립 오버레이) · `reel-template.html` · `make-reel.ts` V1 · fb-pull/push 릴스 |
| `7a9c322` | 특별호 카드 템플릿은 첫 발행(2027-01-01) 때 작성 |
| `5dc23df` · `fcb0742` | iPhone 단축어 「MFH 영상 보내기」(v2 = 저장 위치 묻는 방식 — iOS 가 Dropbox 직접 지정을 무시함) |
| `d63d676` | 릴스 자막 구어체 규칙(fb-pull 지시서 [릴스 자막 규칙] · fb-update.md) |
| `7714028` | **Remotion 렌더러**(`letter-templates/remotion/`, 별도 package.json) · `build-video.py` V3 `--mux` · `scripts/animate-photo.ts`(fal.ai) · `make-reel.ts` V2 |
| `eb0da73` | 깜빡임 수정(Headless Shell) · 사진 2400px 축소 · `animate` 옵션 |
| `df7f59a` | 루트 tsconfig 에서 `letter-templates/remotion` 제외(Vercel 빌드 실패 수정 → 재배포 성공) |

## 릴스 파이프라인 (현행)
```
/fb-update
 0. media/inbox → index-media.py → media/raw + media/index.md
 1. fb-pull.ts  → 작업지시서(사진·클립 목록 + [릴스 자막 규칙])
 2. Claude     → result.json (posts + reel.scenes[{photo|clip, caption, animate?}])
 4. fb-push.ts  → weekly_fb (릴스는 kind:'reel' 게시안)
 5. make-reel.ts → 사진 다운로드·축소 → animate 장면은 animate-photo.ts(fal Kling 2.1, media/out/anim/ 캐시)
                 → 클립은 장면 길이로 잘라 1080×1920 mp4(media/out/reel-<week>/clips/)
                 → reel.props.json → Remotion 렌더(무음, Headless Shell) → build-video.py --mux(현장음·음악·육성 믹스)
                 → media/out/reel-<week_start>.mp4   (음악은 인스타 앱에서 입힘)
```
- Remotion: `src/scenes.tsx`(cover/photo/clip/end, 어절 단위 자막, `*어절*` 강조색) · `Reel.tsx`(전환 slide-up→fade→wipe→fade) · `remotion.config.ts`(CRF 21, Headless Shell). 최초 설치: `cd letter-templates/remotion && npm install && npx remotion browser ensure`(다운로드 후 압축 해제가 멈추면 `node_modules/.remotion/chrome-headless-shell/` 의 zip 을 수동 `unzip`).
- **설치된 Google Chrome 으로 렌더하면 프레임 누락·타일 반복 깜빡임** — 반드시 Headless Shell.
- fal.ai: `.env.local` `FAL_KEY`(API 권한, 선불 $10). 5초 세로 1컷 ≈ ₩300~500, 146초 소요. 결과 1244×1660 → 파이프라인이 크롭. 얼굴 멀쩡함 확인. 같은 사진 재생성 안 함(`--force`). 주당 표지·클라이맥스 1~2컷만.
- whisper-cli + `~/.cache/whisper-cpp/ggml-small.bin` 설치됨(한국어 OK) — 말하는 클립 자동 자막은 **아직 make-reel 에 미연결**.
- 폰 전송 한도 30MB → 45MB 급이면 `-crf 23` 압축본(`reel-<week>-phone.mp4`).

## 확정 결정
- 릴스 음악 = 인스타 앱에서 추가(비즈니스 계정이면 크리에이터로 전환해야 라이브러리 열림) → FB 공유. 파일 내장 음악은 영상편지·카톡본만(`--music`).
- Canva(Pro 구독함)는 **릴스 자동화에 부적합**: 연결 업로드가 영상 거부, 브랜드킷 폰트에 한글 없음, 1페이지만 생성. 수동 사용만. 생성된 디자인 `DAHZ4wED9-0`·사진 4장은 Canva 계정에 남음(삭제 가능).
- 도구 추천안(우진 승인): Remotion(무료) + Whisper(무료) + fal.ai(종량) 채택. TTS·Canva·생성 B-roll 보류.
- 특별호 카드 템플릿·동료 편지 반영은 우진이 꺼낼 때만.

## 운용 (git 밖)
- `.env.local` 에 `FAL_KEY` 교체 완료(채팅 노출 키는 삭제·교체함).
- Dropbox `MFH/media` 는 맥에서 "오프라인으로 사용 가능" 유지. 단축어 실행 시 Files 에서 Dropbox › MFH › media › inbox 선택(즐겨찾기 등록 권장). 공유 시트의 「Dropbox에 저장」도 동일하게 쓸 수 있음.
- 미커밋 잔여물(그대로): `flyers/dongsan-2026-07/`(수정 2 + `_slim_frame.py`) · `applications/` · `reports/2026-H1/06-sermon-manuscript.md` · `scripts/measure-usage.ts` · `docs/bible-qt-kit/` · `letter-templates/assets/2026추석.heic`.
- 이번 주(10/27~11/03) weekly_fb 는 테스트 데이터로 여러 번 덮어씀 — 게시 전 `/facebook` 에서 확인.

## 다음 과제
1. **10월호(#2610)** 5-에이전트 절차로 착수 — 마지막 월간호. 발행 11월 초.
2. 다음 `/fb-update` 실물 운용: 세로 클립 촬영 → 단축어 → 릴스. animate 1~2컷 비용 확인.
3. Whisper 자동 자막을 make-reel 에 연결(말하는 클립이 들어올 때).
4. 영상편지(12월호, 2027-01-01) 설계 — 육성 + Adobe Podcast Enhance, 무료 음원, Remotion 장면 확장.
5. 이월: 10월 마감 확인 · 11/13·11/15 카드 명세서 대조 · "버전" 요청 시 누적 변경 검토(릴스 파이프라인은 MINOR 후보).

## 다음 세션 시작 프롬프트(복사용)
```
docs/MFH-HANDOFF-v2eb.md 와 docs/MFH-LETTER-AGENTS.md 를 읽고 시작. 10월호(#2610) 착수 또는 /fb-update 실물 운용. 릴스 파이프라인은 letter-templates/remotion + scripts/make-reel.ts + scripts/animate-photo.ts.
```
