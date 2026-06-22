// MFH-IMAGE-RESIZE-V1
// 브라우저(Canvas)에서 사진 1장의 축소 썸네일을 만든다. 원본은 건드리지 않는다 —
// 목록·갤러리가 원본 대신 가벼운 썸네일을 로드하게 해 온두라스 저속 회선의 로딩을 줄이는 용도.
// EXIF 회전(orientation) 보정 + WebP(미지원 환경은 JPEG) 출력. 실패는 치명적이지 않다(원본만으로 동작).

const THUMB_MAX = 512 // 썸네일 긴 변 px (목록 그리드는 셀당 ~120~170px → 레티나 여유 포함)
const THUMB_QUALITY = 0.72

export type ThumbResult = { blob: Blob; ext: 'webp' | 'jpg' }

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality))
}

// File → 썸네일 Blob. 만들지 못하면 null(원본만 업로드되고 목록은 원본 폴백).
export async function makeThumbnail(file: File): Promise<ThumbResult | null> {
  // 이미지가 아니면(이론상 호출 안 됨) 건너뜀.
  if (!file.type.startsWith('image/')) return null
  try {
    // 디코드 — EXIF orientation 자동 보정 시도(미지원이면 기본 디코드로 폴백).
    let bitmap: ImageBitmap
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      bitmap = await createImageBitmap(file)
    }

    const { width, height } = bitmap
    if (!width || !height) {
      bitmap.close?.()
      return null
    }
    const scale = Math.min(1, THUMB_MAX / Math.max(width, height))
    const w = Math.max(1, Math.round(width * scale))
    const h = Math.max(1, Math.round(height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close?.()
      return null
    }
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()

    // WebP 우선(가장 가벼움) → 미지원 환경은 JPEG.
    const webp = await canvasToBlob(canvas, 'image/webp', THUMB_QUALITY)
    if (webp && webp.type === 'image/webp') return { blob: webp, ext: 'webp' }
    const jpg = await canvasToBlob(canvas, 'image/jpeg', 0.8)
    if (jpg) return { blob: jpg, ext: 'jpg' }
    return null
  } catch {
    // 디코드/캔버스 실패 — 원본만으로도 동작하므로 조용히 포기.
    return null
  }
}
