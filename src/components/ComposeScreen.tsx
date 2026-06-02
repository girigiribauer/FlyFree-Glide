import { Agent } from '@atproto/api'
import type { OAuthSession } from '@atproto/oauth-client-browser'
import data from '@emoji-mart/data'
import { init } from 'emoji-mart'
import { batch, createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js'

import { useEmojiCursor } from '../hooks/useEmojiCursor'
import { useImageEntries } from '../hooks/useImageEntries'
import { useLinkCard } from '../hooks/useLinkCard'
import { useMentionSearch } from '../hooks/useMentionSearch'
import type { AccountInfo } from '../lib/accounts'
import { canPost, MAX_GRAPHEMES, usedGraphemes } from '../lib/composer'
import { MAX_IMAGE_SIZE } from '../lib/constants'
import { getLang, t } from '../lib/i18n'
import { optimizeImage } from '../lib/image'
import { computeInsert, parseMention } from '../lib/mention'
import type { LinkCard } from '../lib/ogp'
import { postToBluesky } from '../lib/post'
import { buildMirrorHtml } from '../lib/richtext'
import { formatLabelOption, formatLangOption, formatReactionOption, type Settings } from '../lib/settings'
import { removeLinkCardUrl } from '../lib/urlHelpers'
import { composeTeaserText, countXChars, uint8ToBase64, type XPending } from '../lib/xpost'
import Chip from './Chip'
import styles from './ComposeScreen.module.css'
import { BlueskyIcon, ChipLabelIcon, ChipLangIcon, ChipReactionIcon, ChipXIcon, EmojiIcon, ImageIcon, XIcon } from './Icons'
import UserMenu from './UserMenu'


const MAX_X_CHARS = 280

interface Props {
  session: OAuthSession
  currentUser: AccountInfo
  initialText: string
  accounts: AccountInfo[]
  settings: Settings
  onSettingsChange: (patch: Partial<Settings>) => void
  onOpenSettings: () => void
  onPost: (url: string, xPending: XPending) => void
  onSwitchAccount: (did: string) => void
  onAddAccount: () => void
  onLogout: () => void
}

type OpenPopup = 'lang' | 'reaction' | 'label' | 'user' | 'emoji' | null

export default function ComposeScreen(props: Props) {
  const [text, setText] = createSignal(props.initialText)
  const [posting, setPosting] = createSignal(false)
  const [error, setError] = createSignal('')
  const [openPopup, setOpenPopup] = createSignal<OpenPopup>(null)
  const [selectedLangId, setSelectedLangId] = createSignal(props.settings.langOptions[0]?.id ?? '')
  const [selectedReactionId, setSelectedReactionId] = createSignal(props.settings.reactionOptions[0]?.id ?? '')
  const [selectedLabelId, setSelectedLabelId] = createSignal(props.settings.labelOptions[0]?.id ?? '')

  const selectedLang = () => props.settings.langOptions.find(o => o.id === selectedLangId()) ?? props.settings.langOptions[0]
  const selectedReaction = () => props.settings.reactionOptions.find(o => o.id === selectedReactionId()) ?? props.settings.reactionOptions[0]
  const selectedLabel = () => props.settings.labelOptions.find(o => o.id === selectedLabelId()) ?? props.settings.labelOptions[0]

  const [dragging, setDragging] = createSignal(false)
  const [mentionQuery, setMentionQuery] = createSignal<string | null>(null)
  const [mentionPos, setMentionPos] = createSignal({ top: 0, left: 0 })

  let fileInputRef: HTMLInputElement | undefined
  let textareaRef: HTMLTextAreaElement | undefined
  let mirrorRef: HTMLDivElement | undefined
  let dragCounter = 0

  const images = useImageEntries()
  const linkCard = useLinkCard(text)
  const emojiCursor = useEmojiCursor(() => textareaRef, text)
  const mentionSearch = useMentionSearch(props.session)

  onMount(() => {
    void init({ data })
    if (textareaRef) {
      textareaRef.focus()
      const len = textareaRef.value.length
      textareaRef.setSelectionRange(len, len)
    }
    linkCard.scheduleDetection(props.initialText)

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenPopup(null)
    }
    document.addEventListener('keydown', handleKeyDown)
    onCleanup(() => document.removeEventListener('keydown', handleKeyDown))
  })

  function togglePopup(name: OpenPopup) {
    setOpenPopup(prev => prev === name ? null : name)
  }

  function closeMention() {
    setMentionQuery(null)
    mentionSearch.reset()
  }

  function calculateMentionPos() {
    if (!textareaRef || !mirrorRef) return
    const cursor = textareaRef.selectionStart
    const before = text().slice(0, cursor)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    const savedHtml = mirrorRef.innerHTML
    mirrorRef.innerHTML = before + '<span id="__cm__" style="display:inline-block;width:0;height:1em"></span>'
    const marker = mirrorRef.querySelector('#__cm__')
    const markerRect = marker?.getBoundingClientRect()
    mirrorRef.innerHTML = savedHtml
    if (!markerRect) return

    const lineHeight = 20 * 1.6
    const cursorTop = markerRect.top
    const cursorBottom = cursorTop + lineHeight
    const dropdownH = 220
    const dropdownW = 280
    const footerH = 41

    const top = cursorBottom + dropdownH > window.innerHeight - footerH
      ? cursorTop - dropdownH
      : cursorBottom
    const left = Math.max(0, Math.min(markerRect.left, window.innerWidth - dropdownW))
    setMentionPos({ top, left })
  }

  function checkMention() {
    if (!textareaRef) return
    const result = parseMention(text(), textareaRef.selectionStart)
    if (result) {
      setMentionQuery(result.query)
      calculateMentionPos()
      mentionSearch.schedule(result.query)
    } else {
      closeMention()
    }
  }

  function insertMention(handle: string) {
    if (!textareaRef) return
    const result = computeInsert(text(), textareaRef.selectionStart, handle)
    if (!result) return
    setText(result.newText)
    linkCard.scheduleDetection(result.newText)
    const el = textareaRef
    requestAnimationFrame(() => {
      el.setSelectionRange(result.newCursor, result.newCursor)
      el.focus()
    })
    closeMention()
  }

  function handleTextareaInput(e: Event) {
    const val = (e.currentTarget as HTMLTextAreaElement).value
    setText(val)
    linkCard.scheduleDetection(val)
    checkMention()
  }

  function handleTextareaBlur() {
    emojiCursor.saveSelection()
  }

  function openEmojiPicker() {
    togglePopup('emoji')
  }

  function handleEmojiSelect(native: string) {
    const newText = emojiCursor.applyEmoji(native)
    setText(newText)
    linkCard.scheduleDetection(newText)
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

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    dragCounter = 0
    setDragging(false)
    images.addFiles(Array.from(e.dataTransfer?.files ?? []))
  }

  function handleImageSelect(e: Event) {
    const files = Array.from((e.currentTarget as HTMLInputElement).files ?? [])
    images.addFiles(files)
    if (fileInputRef) fileInputRef.value = ''
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (mentionQuery() !== null && mentionSearch.candidates().length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        mentionSearch.setIndex(i => Math.min(i + 1, mentionSearch.candidates().length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        mentionSearch.setIndex(i => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const c = mentionSearch.candidates()[mentionSearch.index()]
        if (c) insertMention(c.handle)
        return
      }
    }
    if (e.key === 'Escape' && mentionQuery() !== null) {
      closeMention()
      e.stopPropagation()
      return
    }
    if (e.metaKey && e.key === 'Enter') {
      e.preventDefault()
      void post()
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

  function mirrorHtml(t: string): string {
    return buildMirrorHtml(t, { tag: styles.facetTag, link: styles.facetLink, mention: styles.facetMention })
  }

  function handleTextareaScroll(e: Event) {
    if (mirrorRef) mirrorRef.scrollTop = (e.currentTarget as HTMLTextAreaElement).scrollTop
  }

  const showLinkCard = () =>
    linkCard.detectedUrl() !== null &&
    linkCard.detectedUrl() !== linkCard.dismissedUrl() &&
    images.imageEntries().length === 0

  const bskyTextForCounting = createMemo(() => {
    const url = linkCard.detectedUrl()
    if (url && url !== linkCard.dismissedUrl() && images.imageEntries().length === 0 && (linkCard.fetchingCard() || linkCard.linkCard())) {
      return removeLinkCardUrl(text().trim(), url)
    }
    return text()
  })

  const bskyGraphemes = createMemo(() => usedGraphemes(bskyTextForCounting()))
  const bskyCanPost = createMemo(() => canPost(text(), images.imageEntries().length, bskyTextForCounting()))
  const xCharCount = createMemo(() => countXChars(text()))

  const submitButtonClass = () => {
    if (posting()) return `${styles.submitButton} ${styles.submitButtonPosting}`
    if (!bskyCanPost()) return `${styles.submitButton} ${styles.submitButtonDisabled}`
    return styles.submitButton
  }

  const xRemaining = () => MAX_X_CHARS - xCharCount()

  function buildTeaserBase(rawText: string): string {
    const cardUrl = linkCard.detectedUrl()
    if (cardUrl && cardUrl !== linkCard.dismissedUrl() && images.imageEntries().length === 0) {
      return removeLinkCardUrl(rawText, cardUrl)
    }
    return rawText
  }

  async function dryRun() {
    if (!bskyCanPost()) return
    setPosting(true)
    setError('')
    try {
      await new Promise(r => setTimeout(r, 1500))
      const entries = images.imageEntries()
      const optimizedImages = entries.length > 0
        ? await Promise.all(entries.map(({ file }) => optimizeImage(file, MAX_IMAGE_SIZE)))
        : []
      const fakeBskyUrl = 'https://bsky.app'
      const rawText = text().trim()
      const xPending: XPending = {
        text: props.settings.xCliffhanger ? composeTeaserText(buildTeaserBase(rawText), fakeBskyUrl) : rawText,
        images: optimizedImages.map((img, i) => ({
          data: uint8ToBase64(img.data),
          mimeType: img.mimeType,
          name: entries[i].file.name,
        })),
      }
      props.onPost(fakeBskyUrl, xPending)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setPosting(false)
    }
  }

  async function post() {
    if (!bskyCanPost()) return
    setPosting(true)
    setError('')
    try {
      const agent = new Agent(props.session)
      const entries = images.imageEntries()
      const optimizedImages = await Promise.all(entries.map(({ file }) => optimizeImage(file, MAX_IMAGE_SIZE)))
      const card = linkCard.linkCard()
      const cardEnabled = linkCard.detectedUrl() !== null && linkCard.detectedUrl() !== linkCard.dismissedUrl()
      const cardArg: LinkCard | null | undefined = !cardEnabled || images.imageEntries().length > 0
        ? null
        : card === null ? null : card
      const lang = selectedLang()
      const reaction = selectedReaction()
      const label = selectedLabel()
      const url = await postToBluesky(agent, text(), optimizedImages, cardArg, {
        langs: lang?.langs,
        threadgate: reaction?.threadgate,
        disableEmbeds: reaction?.disableEmbeds,
        labels: images.imageEntries().length > 0 ? label?.labels : undefined,
      })
      const rawText = text().trim()
      const xPending: XPending = {
        text: props.settings.xCliffhanger ? composeTeaserText(buildTeaserBase(rawText), url) : rawText,
        images: optimizedImages.map((img, i) => ({
          data: uint8ToBase64(img.data),
          mimeType: img.mimeType,
          name: entries[i].file.name,
        })),
      }
      batch(() => {
        setText('')
        images.clearEntries()
      })
      props.onPost(url, xPending)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setPosting(false)
    }
  }

  return (
    <div
      class={styles.screen}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={(e: DragEvent) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <Show when={openPopup() !== null}>
        <div class={styles.popupBackdrop} onClick={() => setOpenPopup(null)} />
      </Show>
      {/* Header */}
      <header class={styles.header}>
        <UserMenu
          currentUser={props.currentUser}
          accounts={props.accounts}
          open={openPopup() === 'user'}
          onToggle={() => togglePopup('user')}
          onSwitchAccount={did => { setOpenPopup(null); props.onSwitchAccount(did) }}
          onAddAccount={() => { setOpenPopup(null); props.onAddAccount() }}
          onLogout={() => { setOpenPopup(null); props.onLogout() }}
        />

        <div class={styles.headerRight}>
          <Show when={import.meta.env.DEV}>
            <button
              class={styles.dryRunButton}
              type="button"
              onClick={dryRun}
              disabled={posting() || !bskyCanPost()}
            >
              Dry Run
            </button>
          </Show>
          <button
            class={submitButtonClass()}
            type="button"
            onClick={post}
            disabled={posting() || !bskyCanPost()}
          >
            {posting() ? t('posting') : t('postButton')}
          </button>
        </div>
      </header>

      {/* Body */}
      <div
        class={styles.body}
        classList={{ [styles.dragging]: dragging() }}
      >
        <Show when={posting()}>
          <div class={styles.overlay} />
        </Show>

        <div class={styles.textareaWrapper}>
          <div
            class={styles.textareaMirror}
            ref={mirrorRef}
            innerHTML={mirrorHtml(text())}
          />
          <textarea
            class={styles.textarea}
            placeholder={t('composePlaceholder')}
            value={text()}
            ref={textareaRef}
            onInput={handleTextareaInput}
            onKeyDown={handleKeyDown}
            onBlur={handleTextareaBlur}
            onSelect={checkMention}
            onScroll={handleTextareaScroll}
            disabled={posting()}
          />
        </div>

        <Show when={images.imageEntries().length > 0}>
          <div class={styles.images}>
            <For each={images.imageEntries()}>
              {(entry, i) => (
                <div class={styles.imageTile}>
                  <div class={styles.imageTileFrame}>
                    <img src={entry.previewUrl} alt={entry.file.name} class={styles.imageTileImg} />
                  </div>
                  <button
                    class={styles.imageRemove}
                    type="button"
                    onClick={() => images.removeImage(i())}
                    disabled={posting()}
                  >×</button>
                </div>
              )}
            </For>
          </div>
        </Show>

        <Show when={showLinkCard()}>
          <div class={styles.linkCardOuter}>
            <div class={styles.linkCard}>
              <Show when={linkCard.fetchingCard()}>
                <span class={styles.linkCardFetching}>{t('linkCardFetching')}</span>
              </Show>
              <Show when={!linkCard.fetchingCard() && linkCard.linkCard() === null}>
                <span class={styles.linkCardFailed}>{t('linkCardFailed')}</span>
              </Show>
              <Show when={linkCard.linkCard()}>
                {card => (
                  <>
                    <Show when={card().thumbUrl}>
                      <img src={card().thumbUrl!} alt="" class={styles.linkCardThumb} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                    </Show>
                    <div class={styles.linkCardText}>
                      <p class={styles.linkCardTitle}>{card().title || linkCard.detectedUrl()}</p>
                      <p class={styles.linkCardHost}>{new URL(card().url).hostname}</p>
                    </div>
                  </>
                )}
              </Show>
            </div>
            <button
              class={styles.linkCardDismiss}
              type="button"
              aria-label={t('dismissLinkCard')}
              onClick={linkCard.dismiss}
            >×</button>
          </div>
        </Show>

        {/* Chips */}
        <div class={styles.chipsRow}>
          <Chip
            icon={<ChipLangIcon />}
            value={formatLangOption(selectedLang())}
            header={t('chipLang')}
            options={props.settings.langOptions.map(o => ({ id: o.id, label: formatLangOption(o) }))}
            selectedId={selectedLangId()}
            open={openPopup() === 'lang'}
            onToggle={() => togglePopup('lang')}
            onSelect={id => { setSelectedLangId(id); setOpenPopup(null) }}
            onSettings={() => { setOpenPopup(null); props.onOpenSettings() }}
          />
          <Chip
            icon={<ChipReactionIcon />}
            value={formatReactionOption(selectedReaction())}
            header={t('chipReaction')}
            options={props.settings.reactionOptions.map(o => ({ id: o.id, label: formatReactionOption(o) }))}
            selectedId={selectedReactionId()}
            open={openPopup() === 'reaction'}
            onToggle={() => togglePopup('reaction')}
            onSelect={id => { setSelectedReactionId(id); setOpenPopup(null) }}
            onSettings={() => { setOpenPopup(null); props.onOpenSettings() }}
          />
          <Show when={images.imageEntries().length > 0}>
            <Chip
              icon={<ChipLabelIcon />}
              value={formatLabelOption(selectedLabel())}
              header={t('chipLabel')}
              options={props.settings.labelOptions.map(o => ({ id: o.id, label: formatLabelOption(o) }))}
              selectedId={selectedLabelId()}
              open={openPopup() === 'label'}
              onToggle={() => togglePopup('label')}
              onSelect={id => { setSelectedLabelId(id); setOpenPopup(null) }}
              onSettings={() => { setOpenPopup(null); props.onOpenSettings() }}
            />
          </Show>
          <Show when={!props.settings.xHidden}>
            <button class={styles.chip} type="button" onClick={() => props.onSettingsChange({ xCliffhanger: !props.settings.xCliffhanger })}>
              <span class={styles.chipIcon}><ChipXIcon /></span>
              <span class={styles.chipValue}>{props.settings.xCliffhanger ? t('cliffhangerOn') : t('cliffhangerOff')}</span>
            </button>
          </Show>
        </div>
      </div>

      {/* Footer */}
      <footer class={styles.footer}>
        <Show when={posting()}>
          <div class={styles.footerLeft}>
            <div class={styles.footerSpinner} />
            <span class={styles.footerMessage}>{t('uploadingImages')}</span>
          </div>
        </Show>

        <Show when={!posting() && error()}>
          <div class={styles.footerLeft}>
            <div class={styles.footerErrorIcon}>!</div>
            <span class={styles.footerErrorMsg}>{error()}</span>
          </div>
          <button class={styles.footerErrorClose} type="button" onClick={() => setError('')}>
            {t('close')}
          </button>
        </Show>

        <Show when={!posting() && !error()}>
          <div class={styles.footerIcons}>
            <button
              class={styles.iconButton}
              type="button"
              aria-label={t('addImage')}
              disabled={posting() || images.imageEntries().length >= 4}
              onClick={() => fileInputRef?.click()}
            >
              <ImageIcon />
            </button>
            <div class={styles.emojiButtonWrapper}>
              <button
                class={styles.iconButton}
                type="button"
                aria-label={t('addEmoji')}
                disabled={posting()}
                onClick={openEmojiPicker}
              >
                <EmojiIcon />
              </button>
              <Show when={openPopup() === 'emoji'}>
                <div class={styles.emojiPickerPopup}>
                  <em-emoji-picker
                    ref={(el: HTMLElement) => {
                      const picker = el as HTMLElement & { props: Record<string, unknown> }
                      picker.props = picker.props ?? {}
                      picker.props.onEmojiSelect = (emoji: { native: string }) => {
                        handleEmojiSelect(emoji.native)
                      }
                    }}
                    theme="light"
                    locale={getLang()}
                    style="height: 320px"
                  />
                </div>
              </Show>
            </div>
          </div>
          <div class={styles.footerRightGroup}>
            <div class={styles.counters}>
              <span
                class={styles.counter}
                classList={{ [styles.counterOverLimit]: bskyGraphemes() > MAX_GRAPHEMES }}
              >
                <BlueskyIcon />
                {bskyGraphemes()}/{MAX_GRAPHEMES}
              </span>
              <Show when={!props.settings.xHidden}>
                <span
                  class={styles.counter}
                  classList={{ [styles.counterWarning]: xRemaining() < 0 }}
                >
                  <XIcon />
                  {xCharCount()}/{MAX_X_CHARS}
                </span>
              </Show>
            </div>
            <button class={styles.footerDetailBtn} type="button">{t('advancedSettings')}</button>
          </div>
        </Show>
      </footer>

      <input
        type="file"
        accept="image/*"
        multiple
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleImageSelect}
      />

      {/* Mention dropdown */}
      <Show when={mentionQuery() !== null}>
        <div
          class={styles.mentionDropdown}
          style={{ top: `${mentionPos().top}px`, left: `${mentionPos().left}px` }}
        >
          <Show when={mentionSearch.loading()}>
            <div class={styles.mentionStatus}>{t('searching')}</div>
          </Show>
          <Show when={!mentionSearch.loading() && mentionSearch.candidates().length === 0 && (mentionQuery() ?? '').length > 0}>
            <div class={styles.mentionStatus}>{t('noCandidates')}</div>
          </Show>
          <For each={mentionSearch.candidates()}>
            {(c, i) => (
              <button
                class={styles.mentionItem}
                classList={{ [styles.mentionItemActive]: i() === mentionSearch.index() }}
                type="button"
                onMouseEnter={() => mentionSearch.setIndex(i())}
                onClick={() => insertMention(c.handle)}
              >
                <Show when={c.avatar} fallback={<div class={styles.mentionAvatar} />}>
                  {url => <img src={url()} alt="" class={styles.mentionAvatar} />}
                </Show>
                <div class={styles.mentionInfo}>
                  <Show when={c.displayName}>
                    <span class={styles.mentionName}>{c.displayName}</span>
                  </Show>
                  <span class={styles.mentionHandle}>@{c.handle}</span>
                </div>
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}
