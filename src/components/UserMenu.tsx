import { For, Show } from 'solid-js'

import type { AccountInfo } from '../lib/accounts'
import { t } from '../lib/i18n'
import { PersonIcon } from './Icons'
import styles from './UserMenu.module.css'

interface Props {
  currentUser: AccountInfo
  accounts: AccountInfo[]
  open: boolean
  onToggle: () => void
  onSwitchAccount: (did: string) => void
  onAddAccount: () => void
  onLogout: () => void
}

export default function UserMenu(props: Props) {
  return (
    <div class={styles.wrapper}>
      <button
        class={styles.button}
        type="button"
        aria-label={t('accountMenuAriaLabel')}
        onClick={props.onToggle}
      >
        <div class={styles.userIcon}>
          <Show when={props.currentUser.avatarUrl} fallback={<PersonIcon size={36} />}>
            {url => <img src={url()} alt="" class={styles.userIconImg} />}
          </Show>
        </div>
        <svg width="9" height="8" viewBox="0 0 9 8" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5.39609 6.51601C4.95861 7.1471 4.02551 7.1471 3.58803 6.51601L0.268003 1.72669C-0.237697 0.997193 0.284394 5.24521e-06 1.17203 5.24521e-06L7.81209 5.24521e-06C8.69973 5.24521e-06 9.22182 0.997194 8.71612 1.72669L5.39609 6.51601Z" fill="#ACB8B3"/>
        </svg>
      </button>
      <Show when={props.open}>
        <div class={styles.popup}>
          <Show when={props.accounts.length > 0}>
            <div class={styles.popupHeader}>{t('switchAccount')}</div>
            <hr class={styles.divider} />
            <For each={props.accounts}>
              {account => (
                <button
                  class={styles.item}
                  type="button"
                  onClick={() => props.onSwitchAccount(account.did)}
                >
                  <div class={styles.itemIcon}>
                    <Show when={account.avatarUrl} fallback={<PersonIcon size={18} />}>
                      {url => <img src={url()} alt="" class={styles.userIconImg} />}
                    </Show>
                  </div>
                  <span class={styles.itemLabel}>{account.handle}</span>
                </button>
              )}
            </For>
            <hr class={styles.divider} />
          </Show>
          <button class={styles.item} type="button" onClick={props.onAddAccount}>
            {t('addAccount')}
          </button>
          <button class={styles.item} type="button" onClick={props.onLogout}>
            {t('logout')}
          </button>
        </div>
      </Show>
    </div>
  )
}
