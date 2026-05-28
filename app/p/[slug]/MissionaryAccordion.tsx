'use client';
// MFH-PORTFOLIO-MISSIONARY-ACCORDION-V1
// 선교사 소개 접이식. 서버부모(PortfolioView)가 데이터를 props 로 주입하는 클라이언트 자식.
// 접힘(기본): 부부사진 1장 + 짧은 개요(coupleIntro) + "약력 보기 ▾"
// 펼침: 선교사 ①·② 각 이름 + 약력(bio), 개인 사진 있으면 작게 곁들임.
// fallback: 부부사진 없으면 placeholder, coupleIntro 없으면 이름 라인으로 대체.

import { useState } from 'react';

type Person = {
  name: string | null;
  photoUrl: string | null;
  bio: string | null;
};

type Props = {
  couplePhotoUrl: string | null;
  coupleIntro: string | null;
  a: Person;
  b: Person;
};

export default function MissionaryAccordion({ couplePhotoUrl, coupleIntro, a, b }: Props) {
  const [open, setOpen] = useState(false);

  const names = [a.name, b.name].filter(Boolean).join(' · ');
  const overview = coupleIntro || names || null;
  const hasBio = Boolean((a.name && a.bio) || (b.name && b.bio) || a.name || b.name);

  return (
    <div className="rounded-md border border-line bg-surface p-3">
      {/* 접힘 헤더: 부부사진 + 개요 */}
      <div className="flex gap-3">
        {couplePhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={couplePhotoUrl}
            alt={names || '선교사 부부'}
            className="h-[84px] w-[84px] flex-shrink-0 rounded-md object-cover min-[1100px]:h-[96px] min-[1100px]:w-[96px]"
          />
        ) : (
          <div
            className="flex h-[84px] w-[84px] flex-shrink-0 items-center justify-center rounded-md text-[10px] text-muted min-[1100px]:h-[96px] min-[1100px]:w-[96px]"
            style={{ background: 'var(--primary-soft)' }}
          >
            사진
          </div>
        )}
        <div className="min-w-0 flex-1">
          {names && <p className="text-sm font-medium text-primary">{names}</p>}
          {overview && (
            <p className="mt-1 whitespace-pre-line text-[11px] leading-relaxed text-muted">
              {overview}
            </p>
          )}
        </div>
      </div>

      {/* 약력 보기 토글 */}
      {hasBio && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-md border border-line bg-surface-subtle py-1.5 text-[11px] font-medium text-primary hover:border-primary"
        >
          {open ? '약력 접기' : '약력 보기'}
          <span aria-hidden className={`transition-transform ${open ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </button>
      )}

      {/* 펼침: 각 인물 약력 */}
      {open && (
        <div className="mt-3 space-y-2 border-t border-line pt-3">
          {a.name && <PersonBlock person={a} />}
          {b.name && <PersonBlock person={b} />}
        </div>
      )}
    </div>
  );
}

function PersonBlock({ person }: { person: Person }) {
  return (
    <div className="flex gap-3">
      {person.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={person.photoUrl}
          alt={person.name ?? ''}
          className="h-[60px] w-[50px] flex-shrink-0 rounded-md object-cover"
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-primary">{person.name}</p>
        {person.bio && (
          <p className="mt-1 whitespace-pre-line text-[11px] leading-relaxed text-muted">
            {person.bio}
          </p>
        )}
      </div>
    </div>
  );
}
