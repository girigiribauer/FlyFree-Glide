import { RichText } from '@atproto/api'
export { MAX_GRAPHEMES } from './constants'
import { MAX_GRAPHEMES } from './constants'
import { buildShortLinkText } from './urlHelpers'

export function countGraphemes(text: string): number {
  return new RichText({ text: buildShortLinkText(text) }).graphemeLength
}

export function usedGraphemes(text: string): number {
  return countGraphemes(text)
}

export function remainingGraphemes(text: string): number {
  return MAX_GRAPHEMES - countGraphemes(text)
}

export function isOverLimit(text: string): boolean {
  return countGraphemes(text) > MAX_GRAPHEMES
}

export function canPost(text: string, imageCount: number, limitText?: string): boolean {
  return (text.trim().length > 0 || imageCount > 0) && !isOverLimit(limitText ?? text)
}
