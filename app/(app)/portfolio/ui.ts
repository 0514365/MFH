// MFH-PORTFOLIO-UI-V1 — 2027(4-8): 포트폴리오 편집 공용 클래스. 모듈 고정색 5 라벤더(틴트 #F1EFFA · 진한 톤 #4E39C6).
// 입력 = 연회색 면(테두리 없음) · 행동(추가) = 터키석 알약 · 저장 = 남색 알약 · 도구 = 흰 알약 · 삭제 = 연한 빨강 면.
// ⚠️ 정적 전체 문자열만(JIT 감지).

export const inputCls =
  'w-full rounded-xl bg-b27-card px-3.5 py-2.5 text-sm text-b27-ink outline-none placeholder:text-b27-muted focus:ring-2 focus:ring-b27-ink/15'
// 연회색 패널(펼친 행) 안의 입력 = 흰 면
export const inputOnCardCls =
  'w-full rounded-xl bg-b27-paper px-3.5 py-2.5 text-sm text-b27-ink outline-none placeholder:text-b27-muted focus:ring-2 focus:ring-b27-ink/15'

export const labelCls = 'mb-1.5 block font-num text-[12px] font-medium text-b27-muted'
export const hintCls = 'mt-1.5 text-[11px] text-b27-muted'
export const errorCls = 'text-[12px] text-b27-expense'

export const actBtn =
  'rounded-full bg-b27-plus px-3.5 py-1.5 text-[12.5px] font-medium text-white transition active:opacity-80 disabled:opacity-50'
export const saveBtn =
  'rounded-full bg-b27-ink px-3.5 py-1.5 text-[12.5px] font-medium text-white transition active:opacity-80 disabled:opacity-50'
export const toolBtn =
  'rounded-full bg-b27-paper px-3 py-1.5 text-[12px] text-b27-ink transition active:opacity-70 disabled:opacity-30'
export const delBtn =
  'rounded-full bg-b27-expense-soft px-3 py-1.5 text-[12px] text-b27-expense transition active:opacity-70 disabled:opacity-30'

// 펼친 행 패널 = 연회색 면
export const panelCls = 'mb-2 mt-0.5 flex flex-col gap-2.5 rounded-2xl bg-b27-card p-3'
// 2줄 행
export const rowCls =
  'flex w-full items-center gap-2.5 border-b border-b27-line px-0.5 py-2.5 text-left last:border-b-0 active:opacity-70'

export const LAVENDER_BLOCK = '#CFCAED'
export const LAVENDER_DEEP = '#4E39C6'
