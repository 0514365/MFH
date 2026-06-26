'use client'
// MFH-ACCOUNTING-CSV-IMPORT-V1
// 수입·지출 CSV 일괄 입력 — 붙여넣기/파일 업로드 → 매핑·검증 미리보기 → 유효행 일괄 저장(노션).
import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { AcctOptions } from '@/lib/notion'
import { mapCsvRows } from '@/lib/accounting-csv'
import { bulkCreateInout } from './actions'

const PLACEHOLDER = `구분,날짜,항목,이름,통화,금액,환율,계좌
수입,2026-06-23,후원금,이경재,KRW,100000,1400,우리은행
지출,2026-06-26,사역비,교통비,USD,50,,Ficohsa(달러)`

export default function CsvImport({ options }: { options: AcctOptions }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const parsed = useMemo(() => (text.trim() ? mapCsvRows(text, options) : null), [text, options])

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      setText(String(reader.result ?? ''))
      setResult('')
    }
    reader.readAsText(f)
  }

  async function onSave() {
    if (!parsed) return
    const items = parsed.rows.filter((r) => r.ok && r.input).map((r) => r.input!)
    if (!items.length) return
    setSaving(true)
    setResult('')
    const res = await bulkCreateInout(items)
    setSaving(false)
    if (res.done > 0) {
      setText('')
      if (fileRef.current) fileRef.current.value = ''
      router.refresh()
    }
    setResult(
      res.done > 0
        ? `${res.done}건 저장 완료${res.ok ? '' : ` · ${items.length - res.done}건 실패: ${res.error ?? ''}`}`
        : `저장 실패: ${res.error ?? ''}`,
    )
  }

  if (!open) {
    return (
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-medium text-muted transition hover:border-primary hover:text-primary"
        >
          CSV 일괄입력
        </button>
      </div>
    )
  }

  return (
    <section className="mb-4 rounded-2xl border border-line bg-surface p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-display text-[9px] font-bold uppercase tracking-[0.15em] text-accent">
          CSV 일괄입력
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setText('')
            setResult('')
          }}
          className="rounded-full border border-line px-3 py-1 text-[11px] font-medium text-muted transition hover:border-primary"
        >
          닫기
        </button>
      </div>

      <p className="mb-2 text-xs leading-relaxed text-faint">
        첫 줄 머리글 필수(순서 무관):{' '}
        <span className="text-muted">구분 · 날짜 · 항목 · 이름 · 통화 · 금액 · 환율 · 계좌</span>. 엑셀·구글시트에서
        복사해 붙여넣거나 .csv 파일을 올리세요. 환산 USD 는 자동, 계좌를 비우면 통화 기본계좌로 들어갑니다.
      </p>

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setResult('')
        }}
        placeholder={PLACEHOLDER}
        rows={5}
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-xs text-ink outline-none transition focus:border-primary"
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.tsv,.txt,text/csv"
          onChange={onFile}
          className="block max-w-[230px] text-xs text-muted file:mr-2 file:rounded-lg file:border file:border-line file:bg-surface-subtle file:px-2.5 file:py-1 file:text-xs file:text-ink"
        />
        {parsed && (
          <span className="ml-auto text-xs text-muted">
            유효 <b className="text-emerald-700">{parsed.validCount}</b>
            {parsed.errorCount > 0 && (
              <>
                {' · '}오류 <b className="text-accent">{parsed.errorCount}</b>
              </>
            )}
          </span>
        )}
      </div>

      {parsed && !parsed.headerFound && (
        <p className="mt-3 rounded-lg border border-accent/30 bg-accent-soft px-3 py-2 text-xs text-accent">
          머리글(첫 줄)에서 컬럼을 인식하지 못했습니다. 구분·날짜·항목·통화·금액 머리글을 포함하세요.
        </p>
      )}

      {parsed && parsed.headerFound && parsed.rows.length > 0 && (
        <div className="mt-3 overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-line bg-surface-subtle text-center text-[11px] text-faint">
                <th className="px-2 py-1.5 font-medium">#</th>
                <th className="px-2 py-1.5 font-medium">구분</th>
                <th className="px-2 py-1.5 font-medium">날짜</th>
                <th className="px-2 py-1.5 font-medium">항목</th>
                <th className="px-2 py-1.5 font-medium">이름</th>
                <th className="px-2 py-1.5 font-medium">통화</th>
                <th className="px-2 py-1.5 text-right font-medium">금액</th>
                <th className="px-2 py-1.5 text-right font-medium">환율</th>
                <th className="px-2 py-1.5 text-right font-medium">환산$</th>
                <th className="px-2 py-1.5 font-medium">계좌</th>
                <th className="px-2 py-1.5 font-medium">상태</th>
              </tr>
            </thead>
            <tbody>
              {parsed.rows.map((r) => (
                <tr
                  key={r.line}
                  className={`border-t border-line ${r.ok ? '' : 'bg-accent-soft/40'}`}
                >
                  <td className="px-2 py-1.5 text-center text-faint">{r.line}</td>
                  <td className="px-2 py-1.5 text-center">{r.display.gubun}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-center text-muted">
                    {r.display.date}
                  </td>
                  <td className="px-2 py-1.5">{r.display.item}</td>
                  <td className="px-2 py-1.5">{r.display.name}</td>
                  <td className="px-2 py-1.5 text-center">{r.display.currency}</td>
                  <td className="px-2 py-1.5 text-right">{r.display.principal}</td>
                  <td className="px-2 py-1.5 text-right text-muted">{r.display.rate}</td>
                  <td className="px-2 py-1.5 text-right font-bold text-ink">{r.display.amountUsd}</td>
                  <td className="px-2 py-1.5 text-muted">{r.display.account}</td>
                  <td className="px-2 py-1.5">
                    {r.ok ? (
                      <span className="text-emerald-700">✓</span>
                    ) : (
                      <span className="text-accent">{r.errors.join(', ')}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !parsed || parsed.validCount === 0}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-40"
        >
          {saving ? '저장 중…' : parsed ? `유효 ${parsed.validCount}건 저장` : '저장'}
        </button>
        {result && <span className="text-xs font-medium text-muted">{result}</span>}
      </div>
    </section>
  )
}
