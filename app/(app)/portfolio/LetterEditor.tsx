'use client';

// MFH-PORTFOLIO-LETTER-EDITOR-V8 — 2027(4-8): 2줄 행(No. 라벤더 알약 + 제목 / 년월 · 파일 · 요약 ✓ · 오른쪽 공개 칩) · 행 탭 = 그 행만 펼쳐 요약 기도문·공개·링크·순서·삭제(연회색 패널) · 추가 = 터키석.
// 선교편지 관리 (편집 페이지).
// V7: 인사 카드(kind='card', letters-kind.sql) — 성탄·신년·추석 카드. 목록에 표시되되 최신호에서 제외.
// V6: 요약 기도문 저장 신뢰성 — update 를 .select() 로 되돌려 받아 0건(권한·세션)·오류를 alert 로 표시,
//     성공 시 DB 값으로 상태 갱신 + router.refresh() 로 서버 데이터 재조회 + '저장됨' 표시. (2026-08호에서 저장 미반영 사고)
// V5: 영상 편지(video_url, patch81) — PDF 없이 YouTube 영상만 등록 가능(PDF·영상 중 하나 필수).
// V4: 요약 기도문에 "인사이트 불러오기" — 최근 인사이트(prayer 우선)를 골라 summary 에 삽입(읽기 연계).
// V3: 외곽 제목 제거 — AccordionSection("선교편지 관리") 안에 들어감.
// (이전 주석) 선교편지 관리 (편집 페이지, 영상 관리 아래).
// 추가 폼(년월·호수·제목 + PDF필수 + 표지선택 + 요약기도문 + 공개토글) + 리스트(공개표시·공유URL복사·순서·삭제).
// V2: 요약 기도문(summary, patch67) 입력 — 신규 폼 + 기존 편지 인라인 편집(최신호용).
//     공개 "최신 선교편지" 블록 우측 칼럼에 출력. 최신호에만 작성.
// 디자인 사양: MFH-PORTFOLIO-DESIGN.md v4 §5-5

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import type { PortfolioLetter } from '@/lib/portfolio';
import { letterMonthLabel } from '@/lib/portfolio';
import PortfolioLetterUpload from '@/components/PortfolioLetterUpload';
import { actBtn, saveBtn, toolBtn, delBtn, panelCls, rowCls, inputOnCardCls, hintCls, errorCls, LAVENDER_DEEP } from './ui';

const BUCKET = 'portfolio-letters';

