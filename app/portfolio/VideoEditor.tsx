'use client';
// MFH-PORTFOLIO-VIDEO-EDITOR-V3
// 사역 영상 CRUD. 추가 폼(카테고리/년도/제목/영상 URL) + 리스트(미니썸네일 + 썸네일설정 + ↑↓ + 삭제).
// 카테고리 + 영상을 한 섹션으로 묶음(VideoCategoryEditor 포함).
// V2: URL 검증 완화 — YouTube 뿐 아니라 재생목록·Facebook 등 http(s) URL 모두 허용
//     (YouTube 가 아니면 썸네일은 placeholder, 클릭은 원본으로 정상 이동).
// V3: 영상별 커스텀 썸네일 설정(재생목록·FB 등 YouTube 썸네일 없는 영상용, patch66).
//     표시 우선순위 = 커스텀 → YouTube → placeholder.

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import type { PortfolioVideo, PortfolioVideoCategory } from '@/lib/portfolio';
import { videoThumbnail } from '@/lib/portfolio';
import PortfolioPhotoUpload from '@/components/PortfolioPhotoUpload';
import VideoCategoryEditor from './VideoCategoryEditor';

type Props = {
  initialCategories: PortfolioVideoCategory[];
  initialVideos: PortfolioVideo[];
  userId: string;
};

