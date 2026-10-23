'use client';
// MFH-PORTFOLIO-FORM-V5 — 2027(4-8): 52px 흰 헤더(Manrope 제목 · [공개|비공개] 알약 세그먼트 · 남색 저장 알약) + 라벤더 상태 줄 · 입력 = 연회색 면 · 묶음 머리 = 라벤더 8px 사각형.
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
import { inputCls, labelCls, hintCls, LAVENDER_BLOCK, LAVENDER_DEEP } from './ui';

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

  const slug = form.slug.trim();
  const publicHref = form.is_public && slug ? `/p/${slug}` : null;

  return (
    <div>
      {/* 고정 헤더 — 제목 · 공개 세그먼트 · 저장 */}
      <div className="sticky top-0 z-30 -mx-4 flex h-[52px] items-center gap-2 bg-b27-paper pl-4 pr-3">
        <h1 className="min-w-0 flex-1 truncate font-num text-[17px] font-semibold leading-none text-b27-ink">포트폴리오</h1>
        <div role="group" aria-label="공개 설정" className="flex shrink-0 rounded-full bg-b27-card p-[3px]">
          {([true, false] as const).map((v) => (
            <button
              key={String(v)}
              type="button"
              onClick={() => update('is_public', v)}
              aria-pressed={form.is_public === v}
              className={`rounded-full px-2.5 py-1 text-[12px] font-medium transition ${
                form.is_public === v ? 'bg-b27-ink text-white' : 'text-b27-muted'
              }`}
            >
              {v ? '공개' : '비공개'}
            </button>
          ))}
        </div>
        <button
          type="submit"
          form={FORM_ID}
          disabled={saving}
          className="shrink-0 rounded-full bg-b27-ink px-3.5 py-1.5 text-[12.5px] font-medium text-white transition active:opacity-80 disabled:opacity-50"
        >
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>

      {/* 상태 줄 — 라벤더 틴트 알약(오류·저장됨도 여기) */}
      <div className="mb-4 flex items-center gap-2 rounded-full bg-b27-tint-5 px-4 py-2.5 text-[12.5px]">
        <i className="inline-block h-2 w-2 shrink-0 rounded-[2px]" style={{ background: LAVENDER_DEEP }} aria-hidden />
        <b className="shrink-0 font-medium" style={{ color: LAVENDER_DEEP }}>
          {form.is_public ? '공개 중' : '비공개'}
        </b>
        {error ? (
          <span className="min-w-0 truncate text-b27-expense">{error}</span>
        ) : saved ? (
          <span className="min-w-0 truncate text-b27-ink">저장됨</span>
        ) : (
          <span className="min-w-0 truncate font-num text-b27-ink">/p/{slug || '…'}</span>
        )}
        {publicHref && (
          <a
            href={publicHref}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto shrink-0 font-medium"
            style={{ color: LAVENDER_DEEP }}
          >
            페이지 ↗
          </a>
        )}
      </div>

      {/* 본문 폼: ① 기본정보(외부링크 통합) ② 부부·선교사·후원 */}
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-2.5">
        {/* ① 기본 정보 */}
        <AccordionSection title="기본 정보" defaultOpen>
          <div className="flex flex-col gap-3.5">
            <Field label="공개 주소">
              <input type="text" value={form.slug} onChange={bindText('slug')} placeholder="mfh" className={inputCls} />
              <p className={hintCls}>/p/{form.slug || '…'} · 영문 소문자·숫자·하이픈</p>
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
                className={inputCls}
              />
            </Field>

            <Field label="공개 이메일">
              <input
                type="email"
                value={form.email_public}
                onChange={bindText('email_public')}
                placeholder="honduras0691@gmail.com"
                className={inputCls}
              />
            </Field>

            {/* 외부 링크 (기본 정보에 통합) */}
            <GroupHead>외부 링크</GroupHead>

            <Field label="사역소개 영상 (YouTube)">
              <input
                type="url"
                value={form.intro_video_url}
                onChange={bindText('intro_video_url')}
                placeholder="https://youtu.be/-dEzFmX-mZY"
                className={inputCls}
              />
            </Field>

            <Field label="YouTube 채널">
              <input
                type="url"
                value={form.youtube_url}
                onChange={bindText('youtube_url')}
                placeholder="https://www.youtube.com/@..."
                className={inputCls}
              />
            </Field>

            <Field label="Facebook">
              <input
                type="url"
                value={form.facebook_url}
                onChange={bindText('facebook_url')}
                placeholder="https://www.facebook.com/groups/..."
                className={inputCls}
              />
            </Field>
          </div>
        </AccordionSection>

        {/* ② 부부·선교사 소개 / 후원 안내 */}
        <AccordionSection title="부부·선교사 소개 / 후원 안내">
          <div className="flex flex-col gap-3.5">
            {/* 부부 소개 */}
            <div>
              <GroupHead>부부 소개 (접힘 상태 표시)</GroupHead>
              <p className={hintCls}>
                공개 페이지의 선교사 소개는 기본 접힘 — 부부사진과 개요가 먼저 보이고, “약력 보기”를 누르면
                선교사 ①·② 약력이 펼쳐집니다.
              </p>
            </div>

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
                className={inputCls}
              />
            </Field>

            {/* 선교사 ① */}
            <GroupHead>선교사 ① (위에 표시)</GroupHead>
            <Field label="이름">
              <input
                type="text"
                value={form.missionary_a_name}
                onChange={bindText('missionary_a_name')}
                placeholder="김우진 선교사"
                className={inputCls}
              />
            </Field>
            <Field label="약력 (줄바꿈으로 구분)">
              <textarea
                value={form.missionary_a_bio}
                onChange={bindText('missionary_a_bio')}
                rows={5}
                placeholder="명지대학교 영어영문학과 졸업 (2005)&#10;..."
                className={inputCls}
              />
            </Field>

            {/* 선교사 ② */}
            <GroupHead>선교사 ② (아래에 표시)</GroupHead>
            <Field label="이름">
              <input
                type="text"
                value={form.missionary_b_name}
                onChange={bindText('missionary_b_name')}
                placeholder="서진아 선교사"
                className={inputCls}
              />
            </Field>
            <Field label="약력 (줄바꿈으로 구분)">
              <textarea
                value={form.missionary_b_bio}
                onChange={bindText('missionary_b_bio')}
                rows={6}
                className={inputCls}
              />
            </Field>

            {/* 후원 안내 */}
            <div>
              <GroupHead>후원 안내</GroupHead>
              <p className={hintCls}>공개 페이지 맨 아래 “후원방법”에 표시됩니다. 비워 두면 표시되지 않습니다.</p>
            </div>
            <Field label="후원 계좌 / 안내">
              <textarea
                value={form.donation_info}
                onChange={bindText('donation_info')}
                rows={2}
                placeholder="우리은행 1002-349-524757 (김우진)"
                className={inputCls}
              />
            </Field>
          </div>
        </AccordionSection>
      </form>

      {/* ④ 연혁 · ⑤ 편지 · ⑥ 영상 (각자 저장) */}
      <div className="mt-2.5 space-y-2.5">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

// 묶음 머리 — 라벤더 8px 사각형 + 이름
function GroupHead({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-1 flex items-center gap-1.5 text-[13px] font-medium text-b27-ink">
      <i className="inline-block h-2 w-2 shrink-0 rounded-[2px]" style={{ background: LAVENDER_BLOCK }} aria-hidden />
      {children}
    </h3>
  );
}
