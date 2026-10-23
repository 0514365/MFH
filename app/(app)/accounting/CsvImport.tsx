'use client'
// MFH-ACCOUNTING-CSV-IMPORT-2027 — 회계 잔여 a: 연회색 면 + 타이틀 알약 · 흰 입력·표 · 저장 남색 · 유효 민트/오류 빨강
// MFH-ACCOUNTING-CSV-IMPORT-V1
// 수입·지출 CSV 일괄 입력 — 붙여넣기/파일 업로드 → 매핑·검증 미리보기 → 유효행 일괄 저장(acct_inout).
import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { AcctOptions } from '@/lib/accounting-types'
import { mapCsvRows } from '@/lib/accounting-csv'
import { bulkCreateInout } from './actions'

const PLACEHOLDER = `구분,날짜,항목,내용,통화,금액,환율,계좌
수입,2026-06-23,정기후원,이경재,KRW,100000,1400,우리은행(선교)_4757
지출,2026-06-26,건축,교회 증축,USD,500,,Ficohsa(달러)_4484`

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
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full bg-b27-card px-3.5 py-1.5 text-[12.5px] text-b27-ink transition active:opacity-70"
        >
          CSV 일괄입력
        </button>
      </div>
    )
  }

  return (
    <section className="mb-4 rounded-2xl bg-b27-card p-3.5 @2xl:p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-b27-paper px-3 py-1 text-[13px] font-medium text-b27-ink">
          <i className="inline-block h-2 w-2 rounded-[2px] bg-b27-block-2" aria-hidden="true" />
          CSV 일괄입력
        </span>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setText('')
            setResult('')
          }}
          className="rounded-full bg-b27-paper px-3 py-1 text-[12px] text-b27-ink transition active:opacity-70"
        >
          닫기
        </button>
      </div>

      <p className="mb-2 text-xs leading-relaxed text-b27-muted">
        첫 줄 머리글 필수(순서 무관):{' '}
        <span className="text-b27-ink">구분 · 날짜 · 항목 · 내용 · 통화 · 금액 · 환율 · 계좌</span>. 엑셀·구글시트에서
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
        className="w-full rounded-xl bg-b27-paper px-3 py-2 font-mono text-xs text-b27-ink outline-none transition focus:ring-2 focus:ring-b27-ink/15"
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.tsv,.txt,text/csv"
          onChange={onFile}
          className="block max-w-[230px] text-xs text-b27-muted file:mr-2 file:rounded-full file:border-0 file:bg-b27-paper file:px-3 file:py-1 file:text-xs file:text-b27-ink"
        />
        {parsed && (
          <span className="ml-auto font-num text-xs text-b27-muted">
            유효 <b className="font-semibold text-[#226C5A]">{parsed.validCount}</b>
            {parsed.errorCount > 0 && (
              <>
                {' · '}오류 <b className="font-semibold text-b27-expense">{parsed.errorCount}</b>
              </>
            )}
          </span>
        )}
      </div>

      {parsed && !parsed.headerFound && (
        <p className="mt-3 rounded-xl bg-b27-expense-soft px-3 py-2 text-xs text-b27-expense">
          머리글(첫 줄)에서 컬럼을 인식하지 못했습니다. 구분·날짜·항목·통화·금액 머리글을 포함하세요.
        </p>
      )}

      {parsed && parsed.headerFound && parsed.rows.length > 0 && (
        <div className="mt-3 overflow-x-auto rounded-xl bg-b27-paper">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-b27-line text-center font-num text-[11px] text-b27-muted">
                <th className="px-2 py-1.5 font-medium">#</th>
                <th className="px-2 py-1.5 font-medium">구분</th>
                <th className="px-2 py-1.5 font-medium">날짜</th>
                <th className="px-2 py-1.5 font-medium">항목</th>
                <th className="px-2 py-1.5 font-medium">내용</th>
                <th className="px-2 py-1.5 font-medium">후원자</th>
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
                  className={`border-t border-b27-line ${r.ok ? '' : 'bg-b27-expense-soft/50'}`}
                >
                  <td className="px-2 py-1.5 text-center text-b27-muted">{r.line}</td>
                  <td className="px-2 py-1.5 text-center">{r.display.gubun}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-center text-b27-muted">
                    {r.display.date}
                  </td>
                  <td className="px-2 py-1.5">{r.display.item}</td>
                  <td className="px-2 py-1.5">{r.display.name}</td>
                  <td className="px-2 py-1.5 text-[#226C5A]">{r.display.supporter}</td>
                  <td className="px-2 py-1.5 text-center">{r.display.currency}</td>
                  <td className="px-2 py-1.5 text-right">{r.display.principal}</td>
                  <td className="px-2 py-1.5 text-right text-b27-muted">{r.display.rate}</td>
                  <td className="px-2 py-1.5 text-right font-num font-semibold text-b27-ink">{r.display.amountUsd}</td>
                  <td className="px-2 py-1.5 text-b27-muted">{r.display.account}</td>
                  <td className="px-2 py-1.5">
                    {r.ok ? (
                      <span className="text-[#226C5A]">✓</span>
                    ) : (
                      <span className="text-b27-expense">{r.errors.join(', ')}</span>
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
          className="rounded-full bg-b27-ink px-4 py-2 text-[13px] font-medium text-white transition active:opacity-80 disabled:opacity-40"
        >
          {saving ? '저장 중…' : parsed ? `유효 ${parsed.validCount}건 저장` : '저장'}
        </button>
        {result && <span className="text-xs font-medium text-b27-muted">{result}</span>}
      </div>
    </section>
  )
}