export default function VideoEditor({ initialCategories, initialVideos, userId }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const cats = useMemo(
    () => [...initialCategories].sort((a, b) => a.sort_order - b.sort_order),
    [initialCategories],
  );
  const [videos, setVideos] = useState<PortfolioVideo[]>(
    [...initialVideos].sort((a, b) => a.sort_order - b.sort_order),
  );

  // 추가 폼 상태
  const [fCat, setFCat] = useState<string>('');
  const [fYear, setFYear] = useState<string>('');
  const [fTitle, setFTitle] = useState<string>('');
  const [fUrl, setFUrl] = useState<string>('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thumbEditId, setThumbEditId] = useState<string | null>(null);

  function catName(id: string | null): string {
    if (!id) return '기타';
    return cats.find((c) => c.id === id)?.name ?? '기타';
  }

  async function addVideo() {
    const title = fTitle.trim();
    const url = fUrl.trim();
    if (!title) {
      setError('제목을 입력하세요.');
      return;
    }
    if (!url) {
      setError('영상 URL 을 입력하세요.');
      return;
    }
    if (!/^https?:\/\/.+/i.test(url)) {
      setError('유효한 URL 을 입력하세요. (http:// 또는 https:// 로 시작)');
      return;
    }
    setBusy(true);
    setError(null);
    const maxOrder = videos.reduce((m, v) => Math.max(m, v.sort_order), 0);
    const yearNum = fYear.trim() ? parseInt(fYear.trim(), 10) : null;
    const { data, error: insError } = await supabase
      .from('portfolio_videos')
      .insert({
        user_id: userId,
        category_id: fCat || null,
        title,
        youtube_url: url,
        year: Number.isFinite(yearNum as number) ? yearNum : null,
        sort_order: maxOrder + 10,
      })
      .select()
      .single();
    setBusy(false);
    if (insError) {
      setError(insError.message);
      return;
    }
    if (data) {
      setVideos((prev) => [...prev, data as PortfolioVideo]);
      setFTitle('');
      setFUrl('');
      setFYear('');
      router.refresh();
    }
  }

  async function deleteVideo(v: PortfolioVideo) {
    const ok = confirm(`"${v.title}" 영상을 삭제할까요?`);
    if (!ok) return;
    setBusy(true);
    setError(null);
    const { error: delError } = await supabase
      .from('portfolio_videos')
      .delete()
      .eq('id', v.id);
    setBusy(false);
    if (delError) {
      setError(delError.message);
      return;
    }
    setVideos((prev) => prev.filter((x) => x.id !== v.id));
    router.refresh();
  }

  // 커스텀 썸네일 저장(업로드 URL) / 제거(빈 문자열 → null)
  async function setThumb(v: PortfolioVideo, url: string) {
    const next = url.trim() ? url.trim() : null;
    setError(null);
    const { error: upError } = await supabase
      .from('portfolio_videos')
      .update({ thumbnail_url: next })
      .eq('id', v.id);
    if (upError) {
      setError(upError.message);
      return;
    }
    setVideos((prev) => prev.map((x) => (x.id === v.id ? { ...x, thumbnail_url: next } : x)));
    router.refresh();
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= videos.length) return;
    const a = videos[index];
    const b = videos[target];
    if (!a || !b) return;
    setBusy(true);
    setError(null);
    const { error: e1 } = await supabase
      .from('portfolio_videos')
      .update({ sort_order: b.sort_order })
      .eq('id', a.id);
    const { error: e2 } = await supabase
      .from('portfolio_videos')
      .update({ sort_order: a.sort_order })
      .eq('id', b.id);
    setBusy(false);
    if (e1 || e2) {
      setError((e1 ?? e2)!.message);
      return;
    }
    setVideos((prev) => {
      const next = prev.map((v) => {
        if (v.id === a.id) return { ...v, sort_order: b.sort_order };
        if (v.id === b.id) return { ...v, sort_order: a.sort_order };
        return v;
      });
      return next.sort((x, y) => x.sort_order - y.sort_order);
    });
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-line bg-surface p-4">
      <h2 className="mb-3 text-sm font-medium text-primary">사역 영상 관리</h2>

      {/* 카테고리 관리 */}
      <div className="mb-4">
        <VideoCategoryEditor initial={initialCategories} userId={userId} />
      </div>

      {/* 영상 추가 폼 */}
      <div className="mb-4 rounded-md border border-line bg-surface-subtle p-3">
        <div className="mb-2 grid grid-cols-1 gap-2 min-[740px]:grid-cols-[1fr_120px]">
          <select
            value={fCat}
            onChange={(e) => setFCat(e.target.value)}
            className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none"
          >
            <option value="">카테고리 선택…</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={fYear}
            onChange={(e) => setFYear(e.target.value)}
            placeholder="년도"
            className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <input
          type="text"
          value={fTitle}
          onChange={(e) => setFTitle(e.target.value)}
          placeholder="영상 제목"
          className="mb-2 w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none"
        />
        <input
          type="url"
          value={fUrl}
          onChange={(e) => setFUrl(e.target.value)}
          placeholder="영상 URL (YouTube · 재생목록 · Facebook 모두 가능)"
          className="mb-2 w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none"
        />
        <button
          type="button"
          onClick={addVideo}
          disabled={busy}
          className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: 'var(--accent)' }}
        >
          {busy ? '처리 중…' : '영상 추가'}
        </button>
      </div>

      {/* 영상 리스트 */}
      {videos.length === 0 ? (
        <p className="text-xs text-faint">등록된 영상이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {videos.map((v, i) => {
            const thumb = videoThumbnail(v);
            const custom = !!(v.thumbnail_url && v.thumbnail_url.trim());
            const open = thumbEditId === v.id;
            return (
              <li
                key={v.id}
                className="rounded-md border border-line bg-surface-subtle p-2"
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative aspect-video w-[64px] flex-shrink-0 overflow-hidden rounded bg-[#221C1C]">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-ink">{v.title}</p>
                    <p className="text-[10px] text-faint">
                      {catName(v.category_id)}
                      {v.year ? ` · ${v.year}` : ''}
                      {custom ? ' · 커스텀 썸네일' : ''}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setThumbEditId(open ? null : v.id)}
                      disabled={busy}
                      className={`rounded border px-2 py-1 text-xs disabled:opacity-30 ${
                        open ? 'border-primary text-primary' : 'border-line bg-surface text-muted'
                      }`}
                    >
                      썸네일
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0 || busy}
                      className="rounded border border-line bg-surface px-2 py-1 text-xs disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === videos.length - 1 || busy}
                      className="rounded border border-line bg-surface px-2 py-1 text-xs disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteVideo(v)}
                      disabled={busy}
                      className="rounded border border-line bg-surface px-2 py-1 text-xs text-danger"
                    >
                      삭제
                    </button>
                  </div>
                </div>

                {open && (
                  <div className="mt-2 border-t border-line pt-2">
                    <p className="mb-1.5 text-[10px] text-faint">
                      커스텀 썸네일 (재생목록·Facebook 등 YouTube 썸네일이 없을 때 사용. 없으면 자동/▶ placeholder)
                    </p>
                    <PortfolioPhotoUpload
                      userId={userId}
                      kind="video-thumb"
                      value={v.thumbnail_url ?? ''}
                      onChange={(url) => setThumb(v, url)}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {error && <p className="mt-2 text-[11px] text-danger">{error}</p>}
    </section>
  );
}
