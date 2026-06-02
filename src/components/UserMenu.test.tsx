import { fireEvent, render, screen } from '@solidjs/testing-library'
import { describe, expect, test, vi } from 'vitest'

import type { AccountInfo } from '../lib/accounts'
import UserMenu from './UserMenu'

const currentUser: AccountInfo = { did: 'did:plc:me', handle: 'me.bsky.social' }
const alice: AccountInfo = { did: 'did:plc:a1', handle: 'alice.bsky.social' }
const bob: AccountInfo = { did: 'did:plc:b1', handle: 'bob.bsky.social' }

interface UserMenuProps {
  currentUser: AccountInfo
  accounts: AccountInfo[]
  open: boolean
  onToggle: () => void
  onSwitchAccount: (did: string) => void
  onAddAccount: () => void
  onLogout: () => void
}

function renderMenu(overrides: Partial<UserMenuProps> = {}) {
  const defaults: UserMenuProps = {
    currentUser,
    accounts: [],
    open: false,
    onToggle: vi.fn(),
    onSwitchAccount: vi.fn(),
    onAddAccount: vi.fn(),
    onLogout: vi.fn(),
  }
  const props = { ...defaults, ...overrides }
  return render(() => <UserMenu {...props} />)
}

describe('UserMenu — ポップアップ表示', () => {
  test('open=false のときポップアップが描画されない', () => {
    renderMenu({ open: false })
    expect(screen.queryByText('ログアウト')).not.toBeInTheDocument()
  })

  test('open=true のときポップアップが描画される', () => {
    renderMenu({ open: true })
    expect(screen.getByText('ログアウト')).toBeInTheDocument()
  })

  test('accounts がある場合は切り替えヘッダーが表示される', () => {
    renderMenu({ open: true, accounts: [alice] })
    expect(screen.getByText('アカウントの切り替え')).toBeInTheDocument()
  })

  test('accounts が空のときは切り替えヘッダーが表示されない', () => {
    renderMenu({ open: true, accounts: [] })
    expect(screen.queryByText('アカウントの切り替え')).not.toBeInTheDocument()
  })

  test('accounts のハンドルがリストに表示される', () => {
    renderMenu({ open: true, accounts: [alice, bob] })
    expect(screen.getByText('alice.bsky.social')).toBeInTheDocument()
    expect(screen.getByText('bob.bsky.social')).toBeInTheDocument()
  })
})

describe('UserMenu — コールバック', () => {
  test('アカウントボタンクリックで onToggle が呼ばれる', () => {
    const onToggle = vi.fn()
    renderMenu({ onToggle })
    fireEvent.click(screen.getByRole('button', { name: 'アカウントメニュー' }))
    expect(onToggle).toHaveBeenCalled()
  })

  test('アカウントをクリックすると onSwitchAccount(did) が呼ばれる', () => {
    const onSwitchAccount = vi.fn()
    renderMenu({ open: true, accounts: [alice], onSwitchAccount })
    fireEvent.click(screen.getByText('alice.bsky.social'))
    expect(onSwitchAccount).toHaveBeenCalledWith('did:plc:a1')
  })

  test('「別のアカウントを追加」クリックで onAddAccount が呼ばれる', () => {
    const onAddAccount = vi.fn()
    renderMenu({ open: true, onAddAccount })
    fireEvent.click(screen.getByText('別のアカウントを追加'))
    expect(onAddAccount).toHaveBeenCalled()
  })

  test('「ログアウト」クリックで onLogout が呼ばれる', () => {
    const onLogout = vi.fn()
    renderMenu({ open: true, onLogout })
    fireEvent.click(screen.getByText('ログアウト'))
    expect(onLogout).toHaveBeenCalled()
  })
})
