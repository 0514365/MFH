// MFH-REMOTION-REEL-V1 · 장면 배열 → TransitionSeries. 전환 순환: 슬라이드업 → 페이드 → 와이프 → 페이드.
import React from 'react'
import { AbsoluteFill } from 'remotion'
import { TransitionSeries, linearTiming, type TransitionPresentation } from '@remotion/transitions'
import { fade } from '@remotion/transitions/fade'
import { slide } from '@remotion/transitions/slide'
import { wipe } from '@remotion/transitions/wipe'
import { Cover, Clip, End, Photo } from './scenes'
import { XFADE_FRAMES, colors, frames, type ReelProps, type Scene, type Motion } from './types'

const MOTIONS: Motion[] = ['in', 'out', 'right', 'left']
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transitions: Array<() => TransitionPresentation<any>> = [
  () => slide({ direction: 'from-bottom' }),
  () => fade(),
  () => wipe({ direction: 'from-left' }),
  () => fade(),
]

const render = (s: Scene, photoIndex: number) => {
  switch (s.kind) {
    case 'cover': return <Cover {...s} />
    case 'photo': return <Photo {...s} motion={s.motion ?? MOTIONS[photoIndex % MOTIONS.length]} />
    case 'clip': return <Clip {...s} />
    case 'end': return <End {...s} />
  }
}

export const Reel: React.FC<ReelProps> = ({ scenes }) => {
  let photoIndex = 0
  const items: React.ReactNode[] = []
  scenes.forEach((s, i) => {
    if (i > 0) {
      items.push(
        <TransitionSeries.Transition
          key={`t${i}`}
          presentation={transitions[(i - 1) % transitions.length]()}
          timing={linearTiming({ durationInFrames: XFADE_FRAMES })}
        />,
      )
    }
    const idx = s.kind === 'photo' ? photoIndex++ : photoIndex
    items.push(
      <TransitionSeries.Sequence key={`s${i}`} durationInFrames={frames(s.dur)}>
        {render(s, idx)}
      </TransitionSeries.Sequence>,
    )
  })
  return (
    <AbsoluteFill style={{ backgroundColor: colors.charcoal }}>
      <TransitionSeries>{items}</TransitionSeries>
    </AbsoluteFill>
  )
}
