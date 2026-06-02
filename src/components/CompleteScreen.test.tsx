import { fireEvent, render, screen } from '@solidjs/testing-library'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import CompleteScreen from './CompleteScreen'

const defaultProps = {
  url: 'https://bsky.app/test',
  countdown: false,
  xEnabled: false,
  onOpenX: vi.fn(),
  onClose: vi.fn(),
}

describe('CompleteScreen — countdown あり', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  test('初期表示で10秒カウントダウンを表示する', () => {
    render(() => <CompleteScreen {...defaultProps} countdown={true} />)
    expect(screen.getByText(/10秒後/)).toBeInTheDocument()
  })

  test('1秒後に9秒に更新される', () => {
    render(() => <CompleteScreen {...defaultProps} countdown={true} />)
    vi.advanceTimersByTime(1000)
    expect(screen.getByText(/9秒後/)).toBeInTheDocument()
  })

  test('10秒後に onClose が呼ばれる', () => {
    const onClose = vi.fn()
    render(() => <CompleteScreen {...defaultProps} countdown={true} onClose={onClose} />)
    vi.advanceTimersByTime(10000)
    expect(onClose).toHaveBeenCalledOnce()
  })

  test('10秒経過後に onClose は1回だけ呼ばれる', () => {
    const onClose = vi.fn()
    render(() => <CompleteScreen {...defaultProps} countdown={true} onClose={onClose} />)
    vi.advanceTimersByTime(20000)
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('CompleteScreen — countdown なし', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  test('カウントダウンテキストを表示しない', () => {
    render(() => <CompleteScreen {...defaultProps} countdown={false} />)
    expect(screen.queryByText(/秒後/)).not.toBeInTheDocument()
  })

  test('時間が経っても onClose は呼ばれない', () => {
    const onClose = vi.fn()
    render(() => <CompleteScreen {...defaultProps} countdown={false} onClose={onClose} />)
    vi.advanceTimersByTime(30000)
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('CompleteScreen — Bluesky 行', () => {
  test('Bluesky リンクをクリックすると onClose が呼ばれる', () => {
    const onClose = vi.fn()
    render(() => <CompleteScreen {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByText('投稿しました！'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  test('投稿 URL がリンクに設定される', () => {
    render(() => <CompleteScreen {...defaultProps} url="https://bsky.app/profile/test/post/abc" />)
    expect(screen.getByText('投稿しました！').closest('a')).toHaveAttribute('href', 'https://bsky.app/profile/test/post/abc')
  })
})

describe('CompleteScreen — X 行', () => {
  test('xEnabled=false のとき X 行を表示しない', () => {
    render(() => <CompleteScreen {...defaultProps} xEnabled={false} />)
    expect(screen.queryByText('投稿画面を開く')).not.toBeInTheDocument()
  })

  test('xEnabled=true のとき X 行を表示する', () => {
    render(() => <CompleteScreen {...defaultProps} xEnabled={true} />)
    expect(screen.getByText('投稿画面を開く')).toBeInTheDocument()
  })

  test('X 行をクリックすると onOpenX が呼ばれる', () => {
    const onOpenX = vi.fn()
    render(() => <CompleteScreen {...defaultProps} xEnabled={true} onOpenX={onOpenX} />)
    fireEvent.click(screen.getByText('投稿画面を開く'))
    expect(onOpenX).toHaveBeenCalledOnce()
  })
})
