// MFH-REMOTION-REEL-V2 · 장면 배열 → TransitionSeries. 전환 순환: 슬라이드업 → 페이드 → 와이프 → 페이드. variant letter 는 페이드만.
import React from 'react'
import { AbsoluteFill } from 'remotion'
import { TransitionSeries, linearTiming, type TransitionPresentation } from '@remotion/transitions'
import { fade } from '@remotion/transitions/fade'
import { slide } from '@remotion/transitions/slide'
import { wipe } from '@remotion/transitions/wipe'
import { Cover, Clip, End, Photo } from './scenes'
import { XFADE_FRAMES, colors, frames, type ReelProps, type Scene, type Motion, type Variant } from './types'

const MOTIONS: Motion[] = ['in', 'out', 'right', 'left']
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transitions: Array<() => TransitionPresentation<any>> = [
  () => slide({ direction: 'from-bottom' }),
  () => fade(),
  () => wipe({ direction: 'from-left' }),
  () => fade(),
]

const render = (s: Scene, photoIndex: number, variant?: Variant) => {
  switch (s.kind) {
    case 'cover': return <Cover {...s} variant={variant} />
    case 'photo': return <Photo {...s} motion={s.motion ?? MOTIONS[photoIndex % MOTIONS.length]} variant={variant} />
    case 'clip': return <Clip {...s} variant={variant} />
    case 'end': return <End {...s} variant={variant} />
  }
}

export const Reel: React.FC<ReelProps> = ({ scenes, variant }) => {
  let photoIndex = 0
  const items: React.ReactNode[] = []
  scenes.forEach((s, i) => {
    if (i > 0) {
      items.push(
        <TransitionSeries.Transition
          key={`t${i}`}
          presentation={variant === 'letter' ? fade() : transitions[(i - 1) % transitions.length]()}
          timing={linearTiming({ durationInFrames: XFADE_FRAMES })}
        />,
      )
    }
    const idx = s.kind === 'photo' ? photoIndex++ : photoIndex
    items.push(
      <TransitionSeries.Sequence key={`s${i}`} durationInFrames={frames(s.dur)}>
        {render(s, idx, variant)}
      </TransitionSeries.Sequence>,
    )
  })
  return (
    <AbsoluteFill style={{ backgroundColor: colors.charcoal }}>
      <TransitionSeries>{items}</TransitionSeries>
    </AbsoluteFill>
  )
}
