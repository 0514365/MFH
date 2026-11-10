// MFH-REMOTION-SCENES-V2 · 표지·사진·클립·마무리 장면 + 어절 단위 자막. 안전영역: 위 200px · 아래 360px.
import React from 'react'
import { AbsoluteFill, Img, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { getInfo as infoMyeongjo, loadFont as loadMyeongjo } from '@remotion/google-fonts/NanumMyeongjo'
import { loadFont as loadMontserrat } from '@remotion/google-fonts/Montserrat'
import { getInfo as infoNoto, loadFont as loadNoto } from '@remotion/google-fonts/NotoSansKR'
import { subsetsForText } from './fonts'
import { colors, frames, type Motion, type Variant } from './types'

// 한글 폰트는 유니코드 범위별 번호 서브셋이다 — 이번 렌더에 쓰인 글자의 구간만 받는다(fonts.ts).
const myeongjo = loadMyeongjo('normal', { weights: ['800'], subsets: subsetsForText(infoMyeongjo().unicodeRanges) }).fontFamily
const montserrat = loadMontserrat('normal', { weights: ['600', '700'], subsets: ['latin'] }).fontFamily
const body = loadNoto('normal', { weights: ['600'], subsets: subsetsForText(infoNoto().unicodeRanges) }).fontFamily

const ZOOM = 0.07
const CAP_DELAY = frames(0.35)
const WORD_STAGGER = 2 // 어절 간격(프레임) ≈ 0.07초

// ── 사진 켄번즈 ───────────────────────────────────────────────
const KenBurns: React.FC<{ src: string; motion: Motion; dur: number; grade?: boolean; position?: string; zoom?: number; focus?: string }> = ({ src, motion, dur, grade = true, position, zoom, focus }) => {
  const f = useCurrentFrame()
  const p = interpolate(f, [0, frames(dur)], [0, 1], { extrapolateRight: 'clamp' })
  // zoom 지정 + 좌우 motion = 넓은 훑기: 크롭 위치(object-position)까지 함께 움직여 사진 왼쪽 끝↔오른쪽 끝을 다 보여 준다(양옆 인물 얼굴용)
  if (zoom && (motion === 'left' || motion === 'right')) {
    const e = p * p * (3 - 2 * p)
    const t = motion === 'right' ? e : 1 - e // right = 왼쪽→오른쪽
    const shift = ((zoom - 1) / (2 * zoom)) * 100
    const y = (focus ?? '50% 40%').trim().split(/\s+/)[1] ?? '40%'
    return (
      <Img
        src={staticFile(src)}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${t * 100}% ${y}`,
          transform: `scale(${zoom}) translateX(${shift - shift * 2 * t}%)`, transformOrigin: `50% ${y}`,
          filter: grade ? 'contrast(1.05) saturate(1.1) brightness(1.01)' : undefined }}
      />
    )
  }
  const z = 1 + ZOOM
  let transform: string
  if (motion === 'in') transform = `scale(${1 + ZOOM * p})`
  else if (motion === 'out') transform = `scale(${z - ZOOM * p})`
  else {
    const shift = (ZOOM / z) * 100 * 0.5 // 확대분의 절반을 좌우로 이동(%)
    const x = motion === 'right' ? -shift + shift * 2 * (1 - p) : -shift + shift * 2 * p
    transform = `scale(${z}) translateX(${x}%)`
  }
  return (
    <Img
      src={staticFile(src)}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: position, transform,
        filter: grade ? 'contrast(1.05) saturate(1.1) brightness(1.01)' : undefined }}
    />
  )
}

// 가로 사진을 자르지 않고 싣는다: 흐린 배경 + 원본 비율 사진(위 안전영역·아래 자막 사이)
const ContainPhoto: React.FC<{ src: string; motion: Motion; dur: number }> = ({ src, motion, dur }) => {
  const f = useCurrentFrame()
  const p = interpolate(f, [0, frames(dur)], [0, 1], { extrapolateRight: 'clamp' })
  const scale = motion === 'out' ? 1.05 - 0.05 * p : 1 + 0.05 * p
  return (
    <>
      <Img src={staticFile(src)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
        filter: 'blur(36px) brightness(.5)', transform: 'scale(1.12)' }} />
      <Img src={staticFile(src)} style={{ position: 'absolute', left: 0, top: 300, width: 1080, height: 810, objectFit: 'cover',
        transform: `scale(${scale})`, filter: 'contrast(1.05) saturate(1.1) brightness(1.01)' }} />
    </>
  )
}

const Shade: React.FC = () => (
  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 900,
    background: `linear-gradient(to top, rgba(45,42,38,.75), rgba(45,42,38,0))` }} />
)
const Bar: React.FC = () => <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 14, background: colors.red }} />

// ── 자막: 박스가 먼저 떠오르고 어절이 차례로 켜진다. *어절* 은 강조색 ─────────
// 자막의 줄바꿈(\n)은 그대로 줄을 나눈다. variant 'letter' 는 라벨이 칩이고 오른쪽 버튼 영역을 비운다.
const Caption: React.FC<{ label?: string; text: string; bottom?: number; variant?: Variant }> = ({ label, text, bottom = 400, variant }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const rise = spring({ frame: f - CAP_DELAY, fps, config: { damping: 200, stiffness: 120 } })
  const lines = text.split('\n').map((l) => l.split(/\s+/).filter(Boolean))
  const letter = variant === 'letter'
  let wordIndex = 0
  return (
    <div style={{ position: 'absolute', left: 64, right: letter ? 140 : 64, bottom, opacity: rise, transform: `translateY(${(1 - rise) * 48}px)` }}>
      {label && letter ? (
        <div style={{ display: 'inline-block', fontFamily: `${montserrat}, ${body}`, fontWeight: 700, fontSize: 36, color: '#fff',
          background: colors.maroon, padding: '8px 22px', marginBottom: 20 }}>{label}</div>
      ) : label ? (
        <div style={{ fontFamily: montserrat, fontWeight: 700, fontSize: 26, letterSpacing: '.2em', color: colors.blush,
          textTransform: 'uppercase', marginBottom: 18 }}>{label}</div>
      ) : null}
      <div style={{ fontFamily: body, fontWeight: 600, fontSize: 56, lineHeight: 1.5, color: '#fff', wordBreak: 'keep-all' }}>
        {lines.map((words, li) => (
          <div key={li}>
            {words.map((w, wi) => {
              const em = /^\*.+\*$/.test(w)
              const t = em ? w.slice(1, -1) : w
              const a = spring({ frame: f - CAP_DELAY - 4 - wordIndex++ * WORD_STAGGER, fps, config: { damping: 200, stiffness: 160 } })
              return (
                <span key={wi} style={{ display: 'inline-block', background: 'rgba(45,42,38,.82)', padding: '0 14px',
                  marginRight: -0.5, opacity: a, transform: `translateY(${(1 - a) * 18}px)`, color: em ? colors.blush : '#fff' }}>
                  {t}
                </span>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 장면 ───────────────────────────────────────────────────────
export const Cover: React.FC<{ photo: string; date_label: string; label: string; title: string; dur: number; fit?: 'contain'; variant?: Variant }> = (p) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const a = spring({ frame: f - 6, fps, config: { damping: 200 } })
  return (
    <AbsoluteFill>
      {p.fit === 'contain' ? <ContainPhoto src={p.photo} motion="in" dur={p.dur} /> : <KenBurns src={p.photo} motion="in" dur={p.dur} />}
      <Shade />
      {p.variant === 'letter' ? null : (
        <div style={{ position: 'absolute', top: 200, left: 64, fontFamily: montserrat, fontWeight: 700, fontSize: 26,
          letterSpacing: '.16em', color: '#fff', background: colors.maroon, padding: '12px 22px' }}>MFH · {p.date_label}</div>
      )}
      <div style={{ position: 'absolute', left: 64, right: 64, bottom: 440, opacity: a, transform: `translateY(${(1 - a) * 40}px)` }}>
        {p.variant === 'letter' ? (
          <div style={{ display: 'inline-block', fontFamily: `${montserrat}, ${body}`, fontWeight: 700, fontSize: 36, color: '#fff',
            background: colors.maroon, padding: '8px 22px', marginBottom: 20 }}>{p.label}</div>
        ) : (
          <div style={{ fontFamily: montserrat, fontWeight: 700, fontSize: 26, letterSpacing: '.2em', color: colors.blush,
            textTransform: 'uppercase', marginBottom: 18 }}>{p.label}</div>
        )}
        <div style={{ fontFamily: myeongjo, fontWeight: 800, fontSize: 84, lineHeight: 1.25, color: '#fff', wordBreak: 'keep-all' }}>
          {p.title.split(/<br\s*\/?>/i).map((line, i) => <div key={i}>{line}</div>)}
        </div>
        <div style={{ marginTop: 24, fontFamily: body, fontSize: 34, color: '#D9D4CE' }}>온두라스 · 김우진 · 서진아 선교사</div>
      </div>
      <Bar />
    </AbsoluteFill>
  )
}

export const Photo: React.FC<{ photo: string; label?: string; caption: string; motion: Motion; dur: number; fit?: 'contain'; position?: string; zoom?: number; focus?: string; variant?: Variant }> = (p) => (
  <AbsoluteFill>
    {p.fit === 'contain' ? <ContainPhoto src={p.photo} motion={p.motion} dur={p.dur} /> : <KenBurns src={p.photo} motion={p.motion} dur={p.dur} position={p.position} zoom={p.zoom} focus={p.focus} />}
    <Shade />
    <Caption label={p.label} text={p.caption} variant={p.variant} />
    <Bar />
  </AbsoluteFill>
)

// 클립 줌·좌우 이동: motion 없으면 정지 화면 그대로. focus(transform-origin)로 얼굴 쪽을 확대 중심에 둔다.
export const Clip: React.FC<{ clip: string; start?: number; label?: string; caption: string; dur: number; variant?: Variant; motion?: Motion; zoom?: number; focus?: string }> = (p) => {
  const f = useCurrentFrame()
  const t = interpolate(f, [0, frames(p.dur)], [0, 1], { extrapolateRight: 'clamp' })
  const e = t * t * (3 - 2 * t) // 부드러운 출발·도착
  const z = p.zoom ?? 1.2
  let transform: string | undefined
  let origin = p.focus ?? '50% 40%'
  if (p.motion === 'in') transform = `scale(${1 + (z - 1) * e})`
  else if (p.motion === 'out') transform = `scale(${z - (z - 1) * e})`
  else if (p.motion === 'left' || p.motion === 'right') {
    const shift = ((z - 1) / (2 * z)) * 100 // 확대 상태에서 좌우 끝까지(%)
    const x = p.motion === 'right' ? shift - shift * 2 * e : -shift + shift * 2 * e // right = 화면이 왼쪽→오른쪽을 훑는다
    transform = `scale(${z}) translateX(${x}%)`
    origin = `50% ${origin.trim().split(/\s+/)[1] ?? '40%'}`
  }
  return (
    <AbsoluteFill>
      <OffthreadVideo
        src={staticFile(p.clip)}
        startFrom={frames(p.start ?? 0)}
        muted
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform, transformOrigin: origin }}
      />
      <Shade />
      <Caption label={p.label} text={p.caption} variant={p.variant} />
      <Bar />
    </AbsoluteFill>
  )
}

export const End: React.FC<{ end_line: string; logo: string; dur: number; title?: string; hide_url?: boolean; variant?: Variant }> = (p) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const a = spring({ frame: f - 4, fps, config: { damping: 200 } })
  return (
    <AbsoluteFill style={{ background: colors.maroon }}>
      <div style={{ position: 'absolute', left: 64, right: 64, top: 560, textAlign: 'center', opacity: a,
        transform: `translateY(${(1 - a) * 30}px)` }}>
        <Img src={staticFile(p.logo)} style={{ width: p.variant === 'letter' ? 360 : 220, margin: '0 auto 60px', display: 'block' }} />
        <div style={{ fontFamily: myeongjo, fontWeight: 800, fontSize: 72, lineHeight: 1.3, color: '#fff' }}>{p.title ?? <>기도로<br />함께해 주세요</>}</div>
        <div style={{ marginTop: 36, fontFamily: body, fontSize: p.variant === 'letter' ? 46 : 36, lineHeight: 1.7, color: '#EBD9D9', whiteSpace: 'pre-line' }}>{p.end_line}</div>
        {p.hide_url ? null : <div style={{ marginTop: 70, fontFamily: montserrat, fontWeight: 600, fontSize: 34, color: '#fff' }}>mfh-snowy.vercel.app/p/mfh</div>}
      </div>
      <Bar />
    </AbsoluteFill>
  )
}
