import { createSignal, onCleanup } from 'solid-js'

import { MAX_POST_IMAGES } from '../lib/constants'

export interface ImageEntry {
  file: File
  previewUrl: string
}

export function useImageEntries() {
  const [imageEntries, setImageEntries] = createSignal<ImageEntry[]>([])

  onCleanup(() => imageEntries().forEach(e => URL.revokeObjectURL(e.previewUrl)))

  function addFiles(files: File[]) {
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    if (imageFiles.length === 0) return
    setImageEntries(prev => {
      const newEntries = imageFiles
        .slice(0, MAX_POST_IMAGES - prev.length)
        .map(f => ({ file: f, previewUrl: URL.createObjectURL(f) }))
      return [...prev, ...newEntries]
    })
  }

  function removeImage(index: number) {
    URL.revokeObjectURL(imageEntries()[index].previewUrl)
    setImageEntries(prev => prev.filter((_, i) => i !== index))
  }

  function clearEntries() {
    imageEntries().forEach(e => URL.revokeObjectURL(e.previewUrl))
    setImageEntries([])
  }

  return { imageEntries, addFiles, removeImage, clearEntries }
}
