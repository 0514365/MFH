# MFH 핸드오프 v2ea (세션 종료)

> 이전: `v2dz`(2027 개정 5단계, `docs/archive/`). 이번 세션(2026-10-30~11-02): **선교편지 영상화 연구 — 9월호로 60초 세로 쇼츠 시제품 제작**. 우진 결정으로 **연구 단계에서 중단**, 영상 제작은 더 연구한 뒤 별도 세션에서 이어 간다.

---

## 현재 위치 (한 줄)
**영상 빌드 스크립트와 9월호 시제품까지 완성, 육성·실제 배경음악은 미적용.** 영상 제작은 아직 매호 절차(런북·에이전트)에 넣지 않았다.

---

## 이번 세션 커밋
없음. **이번 세션 변경은 전부 미커밋**이다(아래 「파일」 참조).

## 만든 것
| 파일 | git | 내용 |
|---|---|---|
| `letter-templates/tools/build-letter-video.py` (`MFH-LETTER-VIDEO-V1`) | 미커밋(추적 대상) | 장면 HTML → 장면 PNG(headless Chrome) → mp4(ffmpeg). 3% 확대·0.6초 크로스페이드. `--voice`(장면별 `scene-NN.*`, 음성이 길면 장면을 늘림) · `--music`(짧으면 반복, 음성 동안 자동으로 낮춤) · `--size` · `--keep-frames`. 최종 음량 -14 LUFS |
| `letter-templates/issues/2026-09/video/shorts.html` | gitignore (Dropbox 에만) | 9:16 장면 10개. 위 200px·아래 360px 은 릴스/쇼츠 UI 안전영역 |
| `.../video/narration.md` | gitignore | 장면별 내레이션 대본 + 녹음 요령 + 빌드 명령 |
| `.../video/MFH-2609-shorts.mp4` | gitignore | 자막만, 음악 없음(약 62초, 19MB) |
| `.../video/MFH-2609-shorts-tts.mp4` | gitignore | 임시 AI 음성(Yuna) + 테스트용 합성음(71초, 23MB). 타이밍 확인용 — **배포 금지** |
| `.../video/voice-tts/` · `MFH-2609-shorts-frames/` | gitignore | 임시 음성 · 장면 PNG(28MB). 필요 없으면 지워도 됨 |

## 검증한 것 / 안 한 것
- 확인함: 장면 미리보기(글자·사진 정상, 폰트 로드됨) · mp4 규격(H.264 1080×1920 30fps + AAC) · 음량 -14.0 LUFS · 파형상 음성 10개 배치.
- **안 함**: 실기기 재생 · SNS 업로드 · 실제 음악 위 음성 덕킹(테스트 합성음이 작아 사실상 미검증) · 실제 육성 빌드 · 3분 가로 영상.

## 확정된 방향 (이번 세션 · 우진 「추천대로」)
- 방식 = **B. 내레이션 영상**(대본 + 사진 장면 + 자막 + 음성). 카드뉴스 슬라이드쇼·Remotion 애니메이션·Canva 는 채택 안 함.
- 음성 = **우진 육성 녹음** 추천(iPhone 음성 메모, 장면별 파일 → `video/voice/scene-01.m4a` …).
- 규격 = 60초 세로 + 3분 가로(후원교회 광고·유튜브) 둘 다. 지금은 세로만 있음.
- 배경음악 = 무료 음원 2~3곡 고정 사용. 곡은 **미정**.

## 미결정 · 확인 필요
1. **배경음악 곡**: Pixabay 후보(곡 페이지에 Content ID 등록 표시 없음을 2026-10-30 확인 · 다운로드 안 함 · 표시는 바뀔 수 있으니 받기 전 재확인).
   - [JesseQuinnMedia 3:49 (추천)](https://pixabay.com/music/ambient-christian-instrumental-piano-worship-calm-emotional-soaking-prayer-249459/) · [Morning Worship 4:03](https://pixabay.com/music/modern-classical-morning-worship-180330/) · [Piano Worship 4:24](https://pixabay.com/music/solo-piano-piano-worship-184108/)
   - 인기 "Hopeful Piano" 류(156908·509806·164828)와 133310 은 Content ID 등록곡이라 제외.
2. **Elmer 형제 장면 사진**(`10-02-123`): 편지에 실린 사진이지만 영상에서는 손녀를 안은 앞모습이 크게 보임 → 교체 여부 우진 확인. 대본에 "다섯 살 손자" 언급과 사진 속 손녀가 함께 나오는 점도 같이 볼 것.
3. **길이**: 육성을 넣으면 60초를 넘을 수 있음(임시 음성 71초). 대본을 줄일지 결정.
4. **더 연구할 것**: 우진이 "더 연구" 로 중단함 — 구체 주제는 다음 세션 시작 때 물을 것. 공수 대비 효과·배포 채널·제작 주기가 후보.

## 운용 (git 밖)
- 미커밋 잔여물(로컬 Mac, 그대로): `flyers/dongsan-2026-07/`(수정 2 + `_slim_frame.py`) · `applications/` · `reports/2026-H1/06-sermon-manuscript.md` · `scripts/measure-usage.ts` · `docs/bible-qt-kit/` · `letter-templates/assets/2026추석.heic` · 이번 `build-letter-video.py` + 핸드오프 이동(v2dz → archive, v2ea 신규).
- 빌드 소요: 장면 10개 mp4 1개 약 1분(`-preset slow`).

## 다음 과제
0. **영상 연구 재개**(우진이 꺼낼 때) — 위 미결정 1~4 부터. 확정되면 `docs/MFH-LETTER-AGENTS.md` 런북에 6단계로 반영, 에이전트(`letter-video`) 정의 여부 결정.
1. **10월호(MFH #2610)** 착수 — 영상과 별개로 기존 5-에이전트 절차대로.
2. 이월: 10월 마감 확인 · 11/13·11/15 카드 명세서 대조 · 실기 확인(`/login`·`/p/mfh`·`/p/mfh/prayer`·상태바 흰색) 결과 미수신.
3. v2dz 이후 처리됨(커밋 기준): 5-④ 토큰 정리(`9c99b18`) · 잔여 모달 시트 문법(`3f32c3e`) · 5-⑤ 편지 템플릿·Flyer 는 과제에서 제외(`b800bd2`, 우진이 꺼낼 때만) · 후원계좌 변경(`382a022`·`9580027`). "버전" 요청 시 누적 변경 검토.

## 다음 세션 시작 프롬프트(복사용)
```
docs/MFH-HANDOFF-v2ea.md 와 docs/MFH-LETTER-AGENTS.md 를 읽고 시작. 선교편지 영상화 연구 재개 — 시제품은 letter-templates/issues/2026-09/video/, 스크립트는 letter-templates/tools/build-letter-video.py. 무엇을 더 연구할지 묻고 미결정 항목을 결정 테이블로. 런북 반영은 승인 후.
```
