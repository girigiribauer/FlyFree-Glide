# Architecture Decision Records — FlyFree Glide

コードを読めばわかることは書かない。なぜその実装を選んだか・他の手段がなぜ駄目だったか・何を変えると壊れるかを残す。

---

## X テキスト注入

### 採用: ClipboardEvent + Object.defineProperty

React は `paste` イベントの `event.clipboardData.getData('text/plain')` を読んで内部状態を更新する。これを通すことで投稿ボタンが活性化する。

```ts
const event = new ClipboardEvent('paste', { clipboardData: dt, ... })
Object.defineProperty(event, 'clipboardData', { get: () => dt })
textarea.dispatchEvent(event)
```

`Object.defineProperty` が必要な理由: Firefox は ClipboardEvent コンストラクタの `clipboardData` オプションを無視する。コンストラクタで own property が作られないため、インスタンスに getter を定義することで両ブラウザ共通で動く。Chrome でも defineProperty は成功する（catch は実際には通らない）。

### 不採用の手段

| 手段 | 理由 |
|---|---|
| InputEvent（innerHTML 書き換え） | DOM は変わるが React 内部状態が更新されず、投稿ボタンが活性化しない |
| execCommand('insertText') | 多行テキストで内容が重複するバグがある |
| navigator.clipboard + execCommand('paste') | Content Script から execCommand('paste') は実行不可 |
| ClipboardEvent のみ（defineProperty なし） | Firefox は clipboardData が空になるため React が空文字を読む |

### 壊れる条件

- X が React のペーストハンドラを変えた場合
- `[data-testid="tweetTextarea_0"]` セレクタが変わった場合

---

## X 画像注入

### 採用: Object.defineProperty + change イベント

`input.files` は read-only のため直接代入できない。`Object.defineProperty` で上書きしてから `change` イベントを発火する。

```ts
Object.defineProperty(input, 'files', { value: dt.files, writable: true, configurable: true })
input.dispatchEvent(new Event('change', { bubbles: true }))
```

### 不採用の手段

| 手段 | 理由 |
|---|---|
| DragEvent（D&D） | Firefox では x.com の React ハンドラが drop を処理しない |
| ClipboardEvent paste（画像） | 未検証。テキストと同様に Firefox で clipboardData が空になる問題が起きると予想される |

### 壊れる条件

- `[data-testid="fileInput"]` / `input[type="file"]` セレクタが変わった場合

---

## 注入の順序とエラー分離

### テキスト → 画像の順

テキスト注入（ClipboardEvent）が compose エリアをフォーカスする。これを先にやらないと、`x.com/home` で file input が DOM に現れず画像注入がタイムアウトする。`/compose/post` では順序依存は薄いが、現在はこの順序を維持している。

### try-catch を分離している理由

テキストと画像を同一 try-catch に入れると、テキスト失敗時に画像注入もスキップされる。独立して失敗・成功できるように別々にしている。

---

## content script の world 分割

| スクリプト | world | 理由 |
|---|---|---|
| content/index.ts | isolated | `browser.runtime.sendMessage` は isolated world でしか使えない |
| injector.content/index.ts | MAIN | ClipboardEvent を React のハンドラに届けるには MAIN world が必要 |

isolated → MAIN へのデータ渡しは `window.postMessage` 経由。

---

## Firefox MV3

Firefox MV2 では `browser.action`（ツールバーボタン）が存在しない（MV2 は `browserAction`）。WXT の polyfill も MV2 では機能しない。Firefox は MV3 を 109 以降でサポートしているため、MV3 でビルドすることで解決した。

`dev:firefox` / `build:firefox` どちらも `--mv3` フラグが必要。片方だけ付け忘れると Firefox で拡張が起動しない。
