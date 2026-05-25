import { RichText } from '@atproto/api'
export { MAX_GRAPHEMES } from './constants'
import { MAX_GRAPHEMES } from './constants'

export function countGraphemes(text: string): number {
  return new RichText({ text }).graphemeLength
}

export function remainingGraphemes(text: string): number {
  return MAX_GRAPHEMES - countGraphemes(text)
}

export function isOverLimit(text: string): boolean {
  return countGraphemes(text) > MAX_GRAPHEMES
}

export function canPost(text: string, imageCount: number): boolean {
  return (text.trim().length > 0 || imageCount > 0) && !isOverLimit(text)
}
