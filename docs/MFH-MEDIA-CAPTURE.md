# MFH 영상·사진 수집 규약 (릴스 · 영상편지용)

> 2026-11-02 확정. 격월 편지(`MFH-LETTER-AGENTS.md` §8-0)·연 2회 영상편지·주중 릴스가 같은 재료를 쓴다.
> 원본 클립은 **앱에 올리지 않는다**(Supabase Pro 여도 업로드·egress·앱 수정 부담). 원본 = Dropbox, 완성본 = YouTube(앱 `portfolio_videos`)·FB/IG.

## 1. 폰에서 볼 체크리스트 (행사 당일)

**사진** (앱 일지에 최대 5장 — 지금과 같음)
- [ ] 가로 1장 이상 (편지·카드뉴스용) · **세로 1장 이상** (릴스·쇼츠용)
- [ ] 일지 저장 후 캡션 생성(`/caption-update`) — 캡션 없는 사진은 인사이트·FB 추천에 안 실림

**영상 클립** (iPhone 카메라 · 세로 9:16 · **1080p 30fps** · 한 클립 15초 이내)
- [ ] 전경 5초 — 장소가 보이게, 폰 고정
- [ ] 활동 10초 — 찬양·수업·나눔 등 움직임, 현장 소리 살리기(말 걸지 않기)
- [ ] 얼굴·반응 5초 — 웃는 얼굴, 손, 박수 (아이 클로즈업은 보호자 동의 있는 교회만)
- [ ] 행사당 3~6개면 충분. 흔들리면 다시 찍지 말고 다른 각도로 한 번 더

**음성 메모** (선택 · iPhone 음성 메모 · 15~30초)
- [ ] 그날 느낀 한 마디 — 나중에 내레이션 초안이 된다. 조용한 데서, 폰은 한 뼘 거리

**금지**: 실명 거명 녹음 · 정치 구호·현수막 · 아이 이름이 보이는 명찰 클로즈업 · 헌금·금액.

## 2. 업로드 — iPhone 단축어 「MFH 영상 보내기」 (★2026-11-02 우진 제안)

**원리**: 폰에서 고른 영상·음성만 Dropbox `MFH/media/inbox/` 로 올린다(카메라 업로드처럼 전부 올라가지 않음). **Claude 는 Dropbox 사이트에 접속하지 않는다** — 이 맥의 Dropbox 앱이 동기화한 로컬 폴더(`~/Library/CloudStorage/Dropbox/MFH/media/inbox`)를 읽는다. 맥 Dropbox 에서 `MFH/media` 는 **"오프라인으로 사용 가능"** 으로 둘 것(온라인 전용이면 읽을 때마다 내려받아 느리고 실패할 수 있다).

### 단축어 만들기 (1회 · iPhone 단축어 앱)

1. 새 단축어 → 이름 **MFH 영상 보내기** → 상단 ⓘ → **공유 시트에 표시** 켜기 → 받는 유형: **미디어, 파일** 만.
2. 동작 순서:

   | # | 동작 | 설정 |
   |---|---|---|
   | 1 | **각 항목에 반복** (단축어 입력) | 사진 앱에서 여러 개 선택해도 전부 처리 |
   | 2 | **파일 저장** | 서비스 **Dropbox** · 경로 `/MFH/media/inbox` · **저장 위치 묻기 끄기** · **덮어쓰기 끄기** |
   | 3 | 반복 끝 → **알림 표시** | "MFH inbox 로 보냄" |

   - 파일명은 폰 원본(`IMG_1234.MOV`)이어도 된다 — 맥 쪽 스크립트가 영상 안의 **촬영 시각**을 읽어 `YYYY-MM-DD-HHMM-` 를 붙인다.
   - 음성 메모는 음성 메모 앱 → 공유 → 같은 단축어.
3. 사용: 사진 앱에서 영상 선택 → 공유 → **MFH 영상 보내기**. Wi-Fi 에서 올리는 것을 권장(클립 1개 30~40MB).

### 맥에서 정리 (월 1회 또는 편지·릴스 작업 전 · Claude 가 실행)

```bash
python3 scripts/index-media.py --dry
```
```bash
python3 scripts/index-media.py
```
`media/inbox/` 의 영상(`.mov/.mp4`)·음성(`.m4a`)을 촬영일 기준 `media/raw/YYYY/MM/YYYY-MM-DD-HHMM-<원본>.ext` 로 옮기고 `media/index.md` 를 다시 만든다. 파일명의 `<원본>` 자리는 Finder 에서 `zapotal-sunday-school` 처럼 바꿔도 된다(날짜 머리만 유지). 사진은 지금처럼 앱 일지에만 올린다.

## 3. 폴더

