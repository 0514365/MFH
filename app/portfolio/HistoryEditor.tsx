'use client';
// MFH-PORTFOLIO-HISTORY-EDITOR-V1
// 선교 연혁 CRUD. is_ongoing 토글 (빨강/회색 점). sort_order 위/아래 화살표로 변경.

import { useMemo, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import type { PortfolioHistory } from '@/lib/portfolio';

type Props = {
  initial: PortfolioHistory[];
  userId: string;
};

type DraftRow = {
  id: string | null;
  period_text: string;
  title: string;
  is_ongoing: boolean;
  sort_order: number;
  dirty: boolean;
};

function toDraft(h: PortfolioHistory): DraftRow {
  return {
    id: h.id,
    period_text: h.period_text,
    title: h.title,
    is_ongoing: h.is_ongoing,
    sort_order: h.sort_order,
    dirty: false,
  };
}

export default function HistoryEditor({ initial, userId }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<DraftRow[]>(initial.map(toDraft));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRow(index: number, patch: Partial<DraftRow>) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch, dirty: true } : r)),
    );
  }

  function addRow() {
    const maxOrder = rows.reduce((m, r) => Math.max(m, r.sort_order), 0);
    setRows((prev) => [
      ...prev,
      {
        id: null,
        period_text: '',
        title: '',
        is_ongoing: false,
        sort_order: maxOrder + 10,
        dirty: true,
      },
    ]);
  }

  async function deleteRow(index: number) {
    const row = rows[index];
    if (!row) return;
    const ok = confirm(`"${row.title || '(빈 항목)'}" 을(를) 삭제할까요?`);
    if (!ok) return;
    if (row.id) {
      setBusy(true);
      const { error: delError } = await supabase
        .from('portfolio_history')
        .delete()
        .eq('id', row.id);
      setBusy(false);
      if (delError) {
        setError(delError.message);
        return;
      }
    }
    setRows((prev) => prev.filter((_, i) => i !== index));
    router.refresh();
  }

  function moveRow(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    setRows((prev) => {
      const next = [...prev];
      const a = next[index];
      const b = next[target];
      if (!a || !b) return prev;
      const aOrder = a.sort_order;
      next[index] = { ...a, sort_order: b.sort_order, dirty: true };
      next[target] = { ...b, sort_order: aOrder, dirty: true };
      next.sort((x, y) => x.sort_order - y.sort_order);
      return next;
    });
  }

  async function saveAll() {
    setBusy(true);
    setError(null);

    const dirty = rows.filter((r) => r.dirty);
    if (dirty.length === 0) {
      setBusy(false);
      return;
    }

    // 분리: insert vs update
    const inserts = dirty
      .filter((r) => r.id === null && r.period_text.trim() && r.title.trim())
      .map((r) => ({
        user_id: userId,
        period_text: r.period_text,
        title: r.title,
        is_ongoing: r.is_ongoing,
        sort_order: r.sort_order,
      }));

    const updates = dirty
      .filter((r) => r.id !== null)
      .map((r) => ({
        id: r.id as string,
        period_text: r.period_text,
        title: r.title,
        is_ongoing: r.is_ongoing,
        sort_order: r.sort_order,
      }));

    if (inserts.length > 0) {
      const { error: insError } = await supabase.from('portfolio_history').insert(inserts);
      if (insError) {
        setBusy(false);
        setError(insError.message);
        return;
      }
    }

    for (const u of updates) {
      const { error: upError } = await supabase
        .from('portfolio_history')
        .update({
          period_text: u.period_text,
          title: u.title,
          is_ongoing: u.is_ongoing,
          sort_order: u.sort_order,
        })
        .eq('id', u.id);
      if (upError) {
        setBusy(false);
        setError(upError.message);
        return;
      }
    }

    setBusy(false);
    router.refresh();
  }

  function bindRowText(index: number, key: 'period_text' | 'title') {
    return (e: ChangeEvent<HTMLInputElement>) => updateRow(index, { [key]: e.target.value });
  }

  return (
    <section className="rounded-lg border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-primary">선교 연혁</h2>
        <button
          type="button"
          onClick={addRow}
          className="rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-soft"
        >
          + 항목 추가
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-faint">항목이 없습니다. "+ 항목 추가" 를 눌러 시작하세요.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r, i) => (
            <li
              key={r.id ?? `new-${i}`}
              className="rounded-md border border-line bg-surface-subtle p-3"
            >
              <div className="grid grid-cols-1 gap-2 min-[740px]:grid-cols-[1fr_2fr]">
                <input
                  type="text"
                  value={r.period_text}
                  onChange={bindRowText(i, 'period_text')}
                  placeholder="2016. 2 ~ 현재"
                  className="rounded-md border border-line bg-surface px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                />
                <input
                  type="text"
                  value={r.title}
                  onChange={bindRowText(i, 'title')}
                  placeholder="온두라스 선교 파송"
                  className="rounded-md border border-line bg-surface px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <label className="flex items-center gap-1.5 text-muted">
                  <input
                    type="checkbox"
                    checked={r.is_ongoing}
                    onChange={(e) => updateRow(i, { is_ongoing: e.target.checked })}
                    className="h-3.5 w-3.5"
                  />
                  <span>현재 진행 중 (빨간 점)</span>
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveRow(i, -1)}
                    disabled={i === 0}
                    className="rounded border border-line bg-surface px-2 py-1 text-xs disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveRow(i, 1)}
                    disabled={i === rows.length - 1}
                    className="rounded border border-line bg-surface px-2 py-1 text-xs disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteRow(i)}
                    className="rounded border border-line bg-surface px-2 py-1 text-xs text-danger"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs">
          {error && <span className="text-danger">{error}</span>}
        </div>
        <button
          type="button"
          onClick={saveAll}
          disabled={busy || rows.every((r) => !r.dirty)}
          className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: 'var(--accent)' }}
        >
          {busy ? '저장 중…' : '연혁 저장'}
        </button>
      </div>
    </section>
  );
}
