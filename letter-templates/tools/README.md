# letter-templates/tools — 선교편지 빌드·검토 도구

2026-06 리허설에서 확립한 디자인 R&D·출력 자동화를 정리한 것. 다음 호부터 이 흐름으로 진행한다.

## build-letter.py
9장 통합 letter HTML 하나를 받아 검토·출력물을 자동 생성한다.

```bash
python3 tools/build-letter.py letter-templates/issues/2026-06/letter.html --all
```

| 옵션 | 출력 | 용도 |
|------|------|------|
| `--grid` | `<name>-grid.png` | 9장 한눈 그리드 (넘침·톤 점검 — Claude가 Read로 확인) |
| `--embed` | `<name>-embed.html` | 사진을 base64로 박은 self-contained (우진이 브라우저로 검토) |
| `--pdf` | `<name>.pdf` | 인쇄·발송용 풀사이즈 9장 |
| `--all` | 위 전부 | |

- **macOS + Chrome 필요**(headless 렌더). poppler/ImageMagick 불필요.
- **채팅 미리보기가 안 보일 때**: `*-embed.html`을 Finder에서 더블클릭 → 브라우저. 사진이 파일에 박혀 있어 어디서든 보인다. (이 데스크탑 앱이 이미지를 파일카드로만 주는 문제의 표준 우회책.)
- 색안 R&D(색만 바꿔 N벌 비교)·콜라주 데모는 `issues/<월>/variants/`의 `gen.py`·`collage-demo.html` 참고.

## 디자인 마스터 — mfh-cardnews.html (V4, 에디토리얼)
매월 복제 후 콘텐츠·사진·페이지수만 교체한다. 핵심 규칙(자세한 건 `docs/MFH-LETTER-WORKFLOW.md`):

- **표지**: 사진 hero 풀(약 70%) + 제목 오버레이.
- **사역 사진 내지**: 사진 **풀블리드로 온전 + 제목은 사진 밖**(사진 위에 텍스트로 가리지 않는다 — 사역 사진은 '증거').
- **사진 없는 섹션**: 참고사진 / 본문 중심 — 주제별로 ④에서 우진과 결정. 참고사진은 우진 제공 우선(Claude는 컨셉 제안), 못 줄 때 스톡(CC0).
- **사진 여러 장**: 분리 / 콜라주(모자이크: 큰1+작은N·2×2·상1하3) / 대표1장 — 주제에 맞게.
- **색·타이포**: 차콜 + 레드(골드 없음), 슬림 미드그레이 헤더(#45454F), 명조 제목, 레드 액센트.
- **기도제목**: [온두라스]→[사역]→[가정] 순, 정치 중립, 사역 1~2개 압축, 가정 평강.

## archive/
이전 디자인 백업. `mfh-cardnews-v3-pastel.html`(구 파스텔 마스터), `letter-2606-pastel.html`(구 6월본).
