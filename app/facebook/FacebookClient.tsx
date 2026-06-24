'use client'
// MFH-FB-CLIENT-V1
// 주간 게시 추천 카드 — 문구 + 추천 사진 썸네일 + 해시태그 + 복사 버튼.
// 복사 = 문구 + 해시태그(추천이유 rationale 은 우진 참고용이라 복사·표시만, 게시문 미포함).
import { useState } from 'react'

// 주차 라벨: "2026-06-16","2026-06-22" → "6월 16일 ~ 22일"(같은 달) / "6월 30일 ~ 7월 6일"(다른 달).
function fmtWeek(s: string | null, e: string | null): string {
  if (!s || !e) return ''
  const [, sm, sd] = s.split('-')
  const [, em, ed] = e.split('-')
  if (sm === em) return `${Number(sm)}월 ${Number(sd)}일 ~ ${Number(ed)}일`
  return `${Number(sm)}월 ${Number(sd)}일 ~ ${Number(em)}월 ${Number(ed)}일`
}

export type FbPhotoView = { path: string; caption: string | null; url: string | null }
export type FbPostView = {
  text: string
  hashtags: string[]
  rationale: string | null
  photos: FbPhotoView[]
}

type Props = {
  weekStart: string | null
  weekEnd: string | null
  generatedAt: string | null
  posts: FbPostView[]
}

export default function FacebookClient({ weekStart, weekEnd, generatedAt, posts }: Props) {
  if (!posts.length) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-6 text-center">
        <p className="text-sm font-semibold text-ink">아직 이번 주 게시 추천이 없습니다</p>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Cowork(아이폰 원격) 또는 터미널에서 <code className="rounded bg-paper px-1 py-0.5 font-mono text-[11px]">/fb-update</code> 를 실행하면
          <br />
          이번 주 일지·사진을 분석해 게시안을 만들어 줍니다.
        </p>
      </div>
    )
  }

  return (
    <div>
      <header className="mb-5">
        <p className="text-[11px] font-semibold tracking-wide text-muted">이번 주 게시 추천</p>
        <div className="mt-1.5 text-[22px] font-semibold tracking-tight text-ink">
          {fmtWeek(weekStart, weekEnd)}
        </div>
        <p className="mt-1 text-[12px] text-muted">
          게시안 {posts.length}개
          {generatedAt ? ` · 생성 ${generatedAt.slice(0, 10)} · 게시는 직접 올려 주세요` : ''}
        </p>
      </header>

      <div className="space-y-4">
        {posts.map((p, i) => (
          <PostCard key={i} post={p} index={i} />
        ))}
      </div>
    </div>
  )
}

function PostCard({ post, index }: { post: FbPostView; index: number }) {
  const [copied, setCopied] = useState(false)
  const copyText = [post.text, post.hashtags.join(' ')].filter(Boolean).join('\n\n').trim()

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(copyText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // 클립보드 미지원/거부 — 조용히 무시(사용자가 길게 눌러 직접 복사 가능).
    }
  }

  const shown = post.photos.filter((ph) => ph.url)

  return (
    <article className="rounded-2xl border border-line bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-wide text-muted">게시안 {index + 1}</span>
        <button
          onClick={copy}
          className="rounded-full bg-accent-soft px-3.5 py-1 text-xs font-medium text-accent transition hover:opacity-80"
        >
          {copied ? '복사됨 ✓' : '문구 복사'}
        </button>
      </div>

      <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{post.text}</p>

      {shown.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {shown.map((ph, j) => (
            <figure key={j} className="overflow-hidden rounded-2xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ph.url!} alt={ph.caption ?? '추천 사진'} className="aspect-square w-full object-cover" />
              {ph.caption && (
                <figcaption className="px-1.5 py-1 text-[10px] leading-tight text-faint line-clamp-2">
                  {ph.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      )}

      {post.hashtags.length > 0 && (
        <p className="mt-3 text-xs font-medium text-accent">{post.hashtags.join(' ')}</p>
      )}

      {post.rationale && (
        <p className="mt-3 rounded-xl bg-surface-subtle px-3 py-2 text-[11px] leading-relaxed text-muted">
          <span className="font-semibold">추천 이유</span> · {post.rationale}
        </p>
      )}
    </article>
  )
}
