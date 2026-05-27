// MFH-INSIGHT-PROMPT-V1
// 인사이트 생성용 system 프롬프트 빌더.
// - 선교 배경(에이전트 컨텍스트) + 기도제목 3원칙 가드레일 내장.
// - rating>=4 인 과거 인사이트를 few-shot 으로 주입(프롬프트 레벨 개인화 — 재학습 아님).
// 자동(API route)·수동(claude.ai 프로젝트 지침) 양쪽이 동일 문구를 쓰도록 export.

import type { InsightDomain } from './insightExport'
import { DOMAIN_LABEL } from './insightExport'

// 선교 배경 — MFH-CONTEXT '선교 배경/맥락' 요약(에이전트 컨텍스트).
export const MISSION_BACKGROUND = `당신은 온두라스 선교사 부부(김우진·서진아, 자녀 김겸손·김서진)의 사역 기록을 분석하는 보조자입니다.
단체는 Mission for Honduras, 2016년 2월 산페드로술라로 파송되었습니다.
주요 사역: Las Brisas 도시빈민 교회, Zapotal 더좋은교회 개척(어린이예배·방과후·건축), 한글학교(UNAH·ICAS), 동역자 Pastora Dunia.
기록은 일지(활동·감사·묵상·기도제목)·프로젝트(장단기 사역)·할 일(실무 Task)로 이루어집니다.`

// 기도제목 3원칙 — 변경 시 MFH-CONTEXT/핸드오프와 동기화.
export const PRAYER_GUARDRAILS = `[기도제목 3원칙 — 반드시 준수]
1) 온두라스 정치는 정당·인물을 거명하지 말고 항상 중립적으로만 언급한다.
2) 사역 관련 기도제목은 1~2개로 압축한다.
3) 선교사 가정의 평강·문제예방·사전축복에 비중을 둔다.`

// 도메인별 분석 관점(MFH-CONTEXT 모듈 사양 반영).
const DOMAIN_FOCUS: Record<InsightDomain, string> = {
  journal:
    '일지 분석은 반복되는 주제·깨달음·감정의 흐름, 사역과 신앙의 연결점을 짚는 데 집중합니다.',
  project:
    '프로젝트 분석은 리마인더 역할이 중심입니다. 진행 상황·마감 임박·중요도 높은 항목을 우선 짚고, 일지의 깨달음을 일부 반영합니다.',
  task:
    '할 일 분석은 리마인더 중심입니다. 오늘/이번 주 진행 상황과 꼭 마감해야 할 것에 집중해 간결히 정리합니다.',
  overall:
    '종합 분석은 일지·프로젝트·할 일을 연계해, 분야를 가로지르는 흐름과 우선순위, 격려가 될 통찰을 제시합니다.',
}

export const OUTPUT_FORMAT = `[출력 형식]
- 한국어로, 따뜻하고 격려하는 톤. 단정·과장 없이 기록에 근거해서만 씁니다.
- 3~5개의 굵은 소제목 + 각 2~4문장. 마지막에 "기도제목" 1~2개(3원칙 준수).
- 기록에 없는 사실을 지어내지 않습니다. 데이터가 부족하면 그 점을 솔직히 적습니다.`

export type FewShotExample = {
  domain: InsightDomain
  content: string
  rating: number | null
  feedback_note: string | null
}

// rating>=4 예시를 few-shot 으로 직렬화(없으면 빈 문자열).
export function buildFewShot(examples: FewShotExample[]): string {
  const good = examples.filter((e) => (e.rating ?? 0) >= 4 && e.content?.trim()).slice(0, 3)
  if (!good.length) return ''
  const blocks = good
    .map((e, i) => {
      const note = e.feedback_note?.trim() ? `\n(피드백 메모: ${e.feedback_note.trim()})` : ''
      return `# 선호 예시 ${i + 1} — ${DOMAIN_LABEL[e.domain]} (높은 평가)\n${e.content.trim()}${note}`
    })
    .join('\n\n')
  return `\n\n[사용자가 높이 평가한 과거 인사이트 — 이 톤·깊이·구성을 참고하되 내용은 새 데이터에 맞게 새로 작성]\n${blocks}`
}

// 최종 system 프롬프트.
export function buildSystemPrompt(domain: InsightDomain, fewShot: string): string {
  return [
    MISSION_BACKGROUND,
    '',
    `이번 작업: ${DOMAIN_LABEL[domain]}. ${DOMAIN_FOCUS[domain]}`,
    '',
    PRAYER_GUARDRAILS,
    '',
    OUTPUT_FORMAT,
    fewShot,
  ].join('\n')
}

// 수동 경로용: claude.ai 프로젝트 지침/첫 메시지에 붙여넣을 안내문(데이터는 사용자가 첨부).
export function buildManualInstruction(domain: InsightDomain): string {
  return [
    buildSystemPrompt(domain, ''),
    '',
    '[사용법] 아래(또는 첨부 파일)의 MFH 데이터를 위 기준으로 분석해 인사이트를 작성해 주세요.',
  ].join('\n')
}
