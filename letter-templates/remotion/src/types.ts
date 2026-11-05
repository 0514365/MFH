// MFH-REMOTION-TYPES-V2 · make-reel.ts 가 넘기는 장면 JSON 계약. 자산 경로는 --public-dir 기준 상대경로(staticFile).
export const FPS = 30
export const W = 1080
export const H = 1920
export const XFADE_FRAMES = 18 // 0.6초 — build-video.py 의 XFADE 와 같아야 오디오 타임라인이 맞는다

export type Motion = 'in' | 'out' | 'left' | 'right'

// 'letter' = 선교편지 숏츠: 페이드 전환만 · 표지 배지 없음 · 구분 라벨 칩 · 자막 오른쪽 여백 확대 · 마무리 로고 확대
export type Variant = 'letter'

export type Scene =
  | { kind: 'cover'; dur: number; photo: string; date_label: string; label: string; title: string; fit?: 'contain' }
  // position: 꽉 채운 사진의 크롭 위치(CSS object-position)
  | { kind: 'photo'; dur: number; photo: string; label?: string; caption: string; motion?: Motion; fit?: 'contain'; position?: string }
  // audio / audio_src / audio_start: 현장음 볼륨·원본 파일·시작점 — build-video.py --mux 가 읽는다(Remotion 은 무시)
  | { kind: 'clip'; dur: number; clip: string; start?: number; audio?: number; audio_src?: string; audio_start?: number; label?: string; caption: string }
  | { kind: 'end'; dur: number; end_line: string; logo: string; title?: string; hide_url?: boolean }

export type ReelProps = { scenes: Scene[]; variant?: Variant }

export const frames = (sec: number) => Math.round(sec * FPS)

export const totalFrames = (scenes: Scene[]) =>
  scenes.reduce((n, s) => n + frames(s.dur), 0) - XFADE_FRAMES * Math.max(scenes.length - 1, 0)

export const colors = {
  maroon: '#6A2323', red: '#D34D4D', sand: '#F7F5F0', charcoal: '#2D2A26', blush: '#F2B8B8',
}
