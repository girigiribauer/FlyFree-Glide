import { batch, createSignal, For, onMount, onCleanup, Show } from 'solid-js'
import { Agent } from '@atproto/api'
import type { OAuthSession } from '@atproto/oauth-client-browser'
import { getOAuthClient } from '../../lib/client'
import { postToBluesky } from '../../lib/post'
import { canPost, remainingGraphemes, isOverLimit } from '../../lib/composer'
import { optimizeImage } from '../../lib/image'
import { MAX_IMAGE_SIZE, MAX_POST_IMAGES } from '../../lib/constants'

interface Props {
  session: OAuthSession
  initialText: string
  onPost: (url: string) => void
  onLogout: () => void
}

export default function ComposeScreen(props: Props) {
  const [text, setText] = createSignal(props.initialText)
  const [images, setImages] = createSignal<File[]>([])
  const [previews, setPreviews] = createSignal<string[]>([])
  const [dragging, setDragging] = createSignal(false)
  const [posting, setPosting] = createSignal(false)
  const [error, setError] = createSignal('')
  let fileInputRef: HTMLInputElement | undefined
  let textareaRef: HTMLTextAreaElement | undefined
  let dragCounter = 0

  onMount(() => {
    if (textareaRef) {
      textareaRef.focus()
      const len = textareaRef.value.length
      textareaRef.setSelectionRange(len, len)
    }
  })

  onCleanup(() => {
    previews().forEach(url => URL.revokeObjectURL(url))
  })

  function addFiles(files: File[]) {
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    if (imageFiles.length === 0) return
    batch(() => {
      const next = [...images(), ...imageFiles].slice(0, MAX_POST_IMAGES)
      const added = next.slice(images().length)
      setImages(next)
      setPreviews([...previews(), ...added.map(f => URL.createObjectURL(f))].slice(0, MAX_POST_IMAGES))
    })
  }

  function handleImageSelect(e: Event) {
    const files = Array.from((e.currentTarget as HTMLInputElement).files ?? [])
    addFiles(files)
    if (fileInputRef) fileInputRef.value = ''
  }

  function removeImage(index: number) {
    URL.revokeObjectURL(previews()[index])
    batch(() => {
      setImages(prev => prev.filter((_, i) => i !== index))
      setPreviews(prev => prev.filter((_, i) => i !== index))
    })
  }

  function handleDragEnter(e: DragEvent) {
    e.preventDefault()
    dragCounter++
    if (dragCounter === 1) setDragging(true)
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault()
    dragCounter--
    if (dragCounter === 0) setDragging(false)
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    dragCounter = 0
    setDragging(false)
    const files = Array.from(e.dataTransfer?.files ?? [])
    addFiles(files)
  }

  async function post() {
    if (!canPost(text(), images().length)) return
    setPosting(true)
    setError('')
    try {
      const agent = new Agent(props.session)
      const optimizedImages = await Promise.all(images().map(f => optimizeImage(f, MAX_IMAGE_SIZE)))
      const url = await postToBluesky(agent, text(), optimizedImages)
      previews().forEach(u => URL.revokeObjectURL(u))
      batch(() => {
        setText('')
        setImages([])
        setPreviews([])
      })
      props.onPost(url)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setPosting(false)
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.metaKey && e.key === 'Enter') {
      e.preventDefault()
      post()
    }
    if (e.ctrlKey && e.key === 'a') {
      e.preventDefault()
      ;(e.currentTarget as HTMLTextAreaElement).setSelectionRange(0, 0)
    }
    if (e.ctrlKey && e.key === 'e') {
      e.preventDefault()
      const len = (e.currentTarget as HTMLTextAreaElement).value.length
      ;(e.currentTarget as HTMLTextAreaElement).setSelectionRange(len, len)
    }
  }

  async function logout() {
    try {
      await getOAuthClient().revoke(props.session.did)
    } catch {}
    props.onLogout()
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        outline: dragging() ? '2px dashed #0085ff' : undefined,
        'border-radius': '4px',
      }}
    >
      <p>{props.session.did}</p>
      <textarea
        placeholder="What's on your mind?"
        value={text()}
        ref={textareaRef}
        onInput={e => setText(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        rows={10}
        style={{ width: '100%', 'box-sizing': 'border-box' }}
        disabled={posting()}
      />
      <div>
        <span style={{ color: isOverLimit(text()) ? 'red' : undefined }}>
          {remainingGraphemes(text())}
        </span>
        <button onClick={post} disabled={posting() || !canPost(text(), images().length)}>
          {posting() ? 'Posting...' : 'Post to Bluesky'}
        </button>
      </div>

      <input
        type="file"
        accept="image/*"
        multiple
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleImageSelect}
      />
      <button onClick={() => fileInputRef?.click()} disabled={posting() || images().length >= MAX_POST_IMAGES}>
        画像を追加 ({images().length}/{MAX_POST_IMAGES})
      </button>

      <Show when={images().length > 0}>
        <div style={{ display: 'flex', gap: '8px', 'flex-wrap': 'wrap', 'margin-top': '8px' }}>
          <For each={previews()}>
            {(src, i) => (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img
                  src={src}
                  alt={images()[i()]?.name}
                  style={{ width: '80px', height: '80px', 'object-fit': 'cover', 'border-radius': '4px', display: 'block' }}
                />
                <button
                  onClick={() => removeImage(i())}
                  disabled={posting()}
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    background: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    border: 'none',
                    'border-radius': '50%',
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer',
                    'font-size': '12px',
                    'line-height': '1',
                    padding: '0',
                  }}
                >
                  ×
                </button>
              </div>
            )}
          </For>
        </div>
      </Show>

      <Show when={error()}>
        <p style={{ color: 'red' }}>{error()}</p>
      </Show>

      <button onClick={logout}>Logout</button>
    </div>
  )
}
