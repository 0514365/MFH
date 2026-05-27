// MFH-USE-WIDE-SCREEN-V1
// 마스터-디테일 2열 분기용. 넓은 화면 = 데스크톱/태블릿/모바일 가로.
// 기준: (min-width:1024px) OR ((orientation:landscape) AND (min-width:640px)).
// SSR 안전: 초기 false → 마운트 후 실제값. 회전·리사이즈 구독.
'use client'

import { useEffect, useState } from 'react'

const QUERY = '(min-width: 1024px), (orientation: landscape) and (min-width: 640px)'

export function useWideScreen(): boolean {
  const [wide, setWide] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia(QUERY)
    const update = () => setWide(mq.matches)
    update()
    // Safari 구버전 호환: addEventListener 우선, 없으면 addListener
    if (mq.addEventListener) {
      mq.addEventListener('change', update)
      return () => mq.removeEventListener('change', update)
    } else {
      mq.addListener(update)
      return () => mq.removeListener(update)
    }
  }, [])

  return wide
}
