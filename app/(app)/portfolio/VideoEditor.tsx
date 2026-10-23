'use client';
// MFH-PORTFOLIO-VIDEO-EDITOR-V6 — 2027(4-8): 분류 알약 → ＋ 영상 추가(터키석, 펼침 패널) → 썸네일 + 2줄 행(행 탭 = 그 행만 펼쳐 수정·썸네일·순서·삭제) → 「도구 · CSV」 접힘.
// MFH-PORTFOLIO-VIDEO-EDITOR-V5
// 사역 영상 CRUD. 추가 폼(카테고리/년도/제목/영상 URL) + 리스트(미니썸네일 + 수정 + 썸네일설정 + ↑↓ + 삭제).
// 카테고리 + 영상을 한 섹션으로 묶음(VideoCategoryEditor 포함).
// V2: URL 검증 완화 — YouTube 뿐 아니라 재생목록·Facebook 등 http(s) URL 모두 허용
//     (YouTube 가 아니면 썸네일은 placeholder, 클릭은 원본으로 정상 이동).
// V3: 영상별 커스텀 썸네일 설정(재생목록·FB 등 YouTube 썸네일 없는 영상용, patch66).
//     표시 우선순위 = 커스텀 → YouTube → placeholder.
// V4: 외곽 카드/제목 제거(AccordionSection 안에 들어감) + CSV 내보내기/가져오기.
//     CSV 가져오기 = id 기준 upsert(있으면 수정·없으면 추가), 카테고리는 이름 매칭, 빠진 행은 삭제 안 함.
// V5: 등록된 영상 인라인 수정(제목·URL·카테고리·년도) — 각 항목 "수정" 버튼 토글 폼. SQL 변경 없음.

import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import type { PortfolioVideo, PortfolioVideoCategory } from '@/lib/portfolio';
import { videoThumbnail } from '@/lib/portfolio';
import { toCSV, parseCSV } from '@/lib/csv';
import PortfolioPhotoUpload from '@/components/PortfolioPhotoUpload';
import VideoCategoryEditor from './VideoCategoryEditor';
import { actBtn, saveBtn, toolBtn, delBtn, panelCls, rowCls, inputOnCardCls, hintCls, errorCls } from './ui';

const CSV_HEADER = ['id', 'category', 'year', 'title', 'youtube_url', 'thumbnail_url', 'sort_order'];

type VideoInsert = {
  user_id: string;
  category_id: string | null;
  title: string;
  youtube_url: string;
  year: number | null;
  thumbnail_url: string | null;
  sort_order: number;
};
type VideoPatch = Partial<
  Pick<PortfolioVideo, 'title' | 'youtube_url' | 'category_id' | 'year' | 'thumbnail_url' | 'sort_order'>
