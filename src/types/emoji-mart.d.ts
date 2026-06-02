export {}

declare module 'solid-js' {
  namespace JSX {
    interface IntrinsicElements {
      'em-emoji-picker': {
        ref?: (el: HTMLElement) => void
        theme?: string
        locale?: string
        style?: string
      }
    }
  }
}
