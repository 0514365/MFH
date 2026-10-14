'use client'

// MFH-TASK-BULK-PANEL-V3
// 넓은 화면(min-width:740px) 마스터-디테일 우측 패널.
// selectMode 진입 시 TaskSummary 대신 표시. 같은 액션(분류/장소/Status/중요도/완료/삭제)을
// 좁은화면 SelectionBar 와 동일하게 노출.
import { useState } from 'react'
import { STATUSES, type StatusValue } from '@/lib/constants'

type Props = {
  count: number
  busy: boolean
  categoryOpts: string[]
  importanceOpts: number[]
  placeOpts: string[]
  onStatus: (s: StatusValue) => void
  onImportance: (n: number) => void
  onCategory: (c: string | null) => void
  onPlace: (p: string | null) => void
  onDoneToggle: (done: boolean) => void
  onDuplicate: () => void
  onDelete: () => void
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex gap-3 py-2.5">
    <span className="w-16 shrink-0 pt-1 text-xs font-semibold text-faint">{label}</span>
    <div className="min-w-0 flex-1">{children}</div>
  </div>
)

const Btn = ({
  onClick,
  disabled,
  children,
  tone = 'default',
}: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
  tone?: 'default' | 'danger'
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
      tone === 'danger'
        ? 'border-accent text-accent hover:bg-accent-soft'
        : 'border-line text-muted hover:border-primary'
    }`}
  >
    {children}
  </button>
)

export default function TaskBulkPanel({
  count,
  busy,
  categoryOpts,
  importanceOpts,
  placeOpts,
  onStatus,
  onImportance,
  onCategory,
  onPlace,
  onDoneToggle,
  onDuplicate,
  onDelete,
}: Props) {
  const [placeInput, setPlaceInput] = useState('')
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold text-primary">{count}개 선택됨</h2>
        <span className="text-xs text-faint">일괄 변경</span>
      </div>

      <div className="divide-y divide-line border-y border-line">
        <Field label="복제">
          <Btn onClick={onDuplicate} disabled={busy}>
            선택 항목 복제
          </Btn>
        </Field>

        <Field label="상태">
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <Btn key={s.value} onClick={() => onStatus(s.value)} disabled={busy}>
                {s.label}
              </Btn>
            ))}
          </div>
        </Field>

        <Field label="완료">
          <div className="flex flex-wrap gap-1.5">
            <Btn onClick={() => onDoneToggle(true)} disabled={busy}>
              완료
            </Btn>
            <Btn onClick={() => onDoneToggle(false)} disabled={busy}>
              미완료
            </Btn>
          </div>
        </Field>

        {importanceOpts.length > 0 && (
          <Field label="중요도">
            <div className="flex flex-wrap gap-1.5">
              {importanceOpts.map((n) => (
                <Btn key={n} onClick={() => onImportance(n)} disabled={busy}>
                  {'★'.repeat(n)}
                </Btn>
              ))}
            </div>
          </Field>
        )}

        {categoryOpts.length > 0 && (
          <Field label="분류">
            <div className="flex flex-wrap gap-1.5">
              {categoryOpts.map((c) => (
                <Btn key={c} onClick={() => onCategory(c)} disabled={busy}>
                  {c}
                </Btn>
              ))}
              <Btn onClick={() => onCategory(null)} disabled={busy}>
                분류 제거
              </Btn>
            </div>
          </Field>
        )}

        <Field label="장소">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <input
                value={placeInput}
                onChange={(e) => setPlaceInput(e.target.value)}
                placeholder="장소 입력"
                className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs outline-none focus:border-primary"
              />
              <Btn
                onClick={() => {
                  const v = placeInput.trim()
                  if (!v) return
                  setPlaceInput('')
                  onPlace(v)
                }}
                disabled={busy || !placeInput.trim()}
              >
                설정
              </Btn>
            </div>
            {placeOpts.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {placeOpts.map((p) => (
                  <Btn key={p} onClick={() => onPlace(p)} disabled={busy}>
                    {p}
                  </Btn>
                ))}
              </div>
            )}
            <Btn onClick={() => onPlace(null)} disabled={busy}>
              장소 제거
            </Btn>
          </div>
        </Field>

        <Field label="삭제">
          <Btn onClick={onDelete} disabled={busy} tone="danger">
            선택 항목 삭제
          </Btn>
        </Field>
      </div>

      {busy && <p className="mt-3 text-xs text-faint">변경 중...</p>}
    </div>
  )
}
