'use client'
// MFH-SUPPORTERS-BACK-V1
// 후원자 헤더 뒤로가기 — 경로 맥락에 맞는 목적지. 수정→상세, 상세→명단, 주요 탭→홈.
import { usePathname } from 'next/navigation'
import BackButton from '@/components/BackButton'

const TABS = ['/supporters', '/supporters/list', '/supporters/new', '/supporters/insights']

function resolveBack(pathname: string): { href: string; label: string } {
  if (pathname.endsWith('/edit')) {
    return { href: pathname.slice(0, -'/edit'.length), label: '상세' }
  }
  if (TABS.includes(pathname)) return { href: '/', label: '뒤로' }
  if (pathname.startsWith('/supporters/')) return { href: '/supporters/list', label: '명단' }
  return { href: '/', label: '뒤로' }
}

export default function SupportersBack() {
  const pathname = usePathname() ?? '/supporters'
  const { href, label } = resolveBack(pathname)
  return <BackButton href={href} label={label} variant="icon-accent" />
}
