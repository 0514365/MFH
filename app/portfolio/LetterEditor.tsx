'use client';

// MFH-PORTFOLIO-LETTER-EDITOR-V3
// 선교편지 관리 (편집 페이지).
// V3: 외곽 제목 제거 — AccordionSection("선교편지 관리") 안에 들어감.
// (이전 주석) 선교편지 관리 (편집 페이지, 영상 관리 아래).
// 추가 폼(년월·호수·제목 + PDF필수 + 표지선택 + 요약기도문 + 공개토글) + 리스트(공개표시·공유URL복사·순서·삭제).
// V2: 요약 기도문(summary, patch67) 입력 — 신규 폼 + 기존 편지 인라인 편집(최신호용).
//     공개 "최신 선교편지" 블록 우측 칼럼에 출력. 최신호에만 작성.
// 디자인 사양: MFH-PORTFOLIO-DESIGN.md v4 §5-5

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import type { PortfolioLetter } from '@/lib/portfolio';
import { letterMonthLabel } from '@/lib/portfolio';
import PortfolioLetterUpload from '@/components/PortfolioLetterUpload';

const BUCKET = 'portfolio-letters';

type Props = {
  initial: PortfolioLetter[];
  userId: string;
};

export default function LetterEditor({ initial, userId }: Props) {
  const [letters, setLetters] = useState<PortfolioLetter[]>(initial);
  const [adding, setAdding] = useState(false);

  // 새 편지 폼 상태
  const [yearMonth, setYearMonth] = useState('');
  const [num, setNum] = useState('');
  const [title, setTitle] = useState('');
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [coverPath, setCoverPath] = useState<string | null>(null);
  const [summary, setSummary] = useState('');
  const [pub, setPub] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 기존 편지 요약 인라인 편집
  const [summaryEditId, setSummaryEditId] = useState<string | null>(null);
  const [summaryDraft, setSummaryDraft] = useState('');
  const [summarySaving, setSummarySaving] = useState(false);

  function resetForm() {
    setYearMonth('');
    setNum('');
    setTitle('');
    setPdfPath(null);
    setCoverPath(null);
    setSummary('');
    setPub(true);
    setFormError(null);
  }

  async function addLetter() {
    setFormError(null);
    if (!yearMonth.trim()) {
      setFormError('년월을 입력하세요 (예: 2026-05).');
      return;
    }
    if (!title.trim()) {
      setFormError('제목을 입력하세요.');
      return;
    }
    if (!pdfPath) {
      setFormError('PDF 파일을 업로드하세요.');
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const maxSort = letters.reduce((m, l) => Math.max(m, l.sort_order), 0);
      const { data, error } = await supabase
        .from('letters')
        .insert({
          user_id: userId,
          year_month: yearMonth.trim(),
          number: num.trim() || null,
          title: title.trim(),
          pdf_path: pdfPath,
          cover_path: coverPath,
          summary: summary.trim() || null,
          public_view: pub,
          sort_order: maxSort + 10,
        })
        .select('*')
        .single();
      if (error) {
        setFormError(error.message);
        return;
      }
      setLetters((prev) => [...prev, data as PortfolioLetter]);
      resetForm();
      setAdding(false);
    } finally {
      setSaving(false);
    }
  }

  async function togglePublic(letter: PortfolioLetter) {
    const supabase = createClient();
    const next = !letter.public_view;
    const { error } = await supabase
      .from('letters')
      .update({ public_view: next })
      .eq('id', letter.id);
    if (!error) {
      setLetters((prev) =>
        prev.map((l) => (l.id === letter.id ? { ...l, public_view: next } : l))
      );
    }
  }

  function openSummaryEdit(letter: PortfolioLetter) {
    setSummaryEditId(letter.id);
    setSummaryDraft(letter.summary ?? '');
  }

  async function saveSummary(letter: PortfolioLetter) {
    setSummarySaving(true);
    try {
      const supabase = createClient();
      const next = summaryDraft.trim() || null;
      const { error } = await supabase
        .from('letters')
        .update({ summary: next })
        .eq('id', letter.id);
      if (error) return;
      setLetters((prev) =>
        prev.map((l) => (l.id === letter.id ? { ...l, summary: next } : l))
      );
      setSummaryEditId(null);
      setSummaryDraft('');
    } finally {
      setSummarySaving(false);
    }
  }

  async function removeLetter(letter: PortfolioLetter) {
    if (!confirm('이 편지를 삭제할까요? (PDF·표지 파일도 함께 삭제됩니다.)')) return;
    const supabase = createClient();
    const { error } = await supabase.from('letters').delete().eq('id', letter.id);
    if (error) return;
    const paths = [letter.pdf_path, letter.cover_path].filter(
      (p): p is string => !!p
    );
    if (paths.length > 0) {
      await supabase.storage.from(BUCKET).remove(paths);
    }
    setLetters((prev) => prev.filter((l) => l.id !== letter.id));
  }

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= letters.length) return;
    const a = letters[index];
    const b = letters[target];
    const supabase = createClient();
    await supabase.from('letters').update({ sort_order: b.sort_order }).eq('id', a.id);
    await supabase.from('letters').update({ sort_order: a.sort_order }).eq('id', b.id);
    setLetters((prev) => {
      const next = [...prev];
      const tmpSort = next[index].sort_order;
      next[index] = { ...next[index], sort_order: next[target].sort_order };
      next[target] = { ...next[target], sort_order: tmpSort };
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function copyUrl(letter: PortfolioLetter) {
    const supabase = createClient();
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(letter.pdf_path);
    const url = data.publicUrl;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(letter.id);
      setTimeout(() => setCopiedId((c) => (c === letter.id ? null : c)), 1500);
    } catch {
      window.prompt('공유 URL', url);
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-end">
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-soft"
          >
            + 편지 추가
          </button>
        )}
      </div>

      {adding && (
        <div className="mb-4 rounded-md border border-line bg-surface-subtle p-3">
          <p className="mb-2 text-xs text-muted">새 편지</p>
          <div className="mb-2 grid grid-cols-[90px_80px_1fr] gap-2">
            <input
              type="text"
              value={yearMonth}
              onChange={(e) => setYearMonth(e.target.value)}
              placeholder="2026-05"
              className="rounded-md border border-line bg-surface px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
            />
            <input
              type="text"
              value={num}
              onChange={(e) => setNum(e.target.value)}
              placeholder="No."
              className="rounded-md border border-line bg-surface px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
            />
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목"
              className="rounded-md border border-line bg-surface px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
            />
          </div>
          <div className="mb-2 grid grid-cols-2 gap-2">
            <PortfolioLetterUpload
              userId={userId}
              kind="pdf"
              currentPath={pdfPath}
              onUploaded={setPdfPath}
              label="PDF 업로드 *"
            />
            <PortfolioLetterUpload
              userId={userId}
              kind="cover"
              currentPath={coverPath}
              onUploaded={setCoverPath}
              label="표지 (선택)"
            />
          </div>
          <div className="mb-2">
            <label className="mb-1 block text-[11px] text-muted">
              요약 기도문 (최신호만 · 선택) — 공개 페이지 ‘최신 선교편지’ 우측에 표시
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={4}
              placeholder={'- 기도제목 1\n- 기도제목 2'}
              className="w-full rounded-md border border-line bg-surface px-2 py-1.5 text-xs leading-relaxed focus:border-primary focus:outline-none"
            />
          </div>
          <label className="mb-3 flex items-center gap-2 text-xs text-ink">
            <input
              type="checkbox"
              checked={pub}
              onChange={(e) => setPub(e.target.checked)}
            />
            공개 (포트폴리오에 노출)
          </label>
          {formError && <p className="mb-2 text-[11px] text-danger">{formError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={addLetter}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--accent)' }}
            >
              {saving ? '저장 중…' : '저장'}
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setAdding(false);
              }}
              className="rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface-subtle"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {letters.length === 0 ? (
        <p className="text-xs text-faint">아직 등록된 편지가 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {letters.map((l, i) => {
            const month = letterMonthLabel(l.year_month);
            return (
              <li
                key={l.id}
                className="rounded-md border border-line bg-surface px-3 py-2.5"
              >
                <div className="flex items-center justify-between">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="text-base text-primary" aria-hidden>
                    📄
                  </span>
                  <div className="min-w-0">
                    {l.number && (
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ background: 'var(--accent-soft)', color: 'var(--primary)' }}
                      >
                        No.{l.number}
                      </span>
                    )}
                    <span className="ml-2 text-xs text-ink">
                      {l.year_month}
                      {month ? ` (${month})` : ''} {l.title}
                    </span>
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2.5 text-muted">
                  <button
                    type="button"
                    onClick={() =>
                      summaryEditId === l.id ? setSummaryEditId(null) : openSummaryEdit(l)
                    }
                    className="text-[11px] font-medium"
                    style={{ color: l.summary ? 'var(--primary)' : 'var(--muted)' }}
                    title="요약 기도문 편집 (최신호용)"
                  >
                    {l.summary ? '🙏 요약' : '＋요약'}
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePublic(l)}
                    className="text-[11px] font-medium"
                    style={{ color: l.public_view ? 'var(--accent)' : 'var(--text-faint)' }}
                    title={l.public_view ? '공개 중 (클릭하면 비공개)' : '비공개 (클릭하면 공개)'}
                  >
                    {l.public_view ? '● 공개' : '○ 비공개'}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyUrl(l)}
                    className="text-[11px]"
                    title="공유 URL 복사"
                  >
                    {copiedId === l.id ? '복사됨' : '🔗'}
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="text-xs disabled:opacity-30"
                    aria-label="위로"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === letters.length - 1}
                    className="text-xs disabled:opacity-30"
                    aria-label="아래로"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeLetter(l)}
                    className="text-xs text-danger"
                    aria-label="삭제"
                  >
                    ✕
                  </button>
                </div>
                </div>

                {summaryEditId === l.id && (
                  <div className="mt-2.5 border-t border-line pt-2.5">
                    <label className="mb-1 block text-[11px] text-muted">
                      요약 기도문 — 공개 ‘최신 선교편지’ 우측에 표시 (최신호만 작성 권장)
                    </label>
                    <textarea
                      value={summaryDraft}
                      onChange={(e) => setSummaryDraft(e.target.value)}
                      rows={4}
                      placeholder={'- 기도제목 1\n- 기도제목 2'}
                      className="w-full rounded-md border border-line bg-surface px-2 py-1.5 text-xs leading-relaxed focus:border-primary focus:outline-none"
                    />
                    <div className="mt-1.5 flex gap-2">
                      <button
                        type="button"
                        disabled={summarySaving}
                        onClick={() => saveSummary(l)}
                        className="rounded-md px-3 py-1 text-[11px] font-medium text-white disabled:opacity-50"
                        style={{ background: 'var(--accent)' }}
                      >
                        {summarySaving ? '저장 중…' : '요약 저장'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSummaryEditId(null);
                          setSummaryDraft('');
                        }}
                        className="rounded-md border border-line bg-surface px-3 py-1 text-[11px] font-medium text-muted hover:bg-surface-subtle"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
