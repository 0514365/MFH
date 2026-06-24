'use client'

// MFH-SUPPORTER-FORM-V1
// 후원자 입력 폼 — 사진 + 기본정보 + 연락처 + 정기후원 + 기도제목/특이사항.
// 헌금이력·관계히스토리는 상세 페이지에서 추가(자식 데이터).
// 저장·검증·날짜 로직은 ProjectForm 패턴 준수. 사진은 supporter-photos 버킷 1장.

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import type { Supporter, Currency } from '@/lib/types'
import DateField from '../journal/DateField'
import BackButton from '@/components/BackButton'
import { resolveOwnerId } from '@/lib/members'
import {
  CURRENCIES,
  CURRENCY_LABEL,
  SUPPORTER_PHOTO_BUCKET,
  uploadSupporterPhoto,
  formatAmountInput,
  sanitizeAmountInput,
  amountToNumber,
  amountToRaw,
} from '@/lib/supporters'
import '../p/portfolio-theme.css'

type Props = {
  mode: 'new' | 'edit'
  initial?: Supporter | null
}

function FieldLabel({ ko, en }: { ko: string; en: string }) {
  return (
    <label className="mb-2 flex items-baseline gap-1.5">
      <span className="text-[14px] font-medium text-ink">{ko}</span>
      <span className="font-display text-[9px] font-bold uppercase tracking-[0.15em] text-accent">{en}</span>
    </label>
  )
}

