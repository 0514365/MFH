// MFH-PORTFOLIO-MISSIONARY-DESKTOP-V2
// 데스크탑(≥1100) 전용 선교사 소개 레이아웃. 서버 컴포넌트(상태 없음).
// 좌: 부부 사진(우측 콘텐츠 높이에 맞춰 stretch). 우: 상단 요약 글상자(가로 전체) + 약력 2열(A | B).
// 모바일·태블릿(<1100)은 PortfolioView 가 MissionaryAccordion 을 대신 렌더한다.
// V2: 약력 2열을 동일폭으로(gap 제거 + 좌 pr-8 / 우 border-l pl-8 대칭) → 좌우 텍스트폭 일치.

type Person = {
  name: string | null;
  bio: string | null;
};

type Props = {
  couplePhotoUrl: string | null;
  coupleIntro: string | null;
  a: Person;
  b: Person;
};

export default function MissionaryDesktop({ couplePhotoUrl, coupleIntro, a, b }: Props) {
  const names = [a.name, b.name].filter(Boolean).join(' · ');

  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <div className="grid grid-cols-[340px_1fr] items-stretch gap-7">
        {/* 좌: 부부 사진 (우측 높이에 맞춰 stretch) */}
        <div className="min-h-[360px]">
          {couplePhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={couplePhotoUrl}
              alt={names || '선교사 부부'}
              className="h-full w-full rounded-lg object-cover"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center rounded-lg text-sm text-muted"
              style={{ background: 'var(--primary-soft)' }}
            >
              부부 사진
            </div>
          )}
        </div>

        {/* 우: 요약 글상자 + 약력 2열 */}
        <div className="min-w-0">
          {coupleIntro && (
            <div className="rounded-lg border border-line bg-surface-subtle p-4 text-[15px] leading-relaxed text-ink">
              {coupleIntro}
            </div>
          )}
          <div className="mt-5 grid grid-cols-2">
            <PersonCol person={a} className="pr-8" />
            <PersonCol person={b} className="border-l border-line pl-8" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PersonCol({ person, className = '' }: { person: Person; className?: string }) {
  if (!person.name && !person.bio) return <div className={className} />;
  return (
    <div className={className}>
      {person.name && <p className="text-base font-semibold text-primary">{person.name}</p>}
      {person.bio && (
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">{person.bio}</p>
      )}
    </div>
  );
}
