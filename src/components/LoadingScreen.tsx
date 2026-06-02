import styles from './LoadingScreen.module.css'

export default function LoadingScreen() {
  return (
    <div class={styles.container}>
      <img src="/logo.png" width={226} height={73} alt="FlyFree Glide" />
    </div>
  )
}
