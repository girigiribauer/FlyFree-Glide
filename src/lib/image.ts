import { MAX_IMAGE_DIMENSION, MAX_LINK_THUMB_SIZE } from './constants'

export interface OptimizedImage {
  data: Uint8Array
  mimeType: string
  width: number
  height: number
}

export function calcResizeDimensions(
  width: number,
  height: number,
  maxDimension: number = MAX_IMAGE_DIMENSION,
): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) return { width, height }
  const ratio = Math.min(maxDimension / width, maxDimension / height)
  return { width: Math.floor(width * ratio), height: Math.floor(height * ratio) }
}

export async function findOptimalQuality(
  encode: (quality: number) => Promise<Blob>,
  maxBytes: number,
): Promise<Blob> {
  let lo = 0.1
  let hi = 0.95
  let result = await encode(lo)

  for (let i = 0; i < 8; i++) {
    const mid = (lo + hi) / 2
    const candidate = await encode(mid)
    if (candidate.size <= maxBytes) {
      result = candidate
      lo = mid
    } else {
      hi = mid
    }
  }

  return result
}

export async function optimizeImage(
  blob: Blob,
  maxBytes: number = MAX_LINK_THUMB_SIZE,
): Promise<OptimizedImage> {
  const bitmap = await createImageBitmap(blob)
  const { width, height } = calcResizeDimensions(bitmap.width, bitmap.height)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const encode = (quality: number): Promise<Blob> =>
    new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
        'image/jpeg',
        quality,
      ),
    )

  const result = await findOptimalQuality(encode, maxBytes)

  return {
    data: new Uint8Array(await result.arrayBuffer()),
    mimeType: 'image/jpeg',
    width,
    height,
  }
}
