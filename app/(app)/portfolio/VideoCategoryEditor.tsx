'use client';
// MFH-PORTFOLIO-VIDEO-CATEGORY-EDITOR-V2 — 2027(4-8): 감싸는 면 없음 · 분류 = 라벤더 틴트 알약 · 이름 수정 = 흰 알약 + 남색 링 · 추가 입력 = 연회색 면.
// MFH-PORTFOLIO-VIDEO-CATEGORY-EDITOR-V1
// 사역 영상 카테고리 CRUD. 칩 형태. 추가/이름변경(인라인)/삭제/순서(←→).
// 삭제 시 해당 카테고리 영상은 category_id = null (SQL on delete set null).

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import type { PortfolioVideoCategory } from '@/lib/portfolio';

type Props = {
  initial: PortfolioVideoCategory[];
  userId: string;
};

export default function VideoCategoryEditor({ initial, userId }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [cats, setCats] = useState<PortfolioVideoCategory[]>(
    [...initial].sort((a, b) => a.sort_order - b.sort_order),
  );
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addCategory() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    const maxOrder = cats.reduce((m, c) => Math.max(m, c.sort_order), 0);
    const { data, error: insError } = await supabase
      .from('portfolio_video_categories')
      .insert({ user_id: userId, name, sort_order: maxOrder + 10 })
      .select()
      .single();
    setBusy(false);
    if (insError) {
      setError(insError.message);
      return;
    }
    if (data) {
      setCats((prev) => [...prev, data as PortfolioVideoCategory]);
      setNewName('');
      router.refresh();
    }
  }

  function startEdit(cat: PortfolioVideoCategory) {
    setEditingId(cat.id);
    setEditingName(cat.name);
  }

  async function saveEdit() {
    const name = editingName.trim();
    if (!editingId || !name) {
      setEditingId(null);
      return;
    }
    setBusy(true);
    setError(null);
    const { error: upError } = await supabase
      .from('portfolio_video_categories')
      .update({ name })
      .eq('id', editingId);
    setBusy(false);
    if (upError) {
      setError(upError.message);
      return;
    }
    setCats((prev) =>
      prev.map((c) => (c.id === editingId ? { ...c, name } : c)),
    );
    setEditingId(null);
    router.refresh();
  }

  async function deleteCategory(cat: PortfolioVideoCategory) {
    const ok = confirm(
      `"${cat.name}" 카테고리를 삭제할까요?\n(이 카테고리의 영상은 "기타"로 이동합니다.)`,
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    const { error: delError } = await supabase
      .from('portfolio_video_categories')
      .delete()
      .eq('id', cat.id);
    setBusy(false);
    if (delError) {
      setError(delError.message);
      return;
    }
    setCats((prev) => prev.filter((c) => c.id !== cat.id));
    router.refresh();
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= cats.length) return;
    const a = cats[index];
    const b = cats[target];
    if (!a || !b) return;
    setBusy(true);
    setError(null);
    // 두 행의 sort_order 교환
    const { error: e1 } = await supabase
      .from('portfolio_video_categories')
      .update({ sort_order: b.sort_order })
      .eq('id', a.id);
    const { error: e2 } = await supabase
      .from('portfolio_video_categories')
      .update({ sort_order: a.sort_order })
      .eq('id', b.id);
    setBusy(false);
    if (e1 || e2) {
      setError((e1 ?? e2)!.message);
      return;
    }
    setCats((prev) => {
      const next = prev.map((c) => {
        if (c.id === a.id) return { ...c, sort_order: b.sort_order };
        if (c.id === b.id) return { ...c, sort_order: a.sort_order };
        return c;
      });
      return next.sort((x, y) => x.sort_order - y.sort_order);
    });
    router.refresh();
  }

  return (
    <div>
      <div className="mb-1.5 font-num text-[12px] font-medium text-b27-muted">분류</div>

      {cats.length === 0 ? (
        <p className="mb-2 text-[11px] text-b27-muted">카테고리가 없습니다. 아래에서 추가하세요.</p>
      ) : (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {cats.map((cat, i) => (
            <li key={cat.id}>
              {editingId === cat.id ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-b27-paper px-2.5 py-1 ring-2 ring-b27-ink/20">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                    className="w-24 bg-transparent text-[12px] text-b27-ink focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={saveEdit}
                    disabled={busy}
                    className="text-[11px] font-medium text-b27-ink"
                  >
                    저장
                  </button>
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-b27-tint-5 px-2.5 py-1 text-[12px] text-[#4E39C6]"
                >
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0 || busy}
                    className="opacity-60 hover:opacity-100 disabled:opacity-20"
                    aria-label="앞으로"
                  >
                    ‹
                  </button>
                  <button type="button" onClick={() => startEdit(cat)} className="px-0.5">
                    {cat.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === cats.length - 1 || busy}
                    className="opacity-60 hover:opacity-100 disabled:opacity-20"
                    aria-label="뒤로"
                  >
                    ›
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCategory(cat)}
                    disabled={busy}
                    className="ml-0.5 opacity-60 hover:opacity-100"
                    aria-label="삭제"
                  >
                    ×
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addCategory();
          }}
          placeholder="새 카테고리 이름"
          className="min-w-0 flex-1 rounded-full bg-b27-card px-3.5 py-1.5 text-[12px] text-b27-ink outline-none placeholder:text-b27-muted focus:ring-2 focus:ring-b27-ink/15"
        />
        <button
          type="button"
          onClick={addCategory}
          disabled={busy || !newName.trim()}
          className="shrink-0 rounded-full bg-b27-card px-3 py-1.5 text-[12px] font-medium text-b27-ink transition active:opacity-70 disabled:opacity-40"
        >
          ＋ 분류
        </button>
      </div>

      {error && <p className="mt-2 text-[11px] text-b27-expense">{error}</p>}
    </div>
  );
}