```
media/
├─ inbox/              iPhone 단축어 도착함 (gitignore) — 정리 스크립트가 비운다
├─ raw/YYYY/MM/        원본 클립·음성 메모 (gitignore · Dropbox 에만)
├─ index.md            자동 색인 — 날짜별 파일·종류(세로/가로/음성)·길이·해상도·MB
└─ out/                완성본 mp4 (gitignore) — 릴스 reel-YYYY-MM-DD-*.mp4 · 영상편지 MFH-XXXX-shorts.mp4
```

- 용량: 클립 15초 1080p ≈ 30~40MB → 월 20개 ≈ 0.7GB, 연 약 10GB. Dropbox 여유 용량 확인.
- `letter-templates/issues/<월>/video/` 는 영상편지 **작업** 폴더(장면 HTML·voice)로 그대로 두고, 원본은 `media/raw` 에서 참조한다.

## 4. 누가 어떻게 쓰나

| 쓰는 곳 | 읽는 것 | 비고 |
|---|---|---|
| 격월 편지 collector | 일지·사진·캡션(현행) · 영상편지 호만 `media/index.md` 기간 절 | `index-media.py --since --until` |
| 주중 릴스 (`/fb-update` 확장 예정) | 최근 7일 세로 사진·캡션 + `media/index.md` 최근 클립 | c 단계 |
| 영상편지 (6·12월호) | 확정 원고 + 표지 세로 사진 + 클립 + 육성 내레이션 | `build-video.py` |
| 특별호 카드 | 가족 사진 1장(신년·추석·성탄) + 주제 말씀 | d 단계 템플릿 |

## 5. 제작 파이프라인 (c 단계 · 2026-11-02 확정)

| | 주중 릴스 | 영상편지 (6월호·12월호) |
|---|---|---|
| 설계 | `/fb-update` 가 게시안과 함께 `reel`(표지 + 장면 3~4 + 마무리) 설계 | assembler 확정 원고 → `issues/<월>/video/narration.md`(장면 10개 대본) |
| 장면 | `letter-templates/tools/reel-template.html` (cover·photo·clip·end) | `issues/<월>/video/shorts.html` (직전 영상편지 복제) |
| 빌드 | `npx tsx scripts/make-reel.ts` → `media/out/reel-<주>.mp4` | `python3 letter-templates/tools/build-video.py shorts.html MFH-XXXX-shorts.mp4 --voice video/voice --music <곡>` |
| 음성 | 없음(자막형) | **우진 육성** 장면별 녹음 → 보정 → `video/voice/scene-NN.m4a` |
| 음악 | **넣지 않음** — 게시 시 FB/IG 앱 음원 라이브러리에서 선택 | Pixabay·YouTube 오디오 라이브러리 무료곡 2~3곡 고정(받기 전 Content ID 표시 재확인) |
| 클립 | `data-clip` 장면 — 영상 위 자막 오버레이, 현장음 `data-clip-audio` | 같은 방식. 클립 없는 사역은 사진 켄번즈 |
| 게시 | 폰으로 mp4 전송 → FB/IG 앱(릴스) · YouTube Shorts 선택 | YouTube 업로드 → 앱 `portfolio_videos` 등록 · 편지 공유본에 링크 |

**이 세션에서 확인한 도구 한계**: Canva AI 영상 생성은 유료 플랜 필요(현재 불가) · Figma Weave 미연결. 생성 B-roll 은 2027 재검토. 현행 스크립트 경로가 재현성·브랜드 일관성·비용에서 우선.

### 육성 내레이션 녹음·보정 (영상편지)

1. 대본 `narration.md` 를 우진이 확정(한 장면 = 한 호흡, 15자 내외 × 2문장).
2. iPhone 음성 메모: 커튼·이불 있는 조용한 방, 폰은 입에서 한 뼘, 살짝 옆. 장면마다 새 메모, 앞뒤 1초 여유. 틀리면 그 장면만 다시.
3. 보정(무료): **Adobe Podcast Enhance**(podcast.adobe.com/enhance, 브라우저) 에 m4a 를 올려 잡음·울림 제거 → 받은 파일을 `scene-01.m4a` … 로 이름 바꿔 `issues/<월>/video/voice/` 에 넣는다. 보정이 과하면(목소리가 인공적이면) 강도를 낮추거나 원본 사용.
4. "녹음 완료" 라고 알려주면 Claude 가 빌드 → 음성 길이에 맞춰 장면이 자동으로 늘어난다 → 실기기 확인 → YouTube 업로드.
- 유료 TTS(ElevenLabs 등)·음성 복제는 쓰지 않는다 — 후원자에게는 선교사 본인 목소리가 신뢰.