// 요약 기도문에 끌어올 최근 인사이트(읽기 전용 연계).
type InsightPick = {
  id: string;
  domain: string;
  content: string | null;
  created_at: string | null;
  in_letter: boolean | null;
};
const INSIGHT_LABEL: Record<string, string> = {
  prayer: '기도제목',
  fruit: '간증·열매',
  letter: '편지 초안',
  overall: '종합',
};

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
  const [mobilePath, setMobilePath] = useState<string | null>(null);
  const [coverPath, setCoverPath] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [pub, setPub] = useState(true);
  const [isCard, setIsCard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  // 기존 편지 요약 인라인 편집
  const [summaryEditId, setSummaryEditId] = useState<string | null>(null);
  const [summaryDraft, setSummaryDraft] = useState('');
  const [summarySaving, setSummarySaving] = useState(false);
  const [summarySavedId, setSummarySavedId] = useState<string | null>(null);
  const router = useRouter();

  // 인사이트 불러오기 (요약 기도문 연계)
  const [insightPicks, setInsightPicks] = useState<InsightPick[] | null>(null);
  const [pickerFor, setPickerFor] = useState<'new' | string | null>(null);
  const [picksLoading, setPicksLoading] = useState(false);

  function resetForm() {
    setYearMonth('');
    setNum('');
    setTitle('');
    setPdfPath(null);
    setMobilePath(null);
    setCoverPath(null);
    setVideoUrl('');
    setIsCard(false);
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
    if (!pdfPath && !mobilePath && !videoUrl.trim()) {
      setFormError('PDF·모바일 HTML·영상 URL 중 하나는 필요합니다.');
      return;
    }
    if (videoUrl.trim() && !/^https?:\/\/.+/i.test(videoUrl.trim())) {
      setFormError('영상 URL 이 올바르지 않습니다. (http:// 또는 https:// 로 시작)');
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
          mobile_path: mobilePath,
          cover_path: coverPath,
          video_url: videoUrl.trim() || null,
          summary: summary.trim() || null,
          kind: isCard ? 'card' : 'letter',
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
    setSummarySavedId(null);
    try {
      const supabase = createClient();
      const next = summaryDraft.trim() || null;
      // .select() 로 갱신된 행을 되돌려 받아야 RLS 로 0건 갱신된 경우(오류 없이 조용히 실패)를 잡을 수 있다.
      const { data, error } = await supabase
        .from('letters')
        .update({ summary: next })
        .eq('id', letter.id)
        .select('id, summary');
      if (error) {
        alert(`요약 저장 실패: ${error.message}\n(로그인 세션이 만료됐으면 새로고침 후 다시 시도해 주세요.)`);
        return;
      }
      if (!data || data.length === 0) {
        alert(
          '요약이 저장되지 않았습니다. 이 편지의 소유 계정으로 로그인되어 있는지 확인해 주세요. (갱신된 행 0건)'
        );
        return;
      }
      const saved = data[0].summary ?? null;
      setLetters((prev) =>
        prev.map((l) => (l.id === letter.id ? { ...l, summary: saved } : l))
      );
      setSummaryEditId(null);
      setSummaryDraft('');
      setSummarySavedId(letter.id);
      router.refresh();
    } finally {
      setSummarySaving(false);
    }
  }

  async function removeLetter(letter: PortfolioLetter) {
    if (!confirm('이 편지를 삭제할까요? (PDF·표지 파일도 함께 삭제됩니다.)')) return;
    const supabase = createClient();
    const { error } = await supabase.from('letters').delete().eq('id', letter.id);
    if (error) return;
    const paths = [letter.pdf_path, letter.mobile_path, letter.cover_path].filter(
      (p): p is string => !!p
    );
    if (paths.length > 0) {
      await supabase.storage.from(BUCKET).remove(paths);
    }
    setLetters((prev) => prev.filter((l) => l.id !== letter.id));
    setOpenId(null);
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
    let url: string | null = null;
    if (letter.mobile_path) {
      // 뷰어 라우트 (Storage 는 html 을 text/plain 으로 서빙 — V8)
      url = `${window.location.origin}/letters/view/${letter.id}`;
    } else if (letter.pdf_path) {
      url = supabase.storage.from(BUCKET).getPublicUrl(letter.pdf_path).data.publicUrl;
    } else if (letter.video_url) {
      url = letter.video_url;
    }
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(letter.id);
      setTimeout(() => setCopiedId((c) => (c === letter.id ? null : c)), 1500);
    } catch {
      window.prompt('공유 URL', url);
    }
  }

  async function loadInsights() {
    const supabase = createClient();
    const { data } = await supabase
      .from('insights')
      .select('id,domain,content,created_at,in_letter')
      .in('domain', ['prayer', 'fruit', 'letter', 'overall'])
      .order('created_at', { ascending: false })
      .limit(20);
    const rows = (data ?? []) as InsightPick[];
    // prayer(기도제목)를 상단으로, 그 안에서 최신순.
    rows.sort((a, b) => {
      const pa = a.domain === 'prayer' ? 0 : 1;
      const pb = b.domain === 'prayer' ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return (b.created_at ?? '').localeCompare(a.created_at ?? '');
    });
    setInsightPicks(rows);
  }

  async function openPicker(target: 'new' | string) {
    if (pickerFor === target) {
      setPickerFor(null);
      return;
    }
    setPickerFor(target);
    if (insightPicks === null) {
      setPicksLoading(true);
      try {
        await loadInsights();
      } finally {
        setPicksLoading(false);
      }
    }
  }

  function applyInsight(text: string | null) {
    const content = (text ?? '').trim();
    if (content) {
      if (pickerFor === 'new') {
        setSummary((cur) => (cur.trim() ? `${cur.trim()}\n${content}` : content));
      } else if (pickerFor) {
        setSummaryDraft((cur) => (cur.trim() ? `${cur.trim()}\n${content}` : content));
      }
    }
    setPickerFor(null);
  }

  function renderInsightPicker() {
    return (
      <div className="rounded-xl bg-b27-paper p-1.5">
        {picksLoading ? (
          <p className="px-2 py-1.5 text-[11px] text-b27-muted">불러오는 중…</p>
        ) : !insightPicks || insightPicks.length === 0 ? (
          <p className="px-2 py-1.5 text-[11px] text-b27-muted">저장된 인사이트가 없습니다.</p>
        ) : (
          <ul className="max-h-48 overflow-y-auto">
            {insightPicks.map((ins) => {
              const date = ins.created_at?.slice(0, 10) ?? '';
              const preview =
                (ins.content ?? '')
                  .split('\n')
                  .map((s) => s.trim())
                  .find(Boolean)
                  ?.slice(0, 40) ?? '';
              return (
                <li key={ins.id}>
                  <button
                    type="button"
                    onClick={() => applyInsight(ins.content)}
                    className="w-full rounded-lg px-2 py-1.5 text-left active:bg-b27-tint-8"
                  >
                    <span className="text-[11px] font-medium text-[#303C8D]">
                      {INSIGHT_LABEL[ins.domain] ?? ins.domain}
                    </span>
                    <span className="ml-1.5 font-num text-[10px] text-b27-muted">{date}</span>
                    {ins.in_letter && <span className="ml-1.5 text-[10px] text-[#226C5A]">편지에 담김</span>}
                    <span className="mt-0.5 block truncate text-[11px] text-b27-muted">{preview}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  // 요약 기도문 편집 칸(새 편지 · 기존 편지 공용)
  function renderSummaryField(
    target: 'new' | string,
    value: string,
    onChange: (v: string) => void,
    label: string,
  ) {
    return (
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label className="block font-num text-[12px] font-medium text-b27-muted">{label}</label>
          <button
            type="button"
            onClick={() => openPicker(target)}
            className="shrink-0 text-[11px] font-medium"
            style={{ color: LAVENDER_DEEP }}
          >
            인사이트 불러오기
          </button>
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          placeholder={'- 기도제목 1\n- 기도제목 2'}
          className={`${inputOnCardCls} leading-relaxed`}
        />
        {pickerFor === target && <div className="mt-1.5">{renderInsightPicker()}</div>}
      </div>
    );
  }

  function fileLine(l: PortfolioLetter): string {
    const parts = [l.year_month];
    if (l.pdf_path) parts.push('PDF');
    if (l.mobile_path) parts.push('모바일');
    if (l.video_url) parts.push('영상');
    if (l.summary) parts.push('요약 ✓');
    return parts.join(' · ');
  }

  return (
    <div>
      {!adding ? (
        <button type="button" onClick={() => setAdding(true)} className={`mb-2 ${actBtn}`}>
          ＋ 편지 추가
        </button>
      ) : (
        <div className={panelCls}>
          <p className="text-[13px] font-medium text-b27-ink">새 편지</p>
          <div className="grid grid-cols-[88px_72px_1fr] gap-2">
            <input
              type="text"
              value={yearMonth}
              onChange={(e) => setYearMonth(e.target.value)}
              placeholder="2026-05"
              aria-label="년월"
              className="w-full rounded-xl bg-b27-paper px-2.5 py-2.5 font-num text-sm text-b27-ink outline-none placeholder:text-b27-muted focus:ring-2 focus:ring-b27-ink/15"
            />
            <input
              type="text"
              value={num}
              onChange={(e) => setNum(e.target.value)}
              placeholder="No."
              aria-label="호수"
              className="w-full rounded-xl bg-b27-paper px-2.5 py-2.5 font-num text-sm text-b27-ink outline-none placeholder:text-b27-muted focus:ring-2 focus:ring-b27-ink/15"
            />
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목"
              aria-label="제목"
              className={inputOnCardCls}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <PortfolioLetterUpload userId={userId} kind="pdf" currentPath={pdfPath} onUploaded={setPdfPath} label="PDF" />
            <PortfolioLetterUpload
              userId={userId}
              kind="mobile"
              currentPath={mobilePath}
              onUploaded={setMobilePath}
              label="모바일 HTML"
            />
            <PortfolioLetterUpload userId={userId} kind="cover" currentPath={coverPath} onUploaded={setCoverPath} label="표지" />
          </div>
          <div>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="영상 URL (YouTube) — PDF 없이 영상만 있는 편지"
              aria-label="영상 URL"
              className={inputOnCardCls}
            />
            <p className={hintCls}>PDF·모바일 HTML·영상 URL 중 하나는 필수. 모바일 HTML·표지는 선택. 영상 편지는 YouTube 썸네일이 표지가 됩니다.</p>
          </div>
          {renderSummaryField('new', summary, setSummary, '요약 기도문 (최신호만 · 선택)')}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setPub((v) => !v)}
              aria-pressed={pub}
              className={pub ? 'rounded-full bg-b27-ink px-3 py-1.5 text-[12px] text-white' : toolBtn}
            >
              {pub ? '● 공개' : '비공개'}
            </button>
            <button
              type="button"
              onClick={() => setIsCard((v) => !v)}
              aria-pressed={isCard}
              className={isCard ? 'rounded-full bg-b27-ink px-3 py-1.5 text-[12px] text-white' : toolBtn}
            >
              {isCard ? '● 인사 카드' : '인사 카드'}
            </button>
          </div>
          {isCard && <p className="text-[11px] text-b27-muted">성탄·신년·추석 등 — 목록에만 표시, ‘최신 선교편지’에서 제외</p>}
          {formError && <p className={errorCls}>{formError}</p>}
          <div className="flex gap-2">
            <button type="button" disabled={saving} onClick={addLetter} className={saveBtn}>
              {saving ? '저장 중…' : '저장'}
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setAdding(false);
              }}
              className={toolBtn}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {letters.length === 0 ? (
        <p className="text-[12px] text-b27-muted">아직 등록된 편지가 없습니다.</p>
      ) : (
        <ul>
          {letters.map((l, i) => {
            const month = letterMonthLabel(l.year_month);
            const open = openId === l.id;
            return (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpenId(open ? null : l.id);
                    setPickerFor(null);
                  }}
                  aria-expanded={open}
                  className={rowCls}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center">
                      {l.number && (
                        <span className="mr-1.5 shrink-0 rounded-full bg-b27-tint-5 px-[7px] py-px font-num text-[11px] font-medium text-[#4E39C6]">
                          {l.number}
                        </span>
                      )}
                      <span className="truncate text-[14px] text-b27-ink">{l.title}</span>
                    </span>
                    <span className="mt-0.5 block truncate font-num text-[11.5px] text-b27-muted">
                      {fileLine(l)}
                      {month ? ` · ${month}` : ''}
                    </span>
                  </span>
                  {summarySavedId === l.id && <span className="shrink-0 text-[11px] text-[#226C5A]">저장됨</span>}
                  {l.kind === 'card' ? (
                    <span className="shrink-0 rounded-full bg-b27-tint-6 px-2 py-0.5 text-[11px] text-[#65060F]">카드</span>
                  ) : null}
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${
                      l.public_view ? 'bg-b27-tint-4 text-[#226C5A]' : 'bg-b27-card text-b27-muted'
                    }`}
                  >
                    {l.public_view ? '공개' : '비공개'}
                  </span>
                </button>

                {open && (
                  <div className={panelCls}>
                    {summaryEditId === l.id ? (
                      <>
                        {renderSummaryField(l.id, summaryDraft, setSummaryDraft, '요약 기도문 · 공개 ‘최신 선교편지’ 옆 (최신호만 권장)')}
                        <div className="flex gap-1.5">
                          <button type="button" disabled={summarySaving} onClick={() => saveSummary(l)} className={saveBtn}>
                            {summarySaving ? '저장 중…' : '요약 저장'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSummaryEditId(null);
                              setSummaryDraft('');
                              setPickerFor(null);
                            }}
                            className={toolBtn}
                          >
                            취소
                          </button>
                        </div>
                      </>
                    ) : (
                      l.summary && (
                        <p className="line-clamp-3 whitespace-pre-line text-[12.5px] leading-relaxed text-b27-ink">{l.summary}</p>
                      )
                    )}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {summaryEditId !== l.id && (
                        <button type="button" onClick={() => openSummaryEdit(l)} className={toolBtn}>
                          {l.summary ? '요약 수정' : '＋ 요약 기도문'}
                        </button>
                      )}
                      <button type="button" onClick={() => togglePublic(l)} className={toolBtn}>
                        {l.public_view ? '비공개로' : '공개로'}
                      </button>
                      <button type="button" onClick={() => copyUrl(l)} className={toolBtn}>
                        {copiedId === l.id ? '복사됨' : '링크 복사'}
                      </button>
                      <span className="flex-1" />
                      <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className={toolBtn} aria-label="위로">
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => move(i, 1)}
                        disabled={i === letters.length - 1}
                        className={toolBtn}
                        aria-label="아래로"
                      >
                        ↓
                      </button>
                      <button type="button" onClick={() => removeLetter(l)} className={delBtn}>
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
    </div>
  );
}
