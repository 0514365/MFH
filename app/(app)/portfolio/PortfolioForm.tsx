'use client';
// MFH-PORTFOLIO-FORM-V4
// 포트폴리오 편집 셸 + 본문 폼.
// 상단 고정 헤더(sticky): 저장(이 폼 upsert) + 공개 ON/OFF 토글 + 공개페이지 링크.
// 본문 그룹(접이식): ① 기본정보(외부링크 통합) ② 부부·선교사 소개 / 후원 안내.
// children = 연혁·편지·영상 섹션(각자 저장) → 폼 아래에 렌더.
// V2: 부부사진+개요(patch63). V3: 후원 안내(donation_info, patch68).
// V4: 셸 개편 — 저장/공개설정 헤더 고정, 중간 저장 버튼 제거, 선교사 개별 사진 입력 제거, 그룹 접이식.

import { useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import {
  type Portfolio,
  type PortfolioFormState,
  emptyPortfolioForm,
  portfolioToForm,
} from '@/lib/portfolio';
import PortfolioPhotoUpload from '@/components/PortfolioPhotoUpload';
import AccordionSection from './AccordionSection';

const FORM_ID = 'portfolio-main-form';

type Props = {
  initial: Portfolio | null;
  userId: string;
  children?: ReactNode;
};

export default function PortfolioForm({ initial, userId, children }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [form, setForm] = useState<PortfolioFormState>(
    initial ? portfolioToForm(initial) : emptyPortfolioForm(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof PortfolioFormState>(key: K, value: PortfolioFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function bindText(key: keyof PortfolioFormState) {
    return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update(key, e.target.value as PortfolioFormState[typeof key]);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const trimmedSlug = form.slug.trim();
    if (!trimmedSlug) {
      setError('slug 는 비울 수 없습니다.');
      setSaving(false);
      return;
    }
    if (!/^[a-z0-9-]+$/.test(trimmedSlug)) {
      setError('slug 는 영문 소문자·숫자·하이픈만 가능합니다.');
      setSaving(false);
      return;
    }

    const payload = {
      user_id: userId,
      slug: trimmedSlug,
      hero_image_url: form.hero_image_url || null,
      intro_text: form.intro_text || null,
      email_public: form.email_public || null,
      facebook_url: form.facebook_url || null,
      youtube_url: form.youtube_url || null,
      intro_video_url: form.intro_video_url || null,
      couple_photo_url: form.couple_photo_url || null,
      couple_intro: form.couple_intro || null,
      missionary_a_name: form.missionary_a_name || null,
      missionary_a_photo_url: form.missionary_a_photo_url || null,
      missionary_a_bio: form.missionary_a_bio || null,
      missionary_b_name: form.missionary_b_name || null,
      missionary_b_photo_url: form.missionary_b_photo_url || null,
      missionary_b_bio: form.missionary_b_bio || null,
      donation_info: form.donation_info || null,
      is_public: form.is_public,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from('portfolio')
      .upsert(payload, { onConflict: 'user_id' });

    setSaving(false);

    if (upsertError) {
      setError(upsertError.message);
      return;
    }

    setSaved(true);
    router.refresh();
  }

  const publicHref = form.is_public && form.slug.trim() ? `/p/${form.slug.trim()}` : null;

  return (
    <div>
      {/* 고정 헤더 */}
      <div className="sticky top-0 z-30 -mx-4 mb-4 flex items-center gap-2 border-b border-line bg-paper px-4 py-2.5 shadow-sm">
        <h1 className="min-w-0 truncate text-sm font-semibold text-primary">포트폴리오 편집</h1>
        <div className="ml-auto flex flex-shrink-0 items-center gap-2">
          <span className="text-[11px]">
            {error ? (
              <span className="text-danger">{error}</span>
            ) : saved ? (
              <span className="text-primary">저장됨</span>
            ) : null}
          </span>
          <button
            type="button"
            onClick={() => update('is_public', !form.is_public)}
            aria-pressed={form.is_public}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
              form.is_public
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-line bg-surface text-muted'
            }`}
          >
            {form.is_public ? '공개 ON' : '공개 OFF'}
          </button>
          {publicHref && (
            <a
              href={publicHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="공개 페이지 보기"
              className="flex-shrink-0 rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-soft"
            >
              <span className="min-[480px]:hidden">페이지 ↗</span>
              <span className="hidden min-[480px]:inline">공개 페이지 ↗</span>
            </a>
          )}
          <button
            type="submit"
            form={FORM_ID}
            disabled={saving}
            className="rounded-md px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>

      {/* 본문 폼: ① 기본정보(외부링크 통합) ② 부부·선교사·후원 */}
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4">
        {/* ① 기본 정보 */}
        <AccordionSection title="기본 정보" defaultOpen>
          <Field label="공개 URL slug">
            <input
              type="text"
              value={form.slug}
              onChange={bindText('slug')}
              placeholder="mfh"
              className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-faint">공개 URL: /p/{form.slug || '...'}</p>
          </Field>

          <Field label="히어로 이미지">
            <PortfolioPhotoUpload
              userId={userId}
              kind="hero"
              value={form.hero_image_url}
              onChange={(url) => update('hero_image_url', url)}
            />
          </Field>

          <Field label="소개 문단">
            <textarea
              value={form.intro_text}
              onChange={bindText('intro_text')}
              rows={3}
              placeholder="2016년부터 중미 온두라스에서..."
              className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </Field>

          <Field label="공개 이메일">
            <input
              type="email"
              value={form.email_public}
              onChange={bindText('email_public')}
              placeholder="honduras0691@gmail.com"
              className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </Field>

          {/* 외부 링크 (기본 정보에 통합) */}
          <div className="mt-4 border-t border-line pt-4">
            <h3 className="mb-3 text-xs font-semibold text-primary">외부 링크</h3>

            <Field label="사역소개 영상 (YouTube)">
              <input
                type="url"
                value={form.intro_video_url}
                onChange={bindText('intro_video_url')}
                placeholder="https://youtu.be/-dEzFmX-mZY"
                className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </Field>

            <Field label="YouTube 채널">
              <input
                type="url"
                value={form.youtube_url}
                onChange={bindText('youtube_url')}
                placeholder="https://www.youtube.com/@..."
                className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </Field>

            <Field label="Facebook">
              <input
                type="url"
                value={form.facebook_url}
                onChange={bindText('facebook_url')}
                placeholder="https://www.facebook.com/groups/..."
                className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </Field>
          </div>
        </AccordionSection>

        {/* ② 부부·선교사 소개 / 후원 안내 */}
        <AccordionSection title="부부·선교사 소개 / 후원 안내">
          {/* 부부 소개 */}
          <h3 className="text-xs font-semibold text-primary">부부 소개 (접힘 상태 표시)</h3>
          <p className="mb-3 mt-1 text-[11px] text-faint">
            공개 페이지의 선교사 소개는 기본 접힘 — 부부사진과 개요가 먼저 보이고, “약력 보기”를 누르면
            선교사 ①·② 약력이 펼쳐집니다.
          </p>

          <Field label="부부 사진">
            <PortfolioPhotoUpload
              userId={userId}
              kind="couple"
              value={form.couple_photo_url}
              onChange={(url) => update('couple_photo_url', url)}
            />
          </Field>

          <Field label="부부 소개 개요 (짧게)">
            <textarea
              value={form.couple_intro}
              onChange={bindText('couple_intro')}
              rows={3}
              placeholder="2016년부터 온두라스에서 함께 섬기는 김우진·서진아 선교사 부부입니다."
              className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </Field>

          {/* 선교사 ① */}
          <div className="mt-4 border-t border-line pt-4">
            <h3 className="mb-3 text-xs font-semibold text-primary">선교사 ① (위에 표시)</h3>
            <Field label="이름">
              <input
                type="text"
                value={form.missionary_a_name}
                onChange={bindText('missionary_a_name')}
                placeholder="김우진 선교사"
                className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </Field>
            <Field label="약력 (줄바꿈으로 구분)">
              <textarea
                value={form.missionary_a_bio}
                onChange={bindText('missionary_a_bio')}
                rows={5}
                placeholder="명지대학교 영어영문학과 졸업 (2005)&#10;..."
                className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </Field>
          </div>

          {/* 선교사 ② */}
          <div className="mt-4 border-t border-line pt-4">
            <h3 className="mb-3 text-xs font-semibold text-primary">선교사 ② (아래에 표시)</h3>
            <Field label="이름">
              <input
                type="text"
                value={form.missionary_b_name}
                onChange={bindText('missionary_b_name')}
                placeholder="서진아 선교사"
                className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </Field>
            <Field label="약력 (줄바꿈으로 구분)">
              <textarea
                value={form.missionary_b_bio}
                onChange={bindText('missionary_b_bio')}
                rows={6}
                className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </Field>
          </div>

          {/* 후원 안내 */}
          <div className="mt-4 border-t border-line pt-4">
            <h3 className="text-xs font-semibold text-primary">후원 안내</h3>
            <p className="mb-3 mt-1 text-[11px] text-faint">
              공개 페이지 맨 아래 “후원방법”에 표시됩니다. 비워 두면 표시되지 않습니다.
            </p>
            <Field label="후원 계좌 / 안내">
              <textarea
                value={form.donation_info}
                onChange={bindText('donation_info')}
                rows={2}
                placeholder="우리은행 1002-349-524757 (김우진)"
                className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </Field>
          </div>
        </AccordionSection>
      </form>

      {/* ④ 연혁 · ⑤ 편지 · ⑥ 영상 (각자 저장) */}
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 last:mb-0">
      <label className="mb-1 block text-xs font-medium text-muted">{label}</label>
      {children}
    </div>
  );
}
