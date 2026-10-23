'use client';
// MFH-PORTFOLIO-HISTORY-EDITOR-V3 — 2027(4-8): 2줄 행(진행 중 로즈 점 · 제목 / 기간) · 행 탭 = 그 행만 펼쳐 편집(연회색 패널) · 추가 = 터키석 · 저장 = 남색.
// MFH-PORTFOLIO-HISTORY-EDITOR-V2
// 선교 연혁 CRUD. is_ongoing 토글 (빨강/회색 점). sort_order 위/아래 화살표로 변경.
// V2: 외곽 카드/제목 제거 — 편집 페이지 AccordionSection("선교 연혁 관리") 안에 들어감.

import { useMemo, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import type { PortfolioHistory } from '@/lib/portfolio';
import { actBtn, saveBtn, toolBtn, delBtn, panelCls, rowCls, inputOnCardCls, errorCls } from './ui';

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
  const [openIdx, setOpenIdx] = useState<number | null>(null);

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
    setOpenIdx(rows.length);
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
    setOpenIdx(null);
    router.refresh();
  }

  function moveRow(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    setOpenIdx(target);
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
    setOpenIdx(null);
    router.refresh();
  }

  function bindRowText(index: number, key: 'period_text' | 'title') {
    return (e: ChangeEvent<HTMLInputElement>) => updateRow(index, { [key]: e.target.value });
  }

  return (
    <div>
      {rows.length === 0 ? (
        <p className="text-[12px] text-b27-muted">항목이 없습니다. 「＋ 항목 추가」로 시작하세요.</p>
      ) : (
        <ul>
          {rows.map((r, i) => {
            const open = openIdx === i;
            return (
              <li key={r.id ?? `new-${i}`}>
                <button type="button" onClick={() => setOpenIdx(open ? null : i)} aria-expanded={open} className={rowCls}>
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${r.is_ongoing ? 'bg-b27-block-6' : 'bg-b27-line'}`}
                    aria-label={r.is_ongoing ? '진행 중' : undefined}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] text-b27-ink">{r.title || '(빈 항목)'}</span>
                    <span className="mt-0.5 block font-num text-[11.5px] text-b27-muted">{r.period_text || '기간 없음'}</span>
                  </span>
                  {r.dirty && <span className="shrink-0 text-[11px] text-b27-wait">수정됨</span>}
                </button>

                {open && (
                  <div className={panelCls}>
                    <input
                      type="text"
                      value={r.period_text}
                      onChange={bindRowText(i, 'period_text')}
                      placeholder="2016. 2 ~ 현재"
                      aria-label="기간"
                      className={inputOnCardCls}
                    />
                    <input
                      type="text"
                      value={r.title}
                      onChange={bindRowText(i, 'title')}
                      placeholder="온두라스 선교 파송"
                      aria-label="제목"
                      className={inputOnCardCls}
                    />
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateRow(i, { is_ongoing: !r.is_ongoing })}
                        aria-pressed={r.is_ongoing}
                        className={r.is_ongoing ? 'rounded-full bg-b27-ink px-3 py-1.5 text-[12px] text-white' : toolBtn}
                      >
                        {r.is_ongoing ? '● 진행 중' : '진행 중 표시'}
                      </button>
                      <span className="flex-1" />
                      <button type="button" onClick={() => moveRow(i, -1)} disabled={i === 0} className={toolBtn} aria-label="위로">
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveRow(i, 1)}
                        disabled={i === rows.length - 1}
                        className={toolBtn}
                        aria-label="아래로"
                      >
                        ↓
                      </button>
                      <button type="button" onClick={() => deleteRow(i)} className={delBtn}>
                        삭제
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button type="button" onClick={addRow} className={actBtn}>
          ＋ 항목 추가
        </button>
        {error && <span className={`min-w-0 flex-1 truncate ${errorCls}`}>{error}</span>}
        <button
          type="button"
          onClick={saveAll}
          disabled={busy || rows.every((r) => !r.dirty)}
          className={`ml-auto ${saveBtn}`}
        >
          {busy ? '저장 중…' : '연혁 저장'}
        </button>
      </div>
    </div>
  );
}
