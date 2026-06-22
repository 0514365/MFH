// MFH-DOWNLOAD-V1
// 원본 파일을 기기에 저장. Supabase signed URL 은 교차 출처라 <a download> 가 무시될 수 있어
// fetch→blob→objectURL 로 강제 다운로드한다. 실패 시 새 탭으로 열어 사용자가 직접 저장하게 폴백.
export async function downloadFile(url: string, filename: string): Promise<void> {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`status ${res.status}`)
    const blob = await res.blob()
    const objUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(objUrl)
  } catch {
    window.open(url, '_blank', 'noopener')
  }
}

// 경로/URL 에서 저장 파일명 추출(쿼리 제거 후 마지막 세그먼트).
export function filenameFromPathOrUrl(s: string): string {
  const noQuery = s.split('?')[0] || ''
  const last = noQuery.split('/').pop() || 'photo'
  try {
    return decodeURIComponent(last)
  } catch {
    return last
  }
}
