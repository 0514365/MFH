// MFH-PRAYER-CTA-V1
// 공개페이지 하단 고정 바 — "중보기도" 진입(방문자용). 기존 하단 네비 대체.
import Link from 'next/link'

export default function PrayerCta({ slug }: { slug: string }) {
  return (
    <>
      {/* fixed 바가 가리지 않도록 같은 높이 스페이서 */}
      <div className="h-20" style={{ height: 'calc(80px + env(safe-area-inset-bottom))' }} aria-hidden="true" />
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface px-5 pt-2.5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)' }}
      >
        <Link
          href={`/p/${slug}/prayer`}
          className="mx-auto flex max-w-md items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21s-7-4.35-9.5-8.5C.5 9 2 5.5 5.5 5.5c2 0 3.5 1.5 4.5 3 1-1.5 2.5-3 4.5-3C18 5.5 19.5 9 21.5 12.5 19 16.65 12 21 12 21z" />
          </svg>
          중보기도 · 기도·응원 남기기
        </Link>
      </div>
    </>
  )
}
