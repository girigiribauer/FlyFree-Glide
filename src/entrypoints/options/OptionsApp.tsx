import { createSignal, For, onMount, Show } from 'solid-js'

import LangSelect from '../../components/LangSelect'
import Toggle from '../../components/Toggle'
import {
  type AutoCloseMode,
  type ContentLabel,
  DEFAULT_SETTINGS,
  formatLabelOption,
  formatLangOption,
  formatReactionOption,
  type LabelOption,
  type LangOption,
  loadSettings,
  makeDefaultLabelOption,
  makeDefaultLangOption,
  makeDefaultReactionOption,
  type ReactionOption,
  saveSettings,
  type Settings,
  type ThreadgateSettings,
} from '../../lib/settings'
import styles from './OptionsApp.module.css'

export default function OptionsApp() {
  const [settings, setSettings] = createSignal<Settings>(DEFAULT_SETTINGS)

  onMount(async () => {
    setSettings(await loadSettings())
  })

  async function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }))
    await saveSettings({ [key]: value })
  }

  function updateLangOption(id: string, patch: Partial<LangOption>) {
    return update('langOptions', settings().langOptions.map(o => o.id === id ? { ...o, ...patch } : o))
  }

  function addLangOption() {
    const opt: LangOption = { ...makeDefaultLangOption(), id: crypto.randomUUID() }
    return update('langOptions', [...settings().langOptions, opt])
  }

  function deleteLangOption(id: string) {
    return update('langOptions', settings().langOptions.filter(o => o.id !== id))
  }

  function updateReactionOption(id: string, patch: Partial<ReactionOption>) {
    return update('reactionOptions', settings().reactionOptions.map(o => o.id === id ? { ...o, ...patch } : o))
  }

  function updateThreadgate(id: string, patch: Partial<ThreadgateSettings>) {
    const opt = settings().reactionOptions.find(o => o.id === id)
    if (!opt) return
    return updateReactionOption(id, { threadgate: { ...opt.threadgate, ...patch } })
  }

  function addReactionOption() {
    const opt: ReactionOption = { ...makeDefaultReactionOption(), id: crypto.randomUUID() }
    return update('reactionOptions', [...settings().reactionOptions, opt])
  }

  function deleteReactionOption(id: string) {
    return update('reactionOptions', settings().reactionOptions.filter(o => o.id !== id))
  }

  function updateLabelOption(id: string, patch: Partial<LabelOption>) {
    return update('labelOptions', settings().labelOptions.map(o => o.id === id ? { ...o, ...patch } : o))
  }

  function selectAdultLabel(id: string, label: ContentLabel | null) {
    const opt = settings().labelOptions.find(o => o.id === id)
    if (!opt) return
    const ADULT: ContentLabel[] = ['sexual', 'nudity', 'porn']
    const rest = opt.labels.filter(l => !ADULT.includes(l))
    return updateLabelOption(id, { labels: label ? [...rest, label] : rest })
  }

  function toggleGraphicMedia(id: string, checked: boolean) {
    const opt = settings().labelOptions.find(o => o.id === id)
    if (!opt) return
    const labels: ContentLabel[] = checked
      ? [...opt.labels.filter(l => l !== 'graphic-media'), 'graphic-media']
      : opt.labels.filter(l => l !== 'graphic-media')
    return updateLabelOption(id, { labels })
  }

  function addLabelOption() {
    const opt: LabelOption = { ...makeDefaultLabelOption(), id: crypto.randomUUID() }
    return update('labelOptions', [...settings().labelOptions, opt])
  }

  function deleteLabelOption(id: string) {
    return update('labelOptions', settings().labelOptions.filter(o => o.id !== id))
  }

  return (
    <main class={styles.page}>
      <header class={styles.header}>
        <img src="/logo.png" width={113} height={37} alt="FlyFree Glide" />
      </header>

      <section class={styles.section}>
        <h2 class={styles.sectionTitle}>全般</h2>
        <div class={styles.row}>
          <div class={styles.rowLabel}>
            投稿後の動作
          </div>
          <div class={styles.radioGroup}>
            {(['immediate', 'countdown', 'manual'] as const).map(mode => (
              <label class={styles.radioLabel}>
                <input
                  type="radio"
                  name="autoClose"
                  value={mode}
                  checked={settings().autoClose === mode}
                  onChange={() => update('autoClose', mode as AutoCloseMode)}
                />
                {{ immediate: 'すぐ閉じる', countdown: '10秒後に閉じる', manual: '閉じない' }[mode]}
              </label>
            ))}
          </div>
        </div>
        <div class={styles.row}>
          <div class={styles.rowLabel}>
            空白で開く
            <div class={styles.rowDescription}>デフォルトは開いているページのタイトルと URL を自動入力します</div>
          </div>
          <Toggle checked={settings().startBlank} onChange={v => update('startBlank', v)} aria-label="空白で開く" />
        </div>
      </section>

      <section class={styles.section}>
        <h2 class={styles.sectionTitle}>X</h2>
        <div class={styles.row}>
          <div class={styles.rowLabel}>
            X に蓋をする
            <div class={styles.rowDescription}>アイコンやカウンターなど、X に関連するすべての表示が画面に出なくなります</div>
          </div>
          <Toggle checked={settings().xHidden} onChange={v => update('xHidden', v)} aria-label="X に蓋をする" />
        </div>
        <Show when={!settings().xHidden}>
          <div class={styles.row}>
            <div class={styles.rowLabel}>
              「Xにも投稿」を追加
              <div class={styles.rowDescription}>公式クライアントの共有メニューに「Xにも投稿」を追加します</div>
            </div>
            <Toggle checked={settings().bskyXShare} onChange={v => update('bskyXShare', v)} />
          </div>
          <div class={styles.row}>
            <div class={styles.rowLabel}>
              投稿後に X の投稿画面を自動で開く
              <div class={styles.rowDescription}>Bluesky への投稿完了後、X の投稿画面を自動で開きます</div>
            </div>
            <Toggle checked={settings().xAutoOpen} onChange={v => update('xAutoOpen', v)} />
          </div>
          <div class={styles.row}>
            <div class={styles.rowLabel}>
              チラ見せモード
              <div class={styles.rowDescription}>途中で投稿をぶった斬りつつ、Bluesky の元投稿にリンクして移行を煽るモードです</div>
            </div>
            <Toggle checked={settings().xCliffhanger} onChange={v => update('xCliffhanger', v)} />
          </div>
        </Show>
      </section>

      <section class={styles.section}>
        <h2 class={styles.sectionTitle}><span class={styles.sectionPrefix}>Bluesky / </span>言語</h2>
        <For each={settings().langOptions}>
          {opt => (
            <div class={styles.optionCard}>
              <div class={styles.optionHeader}>
                <span class={styles.optionSummary}>{formatLangOption(opt)}</span>
                <button
                  class={styles.deleteButton}
                  onClick={() => deleteLangOption(opt.id)}
                  disabled={settings().langOptions.length <= 1}
                  aria-label="削除"
                >削除</button>
              </div>
              <div class={styles.optionBody}>
                <LangSelect value={opt.langs} onChange={v => updateLangOption(opt.id, { langs: v })} />
              </div>
            </div>
          )}
        </For>
        <button class={styles.addButton} onClick={addLangOption}>+ 追加</button>
      </section>

      <section class={styles.section}>
        <h2 class={styles.sectionTitle}><span class={styles.sectionPrefix}>Bluesky / </span>投稿リアクション</h2>
        <For each={settings().reactionOptions}>
          {opt => (
            <div class={styles.optionCard}>
              <div class={styles.optionHeader}>
                <span class={styles.optionSummary}>{formatReactionOption(opt)}</span>
                <button
                  class={styles.deleteButton}
                  onClick={() => deleteReactionOption(opt.id)}
                  disabled={settings().reactionOptions.length <= 1}
                  aria-label="削除"
                >削除</button>
              </div>
              <div class={styles.optionBody}>
                <div class={styles.optionField}>
                  <span class={styles.optionFieldLabel}>返信</span>
                  <div>
                    <select
                      class={styles.select}
                      value={opt.threadgate.type}
                      onChange={e => updateThreadgate(opt.id, { type: e.currentTarget.value as ThreadgateSettings['type'] })}
                    >
                      <option value="everybody">誰でも</option>
                      <option value="custom">カスタム</option>
                      <option value="nobody">不可</option>
                    </select>
                    <Show when={opt.threadgate.type === 'custom'}>
                      <div class={styles.checkboxGroup}>
                        <label class={styles.checkboxLabel}>
                          <input type="checkbox" checked={opt.threadgate.allowMention}
                            onChange={e => updateThreadgate(opt.id, { allowMention: e.currentTarget.checked })} />
                          メンションしたユーザー
                        </label>
                        <label class={styles.checkboxLabel}>
                          <input type="checkbox" checked={opt.threadgate.allowFollowing}
                            onChange={e => updateThreadgate(opt.id, { allowFollowing: e.currentTarget.checked })} />
                          フォロー中のユーザー
                        </label>
                        <label class={styles.checkboxLabel}>
                          <input type="checkbox" checked={opt.threadgate.allowFollower}
                            onChange={e => updateThreadgate(opt.id, { allowFollower: e.currentTarget.checked })} />
                          フォロワー
                        </label>
                      </div>
                    </Show>
                  </div>
                </div>
                <div class={styles.optionField}>
                  <span class={styles.optionFieldLabel}>引用</span>
                  <Toggle checked={!opt.disableEmbeds} onChange={v => updateReactionOption(opt.id, { disableEmbeds: !v })} />
                </div>
              </div>
            </div>
          )}
        </For>
        <button class={styles.addButton} onClick={addReactionOption}>+ 追加</button>
      </section>

      <section class={styles.section}>
        <h2 class={styles.sectionTitle}><span class={styles.sectionPrefix}>Bluesky / </span>画像ラベリング</h2>
        <For each={settings().labelOptions}>
          {opt => (
            <div class={styles.optionCard}>
              <div class={styles.optionHeader}>
                <span class={styles.optionSummary}>{formatLabelOption(opt)}</span>
                <button
                  class={styles.deleteButton}
                  onClick={() => deleteLabelOption(opt.id)}
                  disabled={settings().labelOptions.length <= 1}
                  aria-label="削除"
                >削除</button>
              </div>
              <div class={styles.optionBody}>
                <div class={styles.labelGroup}>
                  <div class={styles.labelGroupTitle}>成人向けコンテンツ</div>
                  <div class={styles.checkboxGroup}>
                    {([null, 'sexual', 'nudity', 'porn'] as const).map(label => (
                      <label class={styles.checkboxLabel}>
                        <input type="radio" name={`adult-${opt.id}`}
                          checked={(() => {
                            const labels = settings().labelOptions.find(o => o.id === opt.id)?.labels ?? []
                            const ADULT: ContentLabel[] = ['sexual', 'nudity', 'porn']
                            return label === null ? !labels.some(l => ADULT.includes(l)) : labels.includes(label)
                          })()}
                          onChange={() => selectAdultLabel(opt.id, label)} />
                        {{ sexual: 'きわどい', nudity: 'ヌード', porn: '成人向け（ポルノ等）', '': 'なし' }[label ?? '']}
                      </label>
                    ))}
                  </div>
                </div>
                <div class={styles.labelGroup}>
                  <div class={styles.labelGroupTitle}>その他</div>
                  <div class={styles.checkboxGroup}>
                    <label class={styles.checkboxLabel}>
                      <input type="checkbox"
                        checked={settings().labelOptions.find(o => o.id === opt.id)?.labels.includes('graphic-media') ?? false}
                        onChange={e => toggleGraphicMedia(opt.id, e.currentTarget.checked)} />
                      生々しいメディア（グロ・事故・戦争・災害等）
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </For>
        <button class={styles.addButton} onClick={addLabelOption}>+ 追加</button>
      </section>

      <section class={styles.section}>
        <h2 class={styles.sectionTitle}>リンク</h2>
        <ul class={styles.links}>
          <li><a href="https://github.com/girigiribauer/flyfree-glide" target="_blank">GitHub リポジトリ</a></li>
          <li><a href="https://bsky.app/profile/girigiribauer.com" target="_blank">@girigiribauer.com</a></li>
        </ul>
      </section>
    </main>
  )
}
