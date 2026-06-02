import { createRoot } from 'solid-js'
import { describe, expect, test } from 'vitest'

import { MAX_POST_IMAGES } from '../lib/constants'
import { useImageEntries } from './useImageEntries'

function makeImage(name = 'photo.png') {
  return new File(['img'], name, { type: 'image/png' })
}

describe('useImageEntries — addFiles', () => {
  test('画像ファイルのみ受け入れる', () => {
    createRoot(dispose => {
      const { imageEntries, addFiles } = useImageEntries()
      addFiles([makeImage(), new File(['txt'], 'readme.txt', { type: 'text/plain' })])
      expect(imageEntries()).toHaveLength(1)
      expect(imageEntries()[0].file.name).toBe('photo.png')
      dispose()
    })
  })

  test('非画像のみの場合は何も追加されない', () => {
    createRoot(dispose => {
      const { imageEntries, addFiles } = useImageEntries()
      addFiles([new File(['txt'], 'readme.txt', { type: 'text/plain' })])
      expect(imageEntries()).toHaveLength(0)
      dispose()
    })
  })

  test(`MAX_POST_IMAGES(${MAX_POST_IMAGES}) を超えて追加されない`, () => {
    createRoot(dispose => {
      const { imageEntries, addFiles } = useImageEntries()
      const files = Array.from({ length: MAX_POST_IMAGES + 1 }, (_, i) => makeImage(`p${i}.png`))
      addFiles(files)
      expect(imageEntries()).toHaveLength(MAX_POST_IMAGES)
      dispose()
    })
  })

  test('既存の枚数と合わせて上限を守る', () => {
    createRoot(dispose => {
      const { imageEntries, addFiles } = useImageEntries()
      addFiles([makeImage('a.png'), makeImage('b.png'), makeImage('c.png')])
      addFiles([makeImage('d.png'), makeImage('e.png')])
      expect(imageEntries()).toHaveLength(MAX_POST_IMAGES)
      dispose()
    })
  })
})

describe('useImageEntries — removeImage', () => {
  test('指定インデックスのファイルが削除される', () => {
    createRoot(dispose => {
      const { imageEntries, addFiles, removeImage } = useImageEntries()
      addFiles([makeImage('a.png'), makeImage('b.png')])
      removeImage(0)
      expect(imageEntries()).toHaveLength(1)
      expect(imageEntries()[0].file.name).toBe('b.png')
      dispose()
    })
  })
})

describe('useImageEntries — clearEntries', () => {
  test('clearEntries ですべてのエントリが削除される', () => {
    createRoot(dispose => {
      const { imageEntries, addFiles, clearEntries } = useImageEntries()
      addFiles([makeImage('a.png'), makeImage('b.png')])
      clearEntries()
      expect(imageEntries()).toHaveLength(0)
      dispose()
    })
  })
})

