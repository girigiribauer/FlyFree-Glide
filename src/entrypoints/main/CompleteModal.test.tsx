import { fireEvent,render, screen } from '@solidjs/testing-library'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import CompleteModal from './CompleteModal'

describe('CompleteModal', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  test('初期表示で5秒カウントダウンを表示する', () => {
    render(() => <CompleteModal url="https://bsky.app/test" onClose={vi.fn()} />)
    expect(screen.getByText(/5 秒後/)).toBeInTheDocument()
  })

  test('1秒後に4秒に更新される', () => {
    render(() => <CompleteModal url="https://bsky.app/test" onClose={vi.fn()} />)
    vi.advanceTimersByTime(1000)
    expect(screen.getByText(/4 秒後/)).toBeInTheDocument()
  })

  test('5秒後に onClose が呼ばれる', () => {
    const onClose = vi.fn()
    render(() => <CompleteModal url="https://bsky.app/test" onClose={onClose} />)
    vi.advanceTimersByTime(5000)
    expect(onClose).toHaveBeenCalledOnce()
  })

  test('5秒経過後に onClose は1回だけ呼ばれる', () => {
    const onClose = vi.fn()
    render(() => <CompleteModal url="https://bsky.app/test" onClose={onClose} />)
    vi.advanceTimersByTime(10000)
    expect(onClose).toHaveBeenCalledOnce()
  })

  test('リンクをクリックすると onClose が呼ばれる', () => {
    const onClose = vi.fn()
    render(() => <CompleteModal url="https://bsky.app/test" onClose={onClose} />)
    fireEvent.click(screen.getByText('Bluesky で見る'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  test('投稿 URL がリンクに設定される', () => {
    render(() => <CompleteModal url="https://bsky.app/profile/test/post/abc" onClose={vi.fn()} />)
    expect(screen.getByText('Bluesky で見る')).toHaveAttribute('href', 'https://bsky.app/profile/test/post/abc')
  })
})
