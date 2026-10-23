'use client';
// MFH-PORTFOLIO-PHOTO-UPLOAD-V4 — 2027(4-8): 미리보기 72px 둥근 면 + 「바꾸기」(라벤더 진한 톤)·「제거」(회색) 글자 · 빈 상태 = 연회색 면.
// MFH-PORTFOLIO-PHOTO-UPLOAD-V3
// 포트폴리오 사진 업로드 (portfolio-photos 공개 버킷).
// 파일경로: {userId}/{kind}-{timestamp}.{ext}
// kind: 'hero' | 'missionary-a' | 'missionary-b' | 'couple' | 'video-thumb'
// V2: 'couple'(부부사진) kind 추가 (patch63).
// V3: 'video-thumb'(사역 영상 커스텀 썸네일) kind 추가 (patch66).

import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { createClient } from '@/lib/supabase-browser';

type Props = {
  userId: string;
  kind: 'hero' | 'missionary-a' | 'missionary-b' | 'couple' | 'video-thumb';
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
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="미리보기" className="h-[72px] w-[72px] shrink-0 rounded-xl object-cover" />
          <div className="flex gap-3 text-[12px]">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="font-medium text-[#4E39C6] disabled:opacity-50"
            >
              {busy ? '업로드 중…' : '바꾸기'}
            </button>
            <button type="button" onClick={handleClear} disabled={busy} className="text-b27-muted disabled:opacity-50">
              제거
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="w-full rounded-xl bg-b27-card py-4 text-[12px] text-b27-muted transition active:opacity-70 disabled:opacity-50"
        >
          {busy ? '업로드 중…' : '＋ 사진 업로드 (JPG/PNG, 5MB 이내)'}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
      {error && <p className="mt-1 text-[11px] text-b27-expense">{error}</p>}
    </div>
  );
}
