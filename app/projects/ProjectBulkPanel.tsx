// MFH-PROJECT-BULK-PANEL-V1
// 넓은 화면(min-width:740px) 마스터-디테일 우측 패널 — 프로젝트 일괄변경.
// 액션: 사역분류 · 상태 · 중요도 · 삭제.
// 프로젝트엔 완료 컬럼이 없음 → 상태에 'done' 으로 묶임. 별도 '완료' 액션 없음.
import { STATUSES, type StatusValue } from '@/lib/constants'

type Props = {
  count: number
  busy: boolean
  categoryOpts: string[]
  importanceOpts: number[]
  onStatus: (s: StatusValue) => void
  onImportance: (n: number) => void
  onCategory: (c: string | null) => void
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

export default function ProjectBulkPanel({
  count,
  busy,
  categoryOpts,
  importanceOpts,
  onStatus,
  onImportance,
  onCategory,
  onDelete,
}: Props) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold text-primary">{count}개 선택됨</h2>
        <span className="text-xs text-faint">일괄 변경</span>
      </div>

      <div className="divide-y divide-line border-y border-line">
        <Field label="상태">
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <Btn key={s.value} onClick={() => onStatus(s.value)} disabled={busy}>
                {s.label}
              </Btn>
            ))}
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
