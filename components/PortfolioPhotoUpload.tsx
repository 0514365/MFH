'use client';
// MFH-PORTFOLIO-PHOTO-UPLOAD-V2
// 포트폴리오 사진 업로드 (portfolio-photos 공개 버킷).
// 파일경로: {userId}/{kind}-{timestamp}.{ext}
// kind: 'hero' | 'missionary-a' | 'missionary-b' | 'couple'
// V2: 'couple'(부부사진) kind 추가 (patch63).

import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { createClient } from '@/lib/supabase-browser';

type Props = {
  userId: string;
  kind: 'hero' | 'missionary-a' | 'missionary-b' | 'couple';
  value: string;
  onChange: (url: string) => void;
};

const BUCKET = 'portfolio-photos';

export default function PortfolioPhotoUpload({ userId, kind, value, onChange }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // 5MB 제한
    if (file.size > 5 * 1024 * 1024) {
      setError('파일이 너무 큽니다 (5MB 이내).');
      return;
    }

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${userId}/${kind}-${Date.now()}.${ext}`;

    setBusy(true);
    const { error: upError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { cacheControl: '3600', upsert: false });

    if (upError) {
      setBusy(false);
      setError(upError.message);
      return;
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    setBusy(false);

    if (pub?.publicUrl) {
      onChange(pub.publicUrl);
    } else {
      setError('업로드 후 URL 을 가져올 수 없습니다.');
    }

    // input 초기화
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  function handleClear() {
    onChange('');
    setError(null);
  }

  return (
    <div>
      {value ? (
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="미리보기"
            className="h-20 w-20 rounded-md border border-line object-cover"
          />
          <div className="flex-1 space-y-1.5">
            <p className="break-all text-[11px] text-faint">{value}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="rounded-md border border-line bg-surface px-3 py-1 text-xs text-primary disabled:opacity-50"
              >
                교체
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={busy}
                className="rounded-md border border-line bg-surface px-3 py-1 text-xs text-danger disabled:opacity-50"
              >
                제거
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="w-full rounded-md border-2 border-dashed border-line bg-surface-subtle py-4 text-xs text-muted hover:border-primary disabled:opacity-50"
        >
          {busy ? '업로드 중…' : '+ 사진 업로드 (JPG/PNG, 5MB 이내)'}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
      {error && <p className="mt-1 text-[11px] text-danger">{error}</p>}
    </div>
  );
}
