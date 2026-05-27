'use client';
// MFH-PORTFOLIO-FORM-V1
// 포트폴리오 본문 편집 폼. upsert(insert/update 자동 분기).
// 사진 업로드는 PortfolioPhotoUpload 컴포넌트 활용.

import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import {
  type Portfolio,
  type PortfolioFormState,
  emptyPortfolioForm,
  portfolioToForm,
} from '@/lib/portfolio';
import PortfolioPhotoUpload from '@/components/PortfolioPhotoUpload';

type Props = {
  initial: Portfolio | null;
  userId: string;
};

export default function PortfolioForm({ initial, userId }: Props) {
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
      missionary_a_name: form.missionary_a_name || null,
      missionary_a_photo_url: form.missionary_a_photo_url || null,
      missionary_a_bio: form.missionary_a_bio || null,
      missionary_b_name: form.missionary_b_name || null,
      missionary_b_photo_url: form.missionary_b_photo_url || null,
      missionary_b_bio: form.missionary_b_bio || null,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="mb-3 text-sm font-medium text-primary">기본 정보</h2>

        <Field label="공개 URL slug">
          <input
            type="text"
            value={form.slug}
            onChange={bindText('slug')}
            placeholder="mfh"
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <p className="mt-1 text-[11px] text-faint">
            공개 URL: /p/{form.slug || '...'}
          </p>
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
      </section>

      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="mb-3 text-sm font-medium text-primary">외부 링크</h2>

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
      </section>

      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="mb-3 text-sm font-medium text-primary">선교사 ① (위에 표시)</h2>

        <Field label="이름">
          <input
            type="text"
            value={form.missionary_a_name}
            onChange={bindText('missionary_a_name')}
            placeholder="김우진 선교사"
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </Field>

        <Field label="사진">
          <PortfolioPhotoUpload
            userId={userId}
            kind="missionary-a"
            value={form.missionary_a_photo_url}
            onChange={(url) => update('missionary_a_photo_url', url)}
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
      </section>

      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="mb-3 text-sm font-medium text-primary">선교사 ② (아래에 표시)</h2>

        <Field label="이름">
          <input
            type="text"
            value={form.missionary_b_name}
            onChange={bindText('missionary_b_name')}
            placeholder="서진아 선교사"
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </Field>

        <Field label="사진">
          <PortfolioPhotoUpload
            userId={userId}
            kind="missionary-b"
            value={form.missionary_b_photo_url}
            onChange={(url) => update('missionary_b_photo_url', url)}
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
      </section>

      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="mb-3 text-sm font-medium text-primary">공개 설정</h2>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={form.is_public}
            onChange={(e) => update('is_public', e.target.checked)}
            className="h-4 w-4"
          />
          <span>외부에 공개 (체크 해제 시 /p/{form.slug || '...'} 에서 404 처리)</span>
        </label>
      </section>

      <div className="sticky bottom-0 -mx-4 border-t border-line bg-surface px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="text-xs">
            {error && <span className="text-danger">{error}</span>}
            {saved && !error && <span className="text-primary">저장됨</span>}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </form>
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
