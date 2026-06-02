import styles from './Toggle.module.css'

interface Props {
  checked: boolean
  onChange: (v: boolean) => void
  'aria-label'?: string
}

export default function Toggle(props: Props) {
  return (
    <label class={styles.toggle}>
      <input
        type="checkbox"
        checked={props.checked}
        onChange={e => props.onChange(e.currentTarget.checked)}
        aria-label={props['aria-label']}
      />
      <span class={styles.toggleTrack} />
    </label>
  )
}
