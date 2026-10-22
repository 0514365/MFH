// MFH-JOURNAL-BULK-PANEL-V2 — 2027(4-1): 남색 글자 · 연회색 면 · b27 선 · 굵기 600 이하 · 삭제 = 지출 빨강.
// MFH-JOURNAL-BULK-PANEL-V1
// 넓은 화면(min-width:740px) 마스터-디테일 우측 패널 — 일지 일괄변경.
// 액션: 사역분류 · 기도후보 · 연계 프로젝트 · 연계 할일.
// 연계 프로젝트/할일은 데이터 모델상 단일 FK 컬럼 → 변경 시 기존값 덮어씀(안내 표시).
type Props = {
  count: number
  busy: boolean
  categoryOpts: string[]
  projectOpts: { id: string; title: string }[]
  taskOpts: { id: string; title: string }[]
  onCategory: (c: string | null) => void
  onPrayerCandidate: (v: boolean) => void
  onProject: (id: string | null) => void
  onTask: (id: string | null) => void
  onDelete: () => void
}

const Field = ({
  label,
  note,
  children,
}: {
  label: string
  note?: string
  children: React.ReactNode
}) => (
  <div className="py-3">
    <div className="mb-1.5 flex items-baseline gap-2">
      <span className="text-xs font-semibold text-b27-muted">{label}</span>
      {note && <span className="text-[10px] text-b27-muted">{note}</span>}
    </div>
    <div className="min-w-0">{children}</div>
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
    className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
      tone === 'danger'
        ? 'border-transparent text-b27-expense hover:bg-b27-expense-soft'
        : 'border-b27-line text-b27-muted hover:border-b27-muted'
    }`}
  >
    {children}
  </button>
)

export default function JournalBulkPanel({
  count,
  busy,
  categoryOpts,
  projectOpts,
  taskOpts,
  onCategory,
  onPrayerCandidate,
  onProject,
  onTask,
  onDelete,
}: Props) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-b27-ink">{count}개 선택됨</h2>
        <span className="text-xs text-b27-muted">일괄 변경</span>
      </div>

      <div className="divide-y divide-line border-y border-b27-line">
        <Field label="기도후보">
          <div className="flex flex-wrap gap-1.5">
            <Btn onClick={() => onPrayerCandidate(true)} disabled={busy}>
              기도후보 ON
            </Btn>
            <Btn onClick={() => onPrayerCandidate(false)} disabled={busy}>
              기도후보 OFF
            </Btn>
          </div>
        </Field>

        {categoryOpts.length > 0 && (
          <Field label="사역분류">
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

        {projectOpts.length > 0 && (
          <Field label="연계 프로젝트" note="기존 연결 덮어씀">
            <div className="flex flex-wrap gap-1.5">
              {projectOpts.map((p) => (
                <Btn key={p.id} onClick={() => onProject(p.id)} disabled={busy}>
                  {p.title}
                </Btn>
              ))}
              <Btn onClick={() => onProject(null)} disabled={busy}>
                연결 없음
              </Btn>
            </div>
          </Field>
        )}

        {taskOpts.length > 0 && (
          <Field label="연계 할일" note="기존 연결 덮어씀 · 미완료만">
            <div className="flex flex-wrap gap-1.5">
              {taskOpts.map((t) => (
                <Btn key={t.id} onClick={() => onTask(t.id)} disabled={busy}>
                  {t.title}
                </Btn>
              ))}
              <Btn onClick={() => onTask(null)} disabled={busy}>
                연결 없음
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

      {busy && <p className="mt-3 text-xs text-b27-muted">변경 중...</p>}
    </div>
  )
}
