import { createSignal, onCleanup, onMount, Show } from 'solid-js'

import { AUTOCLOSE_COUNTDOWN_SEC } from '../lib/constants'
import styles from './CompleteScreen.module.css'

interface Props {
  url: string
  countdown: boolean
  xEnabled: boolean
  onOpenX: () => void
  onClose: () => void
}

function BskyIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="18" height="18" rx="1.8" fill="url(#bsky-complete-grad)" />
      <path d="M5.46445 4.24448C6.8671 5.30299 8.37572 7.44923 8.92969 8.6009C9.48366 7.44923 10.9923 5.30299 12.3949 4.24448C13.407 3.48073 15.0469 2.88977 15.0469 4.77023C15.0469 5.14578 14.8327 7.92508 14.707 8.37633C14.2703 9.94503 12.679 10.3451 11.2634 10.103C13.7378 10.5263 14.3672 11.9284 13.0078 13.3305C10.4261 15.9935 9.29717 12.6624 9.0079 11.8089C8.95487 11.6524 8.93005 11.5792 8.92969 11.6414C8.92932 11.5792 8.90451 11.6524 8.85148 11.8089C8.5622 12.6624 7.43328 15.9935 4.85156 13.3305C3.49219 11.9284 4.12162 10.5263 6.59596 10.103C5.18039 10.3451 3.58907 9.94503 3.15234 8.37633C3.02671 7.92508 2.8125 5.14578 2.8125 4.77023C2.8125 2.88977 4.45239 3.48073 5.46445 4.24448Z" fill="white" />
      <defs>
        <linearGradient id="bsky-complete-grad" x1="9" y1="0" x2="9" y2="18" gradientUnits="userSpaceOnUse">
          <stop stop-color="#0C7BFF" />
          <stop offset="1" stop-color="#58B8FF" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="18" height="18" rx="1.8" fill="black" />
      <path d="M9.82263 8.34384L13.5919 3.9375H12.6987L9.42584 7.76346L6.81183 3.9375H3.79688L7.74978 9.72303L3.79688 14.3438H4.69012L8.14633 10.3034L10.9069 14.3438H13.9219L9.82241 8.34384H9.82263ZM8.5992 9.774L8.19869 9.19789L5.01197 4.61374H6.38394L8.95566 8.3133L9.35618 8.88941L12.6991 13.6983H11.3271L8.5992 9.77422V9.774Z" fill="white" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 19H5V5h7V3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
    </svg>
  )
}

function SuccessBadge() {
  return (
    <div class={styles.badge}>
      <svg width="9" height="8" viewBox="0 0 9 8" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polyline points="1,4 3.5,6.5 8,1.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>
  )
}

export default function CompleteScreen(props: Props) {
  const [count, setCount] = createSignal(AUTOCLOSE_COUNTDOWN_SEC)

  onMount(() => {
    if (!props.countdown) return
    const interval = setInterval(() => {
      setCount(n => {
        if (n <= 1) {
          clearInterval(interval)
          props.onClose()
          return 0
        }
        return n - 1
      })
    }, 1000)
    onCleanup(() => clearInterval(interval))
  })

  return (
    <div class={styles.page}>
      <div class={styles.card}>
        <div class={styles.mediaList}>
          <a
            class={styles.row}
            href={props.url}
            target="_blank"
            rel="noreferrer"
            onClick={props.onClose}
          >
            <div class={styles.iconWrapper}>
              <BskyIcon />
              <SuccessBadge />
            </div>
            <span class={styles.rowContent}>
              投稿しました！
              <ExternalLinkIcon />
            </span>
          </a>

          <Show when={props.xEnabled}>
            <hr class={styles.divider} />
            <button class={styles.row} type="button" onClick={props.onOpenX}>
              <XIcon />
              <span class={styles.rowContent}>
                投稿画面を開く
                <ExternalLinkIcon />
              </span>
            </button>
          </Show>
        </div>
      </div>

      <Show when={props.countdown}>
        <p class={styles.countdown}>{count()}秒後にこのウィンドウを自動で閉じます</p>
      </Show>

      <div class={styles.logo}>
        <img src="/logo.png" width={112} height={36} alt="FlyFree Glide" />
      </div>
    </div>
  )
}
