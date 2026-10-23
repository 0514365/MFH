'use client'
// MFH-ITEM-MANAGE-BUTTON-V2 — 2027(회계 잔여 b): 모달 = 흰 시트 + 닫기 알약 · 수입/지출 = 알약 세그먼트 · 저장 남색 · 버튼 = 연회색 알약 · ⚙ = 흰 원(폼 면 위)
// MFH-ITEM-MANAGE-BUTTON-V1
// 항목 관리 — 버튼(⚙ 또는 라벨) → 모달: 수입/지출 탭 · 대분류별 목록(이름·대분류 인라인 수정 · ▲▼ 순서 · 숨김) · 숨긴 항목(보이기).
// 숨김 = acct_items.is_active=false — 거래는 그대로, 입력 콤보에서만 빠진다. 순서는 구분 전체를 sort_order 로 재번호.
// 기록 폼(항목 라벨 옆)과 승인대기 상단에서 공용.
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AcctOption, AcctOptions } from '@/lib/accounting-types'
import { editItem, toggleItem, saveItemOrder } from './actions'

type G = '수입' | '지출'
const CAT_ORDER = ['후원', '헌금', '기타수입', '사역비', '생활비', '사역', '차량', '생활', '운영/행정']
const CUSTOM = '__custom__'
const ctl =
  'h-8 rounded-xl bg-b27-card px-2 text-[13px] text-b27-ink outline-none transition focus:ring-2 focus:ring-b27-ink/15'
const iconBtn =
  'inline-flex h-8 w-7 items-center justify-center rounded-full bg-b27-card text-[11px] text-b27-muted transition disabled:opacity-30'

function groupByCategory(items: AcctOption[]): [string, AcctOption[]][] {
  const map = new Map<string, AcctOption[]>()
  for (const it of items) {
    const c = it.category || '기타'
    if (!map.has(c)) map.set(c, [])
    map.get(c)!.push(it)
  }
  return [...map.entries()].sort(
    (a, b) => (CAT_ORDER.indexOf(a[0]) + 1 || 99) - (CAT_ORDER.indexOf(b[0]) + 1 || 99),
  )
}

type Draft = { name: string; cat: string; catCustom: string }

