// MFH-PORTFOLIO-MISSIONARY-TABLET-V1
// 태블릿(740~1099, iPad) 전용 선교사 소개 레이아웃. 서버 컴포넌트(상태 없음).
// 상단: 부부 사진(고정 정사각) + 이름·요약 글상자. 하단: 약력 2열(A | B).
// <740 은 MissionaryAccordion, ≥1100 은 MissionaryDesktop 을 PortfolioView 가 대신 렌더.

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

export default function MissionaryTablet({ couplePhotoUrl, coupleIntro, a, b }: Props) {
  const names = [a.name, b.name].filter(Boolean).join(' · ');
  const hasBio = Boolean((a.name || a.bio) || (b.name || b.bio));

  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      {/* 상단: 사진 + 이름·요약 */}
      <div className="flex items-start gap-5">
        {couplePhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={couplePhotoUrl}
            alt={names || '선교사 부부'}
            className="h-[200px] w-[200px] flex-shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div
            className="flex h-[200px] w-[200px] flex-shrink-0 items-center justify-center rounded-lg text-sm text-muted"
            style={{ background: 'var(--primary-soft)' }}
          >
            부부 사진
          </div>
        )}

        <div className="min-w-0 flex-1">
          {names && <p className="text-lg font-semibold text-primary">{names}</p>}
          {coupleIntro && (
            <div className="mt-2 rounded-lg border border-line bg-surface-subtle p-4 text-[15px] leading-relaxed text-ink">
              {coupleIntro}
            </div>
          )}
        </div>
      </div>

      {/* 하단: 약력 2열 */}
      {hasBio && (
        <div className="mt-5 grid grid-cols-2 border-t border-line pt-5">
          <PersonCol person={a} className="pr-6" />
          <PersonCol person={b} className="border-l border-line pl-6" />
        </div>
      )}
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
