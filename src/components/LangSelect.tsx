import { createEffect, createSignal, For, onCleanup, Show } from 'solid-js'

import { langNativeLabel,LANGS } from '../lib/langs'
import styles from './LangSelect.module.css'

const DROPDOWN_MAX_HEIGHT = 200

interface Props {
  value: string[]
  onChange: (v: string[]) => void
}

export default function LangSelect(props: Props) {
  const [open, setOpen] = createSignal(false)
  const [dropdownPos, setDropdownPos] = createSignal<{ top?: string; bottom?: string; right: string }>({ top: '0px', right: '0px' })
  let addButtonRef: HTMLButtonElement | undefined

  const available = () => LANGS.filter(l => !props.value.includes(l.code))

  function add(code: string) {
    props.onChange([...props.value, code])
    setOpen(false)
  }

  function remove(code: string) {
    props.onChange(props.value.filter(c => c !== code))
  }

  function handleDocClick() {
    setOpen(false)
  }

  function toggleDropdown(e: MouseEvent) {
    e.stopPropagation()
    if (!open()) {
      const rect = addButtonRef?.getBoundingClientRect()
      if (rect) {
        const right = `${window.innerWidth - rect.right}px`
        const spaceBelow = window.innerHeight - rect.bottom
        if (spaceBelow < DROPDOWN_MAX_HEIGHT) {
          setDropdownPos({ bottom: `${window.innerHeight - rect.top + 4}px`, right })
        } else {
          setDropdownPos({ top: `${rect.bottom + 4}px`, right })
        }
      }
    }
    setOpen(o => !o)
  }

  createEffect(() => {
    if (open()) {
      document.addEventListener('click', handleDocClick)
    } else {
      document.removeEventListener('click', handleDocClick)
    }
  })

  onCleanup(() => {
    document.removeEventListener('click', handleDocClick)
  })

  return (
    <div class={styles.container}>
      <For each={props.value}>
        {code => (
          <span class={styles.chip}>
            {langNativeLabel(code)}
            <button class={styles.chipRemove} onClick={() => remove(code)} type="button">×</button>
          </span>
        )}
      </For>
      <Show when={available().length > 0}>
        <div class={styles.addWrapper}>
          <button
            ref={addButtonRef}
            class={styles.addButton}
            type="button"
            onClick={toggleDropdown}
          >
            + 追加
          </button>
          <Show when={open()}>
            <div class={styles.dropdown} style={dropdownPos()}>
              <For each={available()}>
                {lang => (
                  <button
                    class={styles.dropdownItem}
                    type="button"
                    onClick={e => { e.stopPropagation(); add(lang.code) }}
                  >
                    {lang.label}
                  </button>
                )}
              </For>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  )
}
