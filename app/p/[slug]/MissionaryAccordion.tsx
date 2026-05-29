'use client';
// MFH-PORTFOLIO-MISSIONARY-ACCORDION-V3
// 선교사 소개 접이식. 서버부모(PortfolioView)가 데이터를 props 로 주입하는 클라이언트 자식.
// 접힘(기본): 부부사진 1장 + 짧은 개요(coupleIntro) + "약력 보기 ▾"
// 펼침: 선교사 ①·② 각 이름 + 약력(bio). (사진 없음 — 약력 텍스트만)
// fallback: 부부사진 없으면 placeholder, coupleIntro 없으면 이름 라인으로 대체.
// V2: 펼침 약력에서 개인 사진 제거, 폰트 전반 상향(가독성).
// V3: 모바일/태블릿 부부사진 30% 확대(96→125px). 데스크탑 override 도 비례(112→146px, 접이식은 ≥1100 숨김).

import { useState } from 'react';

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

export default function MissionaryAccordion({ couplePhotoUrl, coupleIntro, a, b }: Props) {
  const [open, setOpen] = useState(false);

  const names = [a.name, b.name].filter(Boolean).join(' · ');
  const overview = coupleIntro || names || null;
  const hasBio = Boolean((a.name && a.bio) || (b.name && b.bio) || a.name || b.name);

  return (
    <div className="rounded-lg border border-line bg-surface p-4 min-[740px]:p-5">
      {/* 접힘 헤더: 부부사진 + 개요 */}
      <div className="flex gap-4">
        {couplePhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={couplePhotoUrl}
            alt={names || '선교사 부부'}
            className="h-[125px] w-[125px] flex-shrink-0 rounded-lg object-cover min-[1100px]:h-[146px] min-[1100px]:w-[146px]"
          />
        ) : (
          <div
            className="flex h-[125px] w-[125px] flex-shrink-0 items-center justify-center rounded-lg text-xs text-muted min-[1100px]:h-[146px] min-[1100px]:w-[146px]"
            style={{ background: 'var(--primary-soft)' }}
          >
            사진
          </div>
        )}
        <div className="min-w-0 flex-1">
          {names && <p className="text-base font-semibold text-primary min-[740px]:text-lg">{names}</p>}
          {overview && (
            <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-muted">
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
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-surface-subtle py-2.5 text-sm font-medium text-primary transition hover:border-primary"
        >
          {open ? '약력 접기' : '약력 보기'}
          <span aria-hidden className={`transition-transform ${open ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </button>
      )}

      {/* 펼침: 각 인물 약력 (사진 없음) */}
      {open && (
        <div className="mt-4 space-y-4 border-t border-line pt-4">
          {a.name && <PersonBlock person={a} />}
          {b.name && <PersonBlock person={b} />}
        </div>
      )}
    </div>
  );
}

function PersonBlock({ person }: { person: Person }) {
  return (
    <div>
      <p className="text-base font-semibold text-primary">{person.name}</p>
      {person.bio && (
        <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-muted">
          {person.bio}
        </p>
      )}
    </div>
  );
}