export default function SupporterForm({ mode, initial }: Props) {
  const router = useRouter()
  const [name, setName] = useState(initial?.name ?? '')
  const [birthDate, setBirthDate] = useState(initial?.birth_date ?? '')
  const [affiliation, setAffiliation] = useState(initial?.affiliation ?? '')
  const [role, setRole] = useState(initial?.role ?? '')
  const [region, setRegion] = useState(initial?.region ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [sns, setSns] = useState(initial?.sns ?? '')
  const [referrer, setReferrer] = useState(initial?.referrer ?? '')
  const [firstMet, setFirstMet] = useState(initial?.first_met_date ?? '')
  const [isRecurring, setIsRecurring] = useState(initial?.is_recurring ?? false)
  const [recurringAmount, setRecurringAmount] = useState(
    amountToRaw(initial?.recurring_amount, initial?.recurring_currency ?? 'USD'),
  )
  const [recurringCurrency, setRecurringCurrency] = useState<Currency>(
    initial?.recurring_currency ?? 'USD',
  )
  const [recurringNote, setRecurringNote] = useState(initial?.recurring_note ?? '')
  const [prayerPoints, setPrayerPoints] = useState(initial?.prayer_points ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  // 사진(1장)
  const [photoPath, setPhotoPath] = useState<string | null>(initial?.photo_path ?? null)
  const [thumbPath, setThumbPath] = useState<string | null>(initial?.thumb_path ?? null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    // 편집: 기존 사진 미리보기(signed URL)
    if (initial?.photo_path) {
      const supabase = createClient()
      void supabase.storage
        .from(SUPPORTER_PHOTO_BUCKET)
        .createSignedUrl(initial.thumb_path || initial.photo_path, 3600)
        .then(({ data }) => {
          if (data?.signedUrl) setPhotoPreview(data.signedUrl)
        })
    }
  }, [initial])

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/login')
      return
    }
    setUploading(true)
    setMsg(null)
    try {
      const { path, thumb_path } = await uploadSupporterPhoto(supabase, user.id, file)
      setPhotoPath(path)
      setThumbPath(thumb_path)
      setPhotoPreview(URL.createObjectURL(file))
    } catch (err) {
      setMsg('사진 업로드 실패: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setUploading(false)
    }
  }

  function removePhoto() {
    setPhotoPath(null)
    setThumbPath(null)
    setPhotoPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function save() {
    if (!name.trim()) {
      setMsg('이름을 입력해 주세요.')
      return
    }
    setSaving(true)
    setMsg(null)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/login')
      return
    }
    const payload = {
      user_id: resolveOwnerId({ existingOwnerId: initial?.user_id, viewerId: user.id }),
      name: name.trim(),
      birth_date: birthDate || null,
      affiliation: affiliation.trim() || null,
      role: role.trim() || null,
      region: region.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      sns: sns.trim() || null,
      referrer: referrer.trim() || null,
      first_met_date: firstMet || null,
      is_recurring: isRecurring,
      recurring_amount:
        isRecurring && recurringAmount ? amountToNumber(recurringAmount, recurringCurrency) : null,
      recurring_currency: recurringCurrency,
      recurring_note: isRecurring ? recurringNote.trim() || null : null,
      prayer_points: prayerPoints.trim() || null,
      notes: notes.trim() || null,
      photo_path: photoPath,
      thumb_path: thumbPath,
      ...(mode === 'edit' ? { updated_at: new Date().toISOString() } : {}),
    }
    let resultId = initial?.id ?? null
    if (mode === 'edit' && initial) {
      const { error } = await supabase.from('supporters').update(payload).eq('id', initial.id)
      if (error) {
        setSaving(false)
        setMsg('저장 실패: ' + error.message)
        return
      }
    } else {
      const { data, error } = await supabase
        .from('supporters')
        .insert(payload)
        .select('id')
        .single()
      if (error) {
        setSaving(false)
        setMsg('저장 실패: ' + error.message)
        return
      }
      resultId = (data as { id: string }).id
    }
    setSaving(false)
    router.replace(resultId ? `/supporters/${resultId}` : '/supporters')
    router.refresh()
  }

  const input =
    'w-full rounded-xl border border-line bg-surface px-4 py-3.5 text-sm text-ink outline-none focus:border-primary'

  return (
    <main className="app-theme mx-auto max-w-md px-4 pb-10 sm:max-w-2xl">
      <header className="relative -mx-4 mb-5 flex items-center justify-between border-b border-line px-4 py-3">
        <BackButton
          href={mode === 'edit' && initial ? `/supporters/${initial.id}` : '/supporters'}
          label=""
          variant="text"
        />
        <h1 className="absolute left-1/2 -translate-x-1/2 font-display text-[15px] font-extrabold uppercase tracking-[0.2em] text-ink">
          {mode === 'edit' ? 'Edit Supporter' : 'New Supporter'}
        </h1>
        <span className="w-10" aria-hidden="true" />
      </header>

      <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
        {/* 사진 */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative h-24 w-24 overflow-hidden rounded-full border border-line bg-surface-subtle"
            aria-label="사진 선택"
          >
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-faint">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={onPickPhoto} className="hidden" />
          <div className="mt-2 flex items-center gap-3 text-xs">
            <button type="button" onClick={() => fileRef.current?.click()} className="font-medium text-accent">
              {uploading ? '업로드 중…' : '사진 선택'}
            </button>
            {photoPreview && (
              <button type="button" onClick={removePhoto} className="text-muted">
                제거
              </button>
            )}
          </div>
        </div>

        <div className="my-5 h-px bg-line" />

        {/* 이름 */}
        <div>
          <FieldLabel ko="이름" en="Name" />
          <input value={name} onChange={(e) => setName(e.target.value)} className={input} placeholder="후원자 이름" />
        </div>

        {/* 생년월일 */}
        <div className="mt-5">
          <FieldLabel ko="생년월일" en="Birth" />
          <DateField value={birthDate} onChange={setBirthDate} placeholder="생년월일 (선택)" />
        </div>

        {/* 소속 · 직분 */}
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className="min-w-0">
            <FieldLabel ko="소속" en="Org" />
            <input value={affiliation} onChange={(e) => setAffiliation(e.target.value)} className={input} placeholder="교회·단체" />
          </div>
          <div className="min-w-0">
            <FieldLabel ko="직분" en="Role" />
            <input value={role} onChange={(e) => setRole(e.target.value)} className={input} placeholder="장로·집사 등" />
          </div>
        </div>

        {/* 거주지역 */}
        <div className="mt-5">
          <FieldLabel ko="거주지역" en="Region" />
          <input value={region} onChange={(e) => setRegion(e.target.value)} className={input} placeholder="예: 서울 / 온두라스" />
        </div>

        <div className="my-5 h-px bg-line" />

        {/* 전화 · 이메일 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="min-w-0">
            <FieldLabel ko="전화번호" en="Phone" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={input} inputMode="tel" placeholder="연락처" />
          </div>
          <div className="min-w-0">
            <FieldLabel ko="이메일" en="Email" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} className={input} inputMode="email" placeholder="이메일" />
          </div>
        </div>

        {/* SNS */}
        <div className="mt-5">
          <FieldLabel ko="기타 연락처 (SNS)" en="SNS" />
          <input value={sns} onChange={(e) => setSns(e.target.value)} className={input} placeholder="카카오·인스타 등" />
        </div>

        {/* 소개자 · 첫 만남 */}
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className="min-w-0">
            <FieldLabel ko="소개자" en="Referrer" />
            <input value={referrer} onChange={(e) => setReferrer(e.target.value)} className={input} placeholder="소개한 분" />
          </div>
          <div className="min-w-0">
            <FieldLabel ko="첫 만남" en="Met" />
            <DateField value={firstMet} onChange={setFirstMet} placeholder="첫 만남 (선택)" />
          </div>
        </div>

        <div className="my-5 h-px bg-line" />

        {/* 정기후원 */}
        <div>
          <div className="flex items-center justify-between">
            <FieldLabel ko="정기후원" en="Recurring" />
            <button
              type="button"
              onClick={() => setIsRecurring((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition ${isRecurring ? 'bg-accent' : 'bg-line'}`}
              aria-pressed={isRecurring}
              aria-label="정기후원 토글"
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${isRecurring ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
          {isRecurring && (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <input
                  value={formatAmountInput(recurringAmount, recurringCurrency)}
                  onChange={(e) => setRecurringAmount(sanitizeAmountInput(e.target.value))}
                  className={`${input} text-right`}
                  inputMode="numeric"
                  placeholder="정기후원 금액"
                />
                <select
                  value={recurringCurrency}
                  onChange={(e) => {
                    setRecurringCurrency(e.target.value as Currency)
                    setRecurringAmount('')
                  }}
                  className={`${input} w-auto`}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {CURRENCY_LABEL[c]}
                    </option>
                  ))}
                </select>
              </div>
              <input value={recurringNote} onChange={(e) => setRecurringNote(e.target.value)} className={input} placeholder="주기·메모 (예: 매월 1일)" />
            </div>
          )}
        </div>

        <div className="my-5 h-px bg-line" />

        {/* 주요 기도제목 */}
        <div>
          <FieldLabel ko="주요 기도제목" en="Prayer" />
          <textarea
            value={prayerPoints}
            onChange={(e) => setPrayerPoints(e.target.value)}
            rows={3}
            className={`${input} min-h-[80px] resize-none leading-relaxed [field-sizing:content]`}
            placeholder="이 후원자를 위한 주요 기도제목"
          />
        </div>

        {/* 특이사항 메모 */}
        <div className="mt-5">
          <FieldLabel ko="특이사항 메모" en="Notes" />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={`${input} min-h-[80px] resize-none leading-relaxed [field-sizing:content]`}
            placeholder="기타 메모"
          />
        </div>
      </div>

      {msg && <p className="mt-4 text-center text-sm text-danger">{msg}</p>}

      <button
        onClick={save}
        disabled={saving || uploading}
        className="mt-6 w-full rounded-xl bg-accent py-4 font-display text-[15px] font-bold uppercase tracking-[0.15em] text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
      >
        {saving ? '저장 중…' : mode === 'edit' ? 'Update Supporter' : 'Save Supporter'}
      </button>
    </main>
  )
}