>;

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
  // 인라인 수정: 편집 중 영상 id + 편집 필드값
  const [editId, setEditId] = useState<string | null>(null);
  const [eCat, setECat] = useState<string>('');
  const [eYear, setEYear] = useState<string>('');
  const [eTitle, setETitle] = useState<string>('');
  const [eUrl, setEUrl] = useState<string>('');
  const importRef = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  function catName(id: string | null): string {
    if (!id) return '기타';
    return cats.find((c) => c.id === id)?.name ?? '기타';
  }

  // ===== CSV 내보내기 =====
  function exportCSV() {
    const rows = videos.map((v) => [
      v.id,
      catName(v.category_id),
      v.year != null ? String(v.year) : '',
      v.title,
      v.youtube_url,
      v.thumbnail_url ?? '',
      String(v.sort_order),
    ]);
    const csv = toCSV([CSV_HEADER, ...rows]);
    // BOM 추가(엑셀 한글 깨짐 방지)
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mfh-videos.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // ===== CSV 가져오기 (id 기준 upsert) =====
  async function onImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일 재선택 허용
    if (!file) return;

    const text = await file.text();
    const table = parseCSV(text).filter((r) => r.some((c) => c.trim() !== ''));
    if (table.length < 2) {
      setError('CSV 에 데이터 행이 없습니다.');
      return;
    }

    const header = table[0].map((h) => h.trim().toLowerCase());
    const col = (name: string) => header.indexOf(name);
    const iId = col('id');
    const iCat = col('category');
    const iYear = col('year');
    const iTitle = col('title');
    const iUrl = col('youtube_url');
    const iThumb = col('thumbnail_url');
    const iSort = col('sort_order');
    if (iTitle < 0 || iUrl < 0) {
      setError('CSV 헤더에 title, youtube_url 컬럼이 필요합니다.');
      return;
    }

    const catByName = new Map(cats.map((c) => [c.name.trim().toLowerCase(), c.id]));
    const existingIds = new Set(videos.map((v) => v.id));
    const inserts: VideoInsert[] = [];
    const updates: { id: string; patch: VideoPatch }[] = [];
    let skipped = 0;
    let maxOrder = videos.reduce((m, v) => Math.max(m, v.sort_order), 0);

    const cell = (row: string[], i: number) => (i >= 0 ? (row[i] ?? '').trim() : '');

    for (let r = 1; r < table.length; r++) {
      const row = table[r];
      const title = cell(row, iTitle);
      const url = cell(row, iUrl);
      if (!title || !/^https?:\/\/.+/i.test(url)) {
        skipped++;
        continue;
      }
      const catRaw = cell(row, iCat);
      const category_id = catRaw ? catByName.get(catRaw.toLowerCase()) ?? null : null;
      const yearRaw = cell(row, iYear);
      const yearNum = yearRaw ? parseInt(yearRaw, 10) : NaN;
      const year = Number.isFinite(yearNum) ? yearNum : null;
      const thumbRaw = cell(row, iThumb);
      const thumbnail_url = thumbRaw ? thumbRaw : null;
      const sortRaw = cell(row, iSort);
      const sortNum = sortRaw ? parseInt(sortRaw, 10) : NaN;

      const id = cell(row, iId);
      if (id && existingIds.has(id)) {
        const patch: VideoPatch = { title, youtube_url: url, category_id, year, thumbnail_url };
        if (Number.isFinite(sortNum)) patch.sort_order = sortNum;
        updates.push({ id, patch });
      } else {
        maxOrder += 10;
        inserts.push({
          user_id: userId,
          category_id,
          title,
          youtube_url: url,
          year,
          thumbnail_url,
          sort_order: Number.isFinite(sortNum) ? sortNum : maxOrder,
        });
      }
    }

    if (inserts.length === 0 && updates.length === 0) {
      setError(`가져올 행이 없습니다. (건너뜀 ${skipped}건 — 제목/URL 누락)`);
      return;
    }

    const ok = confirm(
      `CSV 가져오기\n수정 ${updates.length}건 · 추가 ${inserts.length}건 · 건너뜀 ${skipped}건\n진행할까요?`,
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      let next = [...videos];
      if (inserts.length) {
        const { data, error: insError } = await supabase
          .from('portfolio_videos')
          .insert(inserts)
          .select();
        if (insError) throw insError;
        if (data) next = [...next, ...(data as PortfolioVideo[])];
      }
      for (const u of updates) {
        const { error: upError } = await supabase
          .from('portfolio_videos')
          .update(u.patch)
          .eq('id', u.id);
        if (upError) throw upError;
        next = next.map((v) => (v.id === u.id ? { ...v, ...u.patch } : v));
      }
      next.sort((a, b) => a.sort_order - b.sort_order);
      setVideos(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '가져오기 중 오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
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
      setAdding(false);
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
    setEditId(null);
    router.refresh();
  }

  // 인라인 수정: 편집 시작 / 취소 / 저장
  function startEdit(v: PortfolioVideo) {
    setThumbEditId(null);
    setEditId(v.id);
    setECat(v.category_id ?? '');
    setEYear(v.year != null ? String(v.year) : '');
    setETitle(v.title);
    setEUrl(v.youtube_url);
    setError(null);
  }

  function cancelEdit() {
    setEditId(null);
    setError(null);
  }

  async function saveEdit(v: PortfolioVideo) {
    const title = eTitle.trim();
    const url = eUrl.trim();
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
    const yearNum = eYear.trim() ? parseInt(eYear.trim(), 10) : null;
    const patch: VideoPatch = {
      title,
      youtube_url: url,
      category_id: eCat || null,
      year: Number.isFinite(yearNum as number) ? yearNum : null,
    };
    const { error: upError } = await supabase
      .from('portfolio_videos')
      .update(patch)
      .eq('id', v.id);
    setBusy(false);
    if (upError) {
      setError(upError.message);
      return;
    }
    setVideos((prev) => prev.map((x) => (x.id === v.id ? { ...x, ...patch } : x)));
    setEditId(null);
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

  function catYearFields(
    cat: string,
    setCatV: (v: string) => void,
    year: string,
    setYearV: (v: string) => void,
  ) {
    return (
      <div className="grid grid-cols-[1fr_96px] gap-2">
        <select value={cat} onChange={(e) => setCatV(e.target.value)} aria-label="카테고리" className={inputOnCardCls}>
          <option value="">카테고리 선택…</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={year}
          onChange={(e) => setYearV(e.target.value)}
          placeholder="년도"
          aria-label="년도"
          className={inputOnCardCls}
        />
      </div>
    );
  }

  return (
    <div>
      {/* 카테고리 관리 */}
      <div className="mb-3">
        <VideoCategoryEditor initial={initialCategories} userId={userId} />
      </div>

      {/* 영상 추가 — 터키석 버튼 → 연회색 패널 */}
      {!adding ? (
        <button
          type="button"
          onClick={() => {
            setAdding(true);
            setEditId(null);
          }}
          className={`mb-2 ${actBtn}`}
        >
          ＋ 영상 추가
        </button>
      ) : (
        <div className={panelCls}>
          <p className="text-[13px] font-medium text-b27-ink">새 영상</p>
          {catYearFields(fCat, setFCat, fYear, setFYear)}
          <input
            type="text"
            value={fTitle}
            onChange={(e) => setFTitle(e.target.value)}
            placeholder="영상 제목"
            aria-label="영상 제목"
            className={inputOnCardCls}
          />
          <input
            type="url"
            value={fUrl}
            onChange={(e) => setFUrl(e.target.value)}
            placeholder="영상 URL (YouTube · 재생목록 · Facebook 모두 가능)"
            aria-label="영상 URL"
            className={inputOnCardCls}
          />
          <div className="flex gap-1.5">
            <button type="button" onClick={addVideo} disabled={busy} className={saveBtn}>
              {busy ? '처리 중…' : '추가'}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setError(null);
              }}
              className={toolBtn}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 영상 리스트 — 썸네일 + 2줄 행 */}
      {videos.length === 0 ? (
        <p className="text-[12px] text-b27-muted">등록된 영상이 없습니다.</p>
      ) : (
        <ul>
          {videos.map((v, i) => {
            const thumb = videoThumbnail(v);
            const custom = !!(v.thumbnail_url && v.thumbnail_url.trim());
            const thumbOpen = thumbEditId === v.id;
            const editing = editId === v.id;
            return (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => (editing ? cancelEdit() : startEdit(v))}
                  aria-expanded={editing}
                  className={rowCls}
                >
                  <span className="relative aspect-video w-16 shrink-0 overflow-hidden rounded-md bg-b27-card">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-[11px] text-b27-muted">▶</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] text-b27-ink">{v.title}</span>
                    <span className="mt-0.5 block truncate font-num text-[11.5px] text-b27-muted">
                      {catName(v.category_id)}
                      {v.year ? ` · ${v.year}` : ''}
                      {custom ? ' · 커스텀 썸네일' : ''}
                    </span>
                  </span>
                </button>

                {editing && (
                  <div className={panelCls}>
                    {catYearFields(eCat, setECat, eYear, setEYear)}
                    <input
                      type="text"
                      value={eTitle}
                      onChange={(e) => setETitle(e.target.value)}
                      placeholder="영상 제목"
                      aria-label="영상 제목"
                      className={inputOnCardCls}
                    />
                    <input
                      type="url"
                      value={eUrl}
                      onChange={(e) => setEUrl(e.target.value)}
                      placeholder="영상 URL (YouTube · 재생목록 · Facebook 모두 가능)"
                      aria-label="영상 URL"
                      className={inputOnCardCls}
                    />
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button type="button" onClick={() => saveEdit(v)} disabled={busy} className={saveBtn}>
                        {busy ? '저장 중…' : '저장'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setThumbEditId(thumbOpen ? null : v.id)}
                        disabled={busy}
                        aria-pressed={thumbOpen}
                        className={thumbOpen ? 'rounded-full bg-b27-ink px-3 py-1.5 text-[12px] text-white' : toolBtn}
                      >
                        썸네일
                      </button>
                      <span className="flex-1" />
                      <button
                        type="button"
                        onClick={() => move(i, -1)}
                        disabled={i === 0 || busy}
                        className={toolBtn}
                        aria-label="위로"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => move(i, 1)}
                        disabled={i === videos.length - 1 || busy}
                        className={toolBtn}
                        aria-label="아래로"
                      >
                        ↓
                      </button>
                      <button type="button" onClick={() => deleteVideo(v)} disabled={busy} className={delBtn}>
                        삭제
                      </button>
                    </div>
                    {thumbOpen && (
                      <div className="rounded-xl bg-b27-paper p-3">
                        <p className="mb-2 text-[11px] text-b27-muted">
                          커스텀 썸네일 — 재생목록·Facebook 등 YouTube 썸네일이 없을 때. 없으면 자동/▶ 표시.
                        </p>
                        <PortfolioPhotoUpload
                          userId={userId}
                          kind="video-thumb"
                          value={v.thumbnail_url ?? ''}
                          onChange={(url) => setThumb(v, url)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {error && <p className={`mt-2 ${errorCls}`}>{error}</p>}

      {/* 도구 · CSV — 접힘 */}
      <button
        type="button"
        onClick={() => setToolsOpen((o) => !o)}
        aria-expanded={toolsOpen}
        className="mt-3 flex w-full items-center gap-2 py-1.5 text-left text-[12.5px] text-b27-muted"
      >
        도구 · CSV 내보내기 / 가져오기
        <span aria-hidden className={`ml-auto transition-transform ${toolsOpen ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>
      {toolsOpen && (
        <div className={panelCls}>
          <div className="flex gap-1.5">
            <button type="button" onClick={exportCSV} disabled={busy || videos.length === 0} className={toolBtn}>
              내보내기
            </button>
            <button type="button" onClick={() => importRef.current?.click()} disabled={busy} className={toolBtn}>
              가져오기
            </button>
          </div>
          <p className={hintCls}>
            가져오기는 <b>id</b> 기준 — 있으면 수정, 없으면 추가(빠진 행은 삭제되지 않음). 카테고리는 이름으로 매칭.
          </p>
        </div>
      )}
      <input ref={importRef} type="file" accept=".csv,text/csv" onChange={onImportFile} className="hidden" />
    </div>
  );
}
