// MFH-REMOTION-ROOT-V1
import React from 'react'
import { Composition } from 'remotion'
import { Reel } from './Reel'
import { FPS, H, W, totalFrames, type ReelProps } from './types'

const sample: ReelProps = {
  scenes: [
    { kind: 'cover', dur: 4, photo: 'photos/cover.jpg', date_label: '2026.11', label: 'Zapotal 주일학교', title: '참목자이신<br>예수님' },
    { kind: 'photo', dur: 5, photo: 'photos/cover.jpg', caption: '먼저 다 같이 *찬양부터!*' },
    { kind: 'end', dur: 4, end_line: '10월 31일 · Zapotal 교회 주일학교', logo: 'logo-white.png' },
  ],
}

export const Root: React.FC = () => (
  <Composition
    id="Reel"
    component={Reel}
    width={W}
    height={H}
    fps={FPS}
    durationInFrames={totalFrames(sample.scenes)}
    defaultProps={sample}
    calculateMetadata={({ props }) => ({ durationInFrames: totalFrames(props.scenes) })}
  />
)
