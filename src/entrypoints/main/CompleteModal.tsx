import { createSignal, onCleanup,onMount } from 'solid-js'

const AUTO_CLOSE_SEC = 5

interface Props {
  url: string
  onClose: () => void
}

export default function CompleteModal(props: Props) {
  const [count, setCount] = createSignal(AUTO_CLOSE_SEC)

  onMount(() => {
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
    <div style={{ position: 'fixed', inset: '0', background: 'white', padding: '16px' }}>
      <p>投稿しました！</p>
      <a
        href={props.url}
        target="_blank"
        rel="noreferrer"
        onClick={props.onClose}
      >
        Bluesky で見る
      </a>
      <p>{count()} 秒後に自動で閉じます</p>
    </div>
  )
}
