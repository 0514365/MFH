// MFH-QT-PASSAGE-V1
// 성서유니온 매일성경 본문(개역개정) 실시간 프록시. ⚠ 저장하지 않는다(저작권 — 표시 전용, 접이식 펼칠 때만 호출).
// GET /api/qt/passage?date=YYYY-MM-DD → { date, verses: [{ chapter, verse, text }] }
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SUM_BODY_BIBLE = 'https://sum.su.or.kr:8888/Ajax/Bible/BodyBible'
const QT_TY = 'QT1' // 매일성경
const KRV_VER_CD = 1001 // 개역개정

type RawVerse = { Chapter?: number; Verse?: number; Bible_Cn?: string; Ver_Cd?: number }

export async function GET(req: Request) {
  const date = new URL(req.url).searchParams.get('date') ?? ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 })
  }
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 15000)
    let arr: RawVerse[]
    try {
      const res = await fetch(SUM_BODY_BIBLE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify({ qt_ty: QT_TY, Base_de: date }),
        cache: 'no-store',
        signal: ctrl.signal,
      })
      if (!res.ok) return NextResponse.json({ error: `upstream ${res.status}` }, { status: 502 })
      arr = (await res.json()) as RawVerse[]
    } finally {
      clearTimeout(timer)
    }
    const verses = (Array.isArray(arr) ? arr : [])
      .filter((v) => !v.Ver_Cd || v.Ver_Cd === KRV_VER_CD)
      .map((v) => ({ chapter: v.Chapter ?? null, verse: v.Verse ?? null, text: (v.Bible_Cn ?? '').trim() }))
      .filter((v) => v.text)
    return NextResponse.json({ date, verses })
  } catch {
    return NextResponse.json({ error: 'fetch failed' }, { status: 502 })
  }
}
