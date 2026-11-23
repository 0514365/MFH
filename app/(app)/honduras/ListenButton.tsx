// MFH-HONDURAS-LISTEN-BUTTON-V1
// 온두라스 동향 "듣기" 버튼 — 기기 내장 음성(Web Speech API)으로 낭독 대본을 읽는다.
//   · 문장 단위로 끊어 순서대로 읽는다(iOS 는 긴 문장 하나를 통째로 넣으면 중간에 끊긴다).
//   · 재생 ↔ 정지 토글만 제공(일시정지·이어듣기는 iOS 에서 불안정해 넣지 않는다).
//   · 음성 합성을 지원하지 않는 브라우저에서는 버튼을 숨긴다.
'use client'

import { useEffect, useRef, useState } from 'react'

// 낭독 단위로 자른다 — 줄바꿈과 문장 끝(. ! ? 뒤 공백) 기준. 소수점(27.03)에서는 끊지 않는다.
function splitSentences(text: string): string[] {
  return text
    .split(/\n+/)
    .flatMap((line) => line.match(/.+?(?:[.!?。]+(?=\s|$)|$)/g) ?? [])
    .map((s) => s.trim())
    .filter(Boolean)
}

export default function ListenButton({ text }: { text: string }) {
  const [supported, setSupported] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  // 정지·재시작 뒤 늦게 도착한 이전 재생의 이벤트를 무시하기 위한 세대 번호.
  const runRef = useRef(0)

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window)
    // 화면을 떠나면 낭독을 멈춘다.
    return () => {
      runRef.current += 1
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    }
  }, [])

  if (!supported || !text.trim()) return null

  const stop = () => {
    runRef.current += 1
    window.speechSynthesis.cancel()
    setPlaying(false)
  }

  const play = () => {
    const synth = window.speechSynthesis
    synth.cancel()
    const run = (runRef.current += 1)
    const parts = splitSentences(text)
    if (!parts.length) return
    // 한국어 음성이 설치돼 있으면 지정(없으면 lang 만으로 기기 기본 한국어 음성).
    const voice = synth.getVoices().find((v) => v.lang.replace('_', '-').toLowerCase().startsWith('ko'))
    setProgress({ done: 0, total: parts.length })
    setPlaying(true)
    parts.forEach((part, i) => {
      const u = new SpeechSynthesisUtterance(part)
      u.lang = 'ko-KR'
      if (voice) u.voice = voice
      u.onend = () => {
        if (runRef.current !== run) return
        setProgress({ done: i + 1, total: parts.length })
        if (i === parts.length - 1) setPlaying(false)
      }
      u.onerror = () => {
        if (runRef.current !== run) return
        synth.cancel()
        setPlaying(false)
      }
      synth.speak(u)
    })
  }

  return (
    <button
      type="button"
      onClick={playing ? stop : play}
      aria-pressed={playing}
      className="inline-flex items-center gap-2 rounded-full bg-b27-tint-8 px-3.5 py-1.5 text-sm font-semibold transition active:scale-[0.98]"
      style={{ color: 'var(--b27-deep-8)' }}
    >
      {playing ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <rect x="5" y="5" width="14" height="14" rx="2" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" />
        </svg>
      )}
      {playing ? '정지' : '듣기'}
      {playing && progress.total > 0 && (
        <span className="font-num text-xs font-medium text-b27-muted">
          {progress.done}/{progress.total}
        </span>
      )}
    </button>
  )
}
