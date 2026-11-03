// MFH-REMOTION-SCENES-V1 · 표지·사진·클립·마무리 장면 + 어절 단위 자막. 안전영역: 위 200px · 아래 360px.
import React from 'react'
import { AbsoluteFill, Img, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { loadFont as loadMyeongjo } from '@remotion/google-fonts/NanumMyeongjo'
import { loadFont as loadMontserrat } from '@remotion/google-fonts/Montserrat'
import { loadFont as loadNoto } from '@remotion/google-fonts/NotoSansKR'
import { colors, frames, type Motion } from './types'

// 한글 폰트는 유니코드 범위별 번호 서브셋이라 subsets 를 지정하지 않는다(전체 로드).
const myeongjo = loadMyeongjo('normal', { weights: ['800'] }).fontFamily
const montserrat = loadMontserrat('normal', { weights: ['600', '700'], subsets: ['latin'] }).fontFamily
const body = loadNoto('normal', { weights: ['500', '600', '700'] }).fontFamily

const ZOOM = 0.07
const CAP_DELAY = frames(0.35)
const WORD_STAGGER = 2 // 어절 간격(프레임) ≈ 0.07초

// ── 사진 켄번즈 ───────────────────────────────────────────────
const KenBurns: React.FC<{ src: string; motion: Motion; dur: number; grade?: boolean }> = ({ src, motion, dur, grade = true }) => {
  const f = useCurrentFrame()
  const p = interpolate(f, [0, frames(dur)], [0, 1], { extrapolateRight: 'clamp' })
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
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform,
        filter: grade ? 'contrast(1.05) saturate(1.1) brightness(1.01)' : undefined }}
    />
  )
}

const Shade: React.FC = () => (
  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 900,
    background: `linear-gradient(to top, rgba(45,42,38,.75), rgba(45,42,38,0))` }} />
)
const Bar: React.FC = () => <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 14, background: colors.red }} />

// ── 자막: 박스가 먼저 떠오르고 어절이 차례로 켜진다. *어절* 은 강조색 ─────────
const Caption: React.FC<{ label?: string; text: string; bottom?: number }> = ({ label, text, bottom = 400 }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const rise = spring({ frame: f - CAP_DELAY, fps, config: { damping: 200, stiffness: 120 } })
  const words = text.split(/\s+/).filter(Boolean)
  return (
    <div style={{ position: 'absolute', left: 64, right: 64, bottom, opacity: rise, transform: `translateY(${(1 - rise) * 48}px)` }}>
      {label ? (
        <div style={{ fontFamily: montserrat, fontWeight: 700, fontSize: 26, letterSpacing: '.2em', color: colors.blush,
          textTransform: 'uppercase', marginBottom: 18 }}>{label}</div>
      ) : null}
      <div style={{ fontFamily: body, fontWeight: 600, fontSize: 56, lineHeight: 1.5, color: '#fff', wordBreak: 'keep-all' }}>
        {words.map((w, i) => {
          const em = /^\*.+\*$/.test(w)
          const t = em ? w.slice(1, -1) : w
          const a = spring({ frame: f - CAP_DELAY - 4 - i * WORD_STAGGER, fps, config: { damping: 200, stiffness: 160 } })
          return (
            <span key={i} style={{ display: 'inline-block', background: 'rgba(45,42,38,.82)', padding: '0 14px',
              marginRight: -0.5, opacity: a, transform: `translateY(${(1 - a) * 18}px)`, color: em ? colors.blush : '#fff' }}>
              {t}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ── 장면 ───────────────────────────────────────────────────────
export const Cover: React.FC<{ photo: string; date_label: string; label: string; title: string; dur: number }> = (p) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const a = spring({ frame: f - 6, fps, config: { damping: 200 } })
  return (
    <AbsoluteFill>
      <KenBurns src={p.photo} motion="in" dur={p.dur} />
      <Shade />
      <div style={{ position: 'absolute', top: 230, left: 64, fontFamily: montserrat, fontWeight: 700, fontSize: 26,
        letterSpacing: '.16em', color: '#fff', background: colors.maroon, padding: '12px 22px' }}>MFH · {p.date_label}</div>
      <div style={{ position: 'absolute', left: 64, right: 64, bottom: 440, opacity: a, transform: `translateY(${(1 - a) * 40}px)` }}>
        <div style={{ fontFamily: montserrat, fontWeight: 700, fontSize: 26, letterSpacing: '.2em', color: colors.blush,
          textTransform: 'uppercase', marginBottom: 18 }}>{p.label}</div>
        <div style={{ fontFamily: myeongjo, fontWeight: 800, fontSize: 84, lineHeight: 1.25, color: '#fff', wordBreak: 'keep-all' }}>
          {p.title.split(/<br\s*\/?>/i).map((line, i) => <div key={i}>{line}</div>)}
        </div>
        <div style={{ marginTop: 24, fontFamily: body, fontSize: 34, color: '#D9D4CE' }}>온두라스 · 김우진 · 서진아 선교사</div>
      </div>
      <Bar />
    </AbsoluteFill>
  )
}

export const Photo: React.FC<{ photo: string; label?: string; caption: string; motion: Motion; dur: number }> = (p) => (
  <AbsoluteFill>
    <KenBurns src={p.photo} motion={p.motion} dur={p.dur} />
    <Shade />
    <Caption label={p.label} text={p.caption} />
    <Bar />
  </AbsoluteFill>
)

export const Clip: React.FC<{ clip: string; start?: number; label?: string; caption: string; dur: number }> = (p) => (
  <AbsoluteFill>
    <OffthreadVideo
      src={staticFile(p.clip)}
      startFrom={frames(p.start ?? 0)}
      muted
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
    />
    <Shade />
    <Caption label={p.label} text={p.caption} />
    <Bar />
  </AbsoluteFill>
)

export const End: React.FC<{ end_line: string; logo: string; dur: number }> = (p) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const a = spring({ frame: f - 4, fps, config: { damping: 200 } })
  return (
    <AbsoluteFill style={{ background: colors.maroon }}>
      <div style={{ position: 'absolute', left: 64, right: 64, top: 560, textAlign: 'center', opacity: a,
        transform: `translateY(${(1 - a) * 30}px)` }}>
        <Img src={staticFile(p.logo)} style={{ width: 220, margin: '0 auto 60px', display: 'block' }} />
        <div style={{ fontFamily: myeongjo, fontWeight: 800, fontSize: 72, lineHeight: 1.3, color: '#fff' }}>기도로<br />함께해 주세요</div>
        <div style={{ marginTop: 36, fontFamily: body, fontSize: 36, lineHeight: 1.7, color: '#EBD9D9' }}>{p.end_line}</div>
        <div style={{ marginTop: 70, fontFamily: montserrat, fontWeight: 600, fontSize: 34, color: '#fff' }}>mfh-snowy.vercel.app/p/mfh</div>
      </div>
      <Bar />
    </AbsoluteFill>
  )
}
