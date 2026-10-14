'use client'
// MFH-SUPPORTERS-TITLE-V1
// 후원자 헤더 타이틀 — 현재 경로에 따라 섹션명 표시(중앙 정렬). layout 헤더에서 절대 중앙 배치.
import { usePathname } from 'next/navigation'

const TITLES: Record<string, string> = {
  '/supporters': '후원자관리',
  '/supporters/list': '명단',
  '/supporters/new': '등록',
  '/supporters/insights': '분석',
}

// 상세(/supporters/<id>)·수정(/supporters/<id>/edit)은 동적 경로 → 패턴 판정.
function resolveTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname]
  if (pathname.endsWith('/edit')) return '수정'
  if (pathname.startsWith('/supporters/')) return '후원자'
  return '후원자관리'
}

export default function SupportersTitle() {
  const pathname = usePathname() ?? '/supporters'
  return (
    <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[18px] font-bold tracking-tight text-ink">
      {resolveTitle(pathname)}
    </h1>
  )
}
