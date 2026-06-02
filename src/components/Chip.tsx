import type { JSX } from 'solid-js'
import { createSignal, For, Show } from 'solid-js'

import styles from './Chip.module.css'

const POPUP_WIDTH = 150
const SCREEN_WIDTH = 600

export interface ChipOption {
  id: string
  label: string
}

interface Props {
  icon: JSX.Element
  value: string
  header: string
  options: ChipOption[]
  selectedId: string
  open: boolean
  onToggle: () => void
  onSelect: (id: string) => void
  onSettings?: () => void
}

export default function Chip(props: Props) {
  let buttonRef: HTMLButtonElement | undefined
  const [popupPos, setPopupPos] = createSignal<{ left?: number; right?: number; bottom: number }>({ left: 0, bottom: 0 })

  function handleClick() {
    if (!props.open && buttonRef) {
      const rect = buttonRef.getBoundingClientRect()
      const bottom = window.innerHeight - rect.top
      if (rect.left + POPUP_WIDTH > SCREEN_WIDTH) {
        setPopupPos({ right: SCREEN_WIDTH - rect.right, bottom })
      } else {
        setPopupPos({ left: rect.left, bottom })
      }
    }
    props.onToggle()
  }

  const popupStyle = () => {
    const { left, right, bottom } = popupPos()
    return left !== undefined
      ? { left: `${left}px`, bottom: `${bottom}px` }
      : { right: `${right}px`, bottom: `${bottom}px` }
  }

  return (
    <>
      <button ref={buttonRef} class={styles.chip} type="button" onClick={handleClick}>
        <span class={styles.chipIcon}>{props.icon}</span>
        <span class={styles.chipValue}>{props.value}</span>
      </button>
      <Show when={props.open}>
        <div class={styles.popupWrapper} style={popupStyle()}>
          <div class={styles.popup}>
            <div class={styles.popupHeader}>{props.header}</div>
            <hr class={styles.popupDivider} />
            <For each={props.options}>
              {opt => (
                <button
                  class={`${styles.popupItem}${opt.id === props.selectedId ? ` ${styles.popupItemActive}` : ''}`}
                  type="button"
                  onClick={() => props.onSelect(opt.id)}
                >
                  {opt.label}
                </button>
              )}
            </For>
            <Show when={props.onSettings}>
              <hr class={styles.popupDivider} />
              <button class={styles.popupItem} type="button" onClick={props.onSettings}>
                詳細設定
              </button>
            </Show>
          </div>
        </div>
      </Show>
    </>
  )
}
