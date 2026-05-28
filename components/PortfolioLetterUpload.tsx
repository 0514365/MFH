'use client';

// MFH-PORTFOLIO-LETTER-UPLOAD-V1
// 선교편지용 파일 업로드 (PDF 또는 표지 이미지). portfolio-letters 버킷.
// 경로: {userId}/letter-{ts}.pdf / {userId}/cover-{ts}.{ext}

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

type Kind = 'pdf' | 'cover';

type Props = {
  userId: string;
  kind: Kind;
  currentPath: string | null;
  onUploaded: (path: string) => void;
  label: string;
};

const BUCKET = 'portfolio-letters';

export default function PortfolioLetterUpload({
  userId,
  kind,
  currentPath,
  onUploaded,
  label,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (kind === 'pdf' && file.type !== 'application/pdf') {
      setError('PDF 파일만 업로드할 수 있습니다.');
      return;
    }
    if (kind === 'cover' && !file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드할 수 있습니다.');
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const ext = kind === 'pdf' ? 'pdf' : (file.name.split('.').pop() || 'jpg');
      const path = `${userId}/${kind}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false });
      if (upErr) {
        setError(upErr.message);
        return;
      }
      onUploaded(path);
    } finally {
      setBusy(false);
    }
  }

  const accept = kind === 'pdf' ? 'application/pdf' : 'image/*';
  const filename = currentPath ? currentPath.split('/').pop() : null;

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-md border border-line bg-surface px-3 py-2 text-xs font-medium text-primary hover:bg-primary-soft disabled:opacity-50"
      >
        {busy ? '업로드 중…' : currentPath ? `${label} 교체` : label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />
      {filename && (
        <p className="mt-1 truncate text-[10px] text-muted" title={filename}>
          {filename}
        </p>
      )}
      {error && <p className="mt-1 text-[10px] text-danger">{error}</p>}
    </div>
  );
}