export default function ItemManageButton({
  options,
  initialGubun = '지출',
  label,
}: {
  options: AcctOptions
  initialGubun?: G
  label?: string // 미지정 = ⚙ 아이콘 버튼
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [gubun, setGubun] = useState<G>(initialGubun)
  // 화면 목록(낙관적 갱신용) — 서버 옵션이 바뀌면(refresh) 다시 맞춘다.
  const [lists, setLists] = useState<Record<G, AcctOption[]>>(options.items)
  useEffect(() => setLists(options.items), [options])
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const [showHidden, setShowHidden] = useState(false)

  const list = lists[gubun]
  const groups = useMemo(() => groupByCategory(list.filter((i) => i.active !== false)), [list])
  const hidden = useMemo(() => list.filter((i) => i.active === false), [list])
  const categories = useMemo(
    () => groupByCategory(list).map(([c]) => c).filter((c) => c !== '기타'),
    [list],
  )

  function openModal() {
    setGubun(initialGubun)
    setDrafts({})
    setErr('')
    setShowHidden(false)
    setOpen(true)
  }
  function close() {
    setOpen(false)
    setDrafts({})
    setErr('')
  }

  const draftOf = (i: AcctOption): Draft =>
    drafts[i.id] ?? { name: i.name, cat: i.category || CUSTOM, catCustom: '' }
  const setDraft = (i: AcctOption, patch: Partial<Draft>) =>
    setDrafts((d) => ({ ...d, [i.id]: { ...draftOf(i), ...patch } }))
  const isDirty = (i: AcctOption) => {
    const d = drafts[i.id]
    if (!d) return false
    const cat = d.cat === CUSTOM ? d.catCustom.trim() : d.cat
    return d.name.trim() !== i.name || cat !== (i.category ?? '')
  }

  async function onSave(i: AcctOption) {
    const d = draftOf(i)
    const category = d.cat === CUSTOM ? d.catCustom : d.cat
    setErr('')
    setBusy(i.id)
    const res = await editItem(i.id, { name: d.name, category })
    setBusy(null)
    if (!res.ok) return setErr(res.error ?? '저장 실패')
    setLists((l) => ({
      ...l,
      [gubun]: l[gubun].map((x) => (x.id === i.id ? { ...x, name: d.name.trim(), category: category.trim() } : x)),
    }))
    setDrafts((ds) => {
      const rest = { ...ds }
      delete rest[i.id]
      return rest
    })
    router.refresh()
  }

  async function onToggle(i: AcctOption, active: boolean) {
    setErr('')
    setBusy(i.id)
    const res = await toggleItem(i.id, active)
    setBusy(null)
    if (!res.ok) return setErr(res.error ?? '변경 실패')
    setLists((l) => ({ ...l, [gubun]: l[gubun].map((x) => (x.id === i.id ? { ...x, active } : x)) }))
    router.refresh()
  }

  // 같은 대분류 안에서 한 칸 이동 → 구분 전체 순서(보이는 그룹 순 → 숨긴 항목)를 저장.
  async function onMove(cat: string, idx: number, dir: -1 | 1) {
    const next = groups.map(([c, l]) => [c, [...l]] as [string, AcctOption[]])
    const g = next.find(([c]) => c === cat)
    if (!g) return
    const arr = g[1]
    const j = idx + dir
    if (j < 0 || j >= arr.length) return
    ;[arr[idx], arr[j]] = [arr[j], arr[idx]]
    const ordered = [...next.flatMap(([, l]) => l), ...hidden]
    setErr('')
    setBusy(arr[j].id)
    setLists((l) => ({ ...l, [gubun]: ordered }))
    const res = await saveItemOrder(ordered.map((x) => x.id))
    setBusy(null)
    if (!res.ok) {
      setErr(res.error ?? '순서 저장 실패')
      setLists(options.items)
      return
    }
    router.refresh()
  }

  return (
    <>
      {label ? (
        <button
          type="button"
          onClick={openModal}
          className="h-9 rounded-full bg-b27-card px-3 text-xs font-medium text-b27-muted transition"
        >
          {label}
        </button>
      ) : (
        <button
          type="button"
          onClick={openModal}
          aria-label="항목 관리"
          title="항목 관리"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-b27-paper text-[11px] leading-none text-b27-muted transition"
        >
          ⚙
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 @md:items-center"
          onClick={close}
        >
          <div
            className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-3xl bg-b27-paper p-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="항목 관리"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-num text-[16px] font-semibold text-b27-ink">항목 관리</h3>
              <button type="button" onClick={close} className="rounded-full bg-b27-card px-3 py-1 text-[12px] text-b27-ink transition active:opacity-70">
                닫기
              </button>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-1 rounded-full bg-b27-card p-[3px]">
              {(['지출', '수입'] as G[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    setGubun(g)
                    setDrafts({})
                    setErr('')
                  }}
                  className={`h-8 rounded-full text-xs font-medium transition ${
                    gubun === g ? 'bg-b27-ink text-white' : 'text-b27-muted'
                  }`}
                >
                  {g} {lists[g].filter((i) => i.active !== false).length}
                </button>
              ))}
            </div>

            {err && <p className="mb-2 text-xs font-medium text-b27-expense">{err}</p>}

            <div className="-mx-1 flex-1 overflow-y-auto px-1">
              {groups.map(([cat, items]) => (
                <section key={cat} className="mb-4">
                  <h4 className="mb-1.5 text-[11px] font-semibold text-b27-muted">
                    {cat} <span className="font-normal">{items.length}</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {items.map((i, idx) => {
                      const d = draftOf(i)
                      const dirty = isDirty(i)
                      const b = busy === i.id
                      return (
                        <li key={i.id} className="flex flex-wrap items-center gap-1">
                          <input
                            value={d.name}
                            onChange={(e) => setDraft(i, { name: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && dirty && onSave(i)}
                            className={`${ctl} min-w-0 flex-1`}
                            aria-label="항목 이름"
                          />
                          <select
                            value={d.cat}
                            onChange={(e) => setDraft(i, { cat: e.target.value })}
                            className={`${ctl} w-[92px]`}
                            aria-label="대분류"
                          >
                            {categories.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                            <option value={CUSTOM}>직접 입력…</option>
                          </select>
                          {dirty ? (
                            <button
                              type="button"
                              onClick={() => onSave(i)}
                              disabled={b}
                              className="h-8 rounded-full bg-b27-ink px-2.5 text-[11px] font-medium text-white disabled:opacity-40"
                            >
                              {b ? '…' : '저장'}
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => onMove(cat, idx, -1)}
                                disabled={!!busy || idx === 0}
                                className={iconBtn}
                                aria-label="위로"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                onClick={() => onMove(cat, idx, 1)}
                                disabled={!!busy || idx === items.length - 1}
                                className={iconBtn}
                                aria-label="아래로"
                              >
                                ▼
                              </button>
                              <button
                                type="button"
                                onClick={() => onToggle(i, false)}
                                disabled={!!busy}
                                className="h-8 rounded-full bg-b27-card px-2 text-[11px] text-b27-muted transition disabled:opacity-30"
                              >
                                숨김
                              </button>
                            </>
                          )}
                          {d.cat === CUSTOM && (
                            <input
                              value={d.catCustom}
                              onChange={(e) => setDraft(i, { catCustom: e.target.value })}
                              onKeyDown={(e) => e.key === 'Enter' && dirty && onSave(i)}
                              placeholder="새 대분류 이름"
                              className={`${ctl} w-full`}
                            />
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))}

              {hidden.length > 0 && (
                <section className="border-t border-b27-line pt-3">
                  <button
                    type="button"
                    onClick={() => setShowHidden((v) => !v)}
                    className="text-[11px] font-semibold text-b27-muted"
                  >
                    {showHidden ? '▾' : '▸'} 숨긴 항목 {hidden.length}
                  </button>
                  {showHidden && (
                    <ul className="mt-2 space-y-1.5">
                      {hidden.map((i) => (
                        <li key={i.id} className="flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate text-[13px] text-b27-muted">
                            {i.name}
                            <span className="ml-1.5 text-[11px] text-b27-muted">{i.category ?? '기타'}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => onToggle(i, true)}
                            disabled={!!busy}
                            className="h-8 shrink-0 rounded-full bg-b27-card px-2.5 text-[11px] text-b27-muted transition disabled:opacity-30"
                          >
                            {busy === i.id ? '…' : '보이기'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-b27-muted">
              이름·대분류를 바꾸면 과거 거래에도 그대로 반영됩니다. 숨긴 항목은 입력 목록에서만 빠지고 거래·집계는 유지됩니다.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
