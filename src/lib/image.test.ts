import { describe, expect, test } from 'vitest'
import { calcResizeDimensions, findOptimalQuality } from './image'
import { MAX_IMAGE_DIMENSION } from './constants'

describe('calcResizeDimensions', () => {
  test('上限以内の場合はそのまま返す', () => {
    expect(calcResizeDimensions(1920, 1080)).toEqual({ width: 1920, height: 1080 })
  })

  test('幅が上限を超えた場合にアスペクト比を維持してリサイズする', () => {
    const { width, height } = calcResizeDimensions(8000, 4000)
    expect(width).toBe(MAX_IMAGE_DIMENSION)
    expect(height).toBe(2000)
  })

  test('高さが上限を超えた場合にアスペクト比を維持してリサイズする', () => {
    const { width, height } = calcResizeDimensions(2000, 8000)
    expect(width).toBe(1000)
    expect(height).toBe(MAX_IMAGE_DIMENSION)
  })

  test('幅と高さ両方が上限を超えた場合は小さい方の比率に合わせる', () => {
    const { width, height } = calcResizeDimensions(6000, 8000)
    expect(width).toBe(3000)
    expect(height).toBe(MAX_IMAGE_DIMENSION)
  })

  test('ちょうど上限の場合はリサイズしない', () => {
    expect(calcResizeDimensions(4000, 4000)).toEqual({ width: 4000, height: 4000 })
  })
})

describe('findOptimalQuality', () => {
  const makeBlob = (size: number) => new Blob([new Uint8Array(size)])

  test('上限以内に収まる品質を返す', async () => {
    // quality が高いほど大きい想定の encode
    const encode = (q: number) => Promise.resolve(makeBlob(Math.floor(q * 1000)))
    const result = await findOptimalQuality(encode, 500)
    expect(result.size).toBeLessThanOrEqual(500)
  })

  test('最低品質でも上限を超える場合は最低品質の結果を返す', async () => {
    const encode = (_q: number) => Promise.resolve(makeBlob(2000))
    const result = await findOptimalQuality(encode, 500)
    expect(result.size).toBe(2000)
  })

  test('最高品質が上限以内に収まる場合は高品質を優先する', async () => {
    const encode = (_q: number) => Promise.resolve(makeBlob(100))
    const result = await findOptimalQuality(encode, 500)
    expect(result.size).toBe(100)
  })
})
