# Architecture Decision Records — FlyFree Glide

Only the "why" goes here — not what the code does, but why this approach was chosen, what was tried and rejected, and what would break if changed.

---

## X text injection

### Adopted: ClipboardEvent + Object.defineProperty

React reads `event.clipboardData.getData('text/plain')` from the `paste` event to update its internal state, which activates the post button.

```ts
const event = new ClipboardEvent('paste', { clipboardData: dt, ... })
Object.defineProperty(event, 'clipboardData', { get: () => dt })
textarea.dispatchEvent(event)
```

`Object.defineProperty` is required because Firefox ignores the `clipboardData` option in the ClipboardEvent constructor — the property is never set as an own property, so defining a getter on the instance makes it work consistently across both browsers. Chrome also accepts `defineProperty` without issue (the catch branch never actually runs).

### Rejected alternatives

| Approach | Reason |
|---|---|
| InputEvent (innerHTML mutation) | DOM changes but React's internal state is not updated; post button stays disabled |
| execCommand('insertText') | Duplicates content on multiline text |
| navigator.clipboard + execCommand('paste') | execCommand('paste') cannot be called from a content script |
| ClipboardEvent without defineProperty | Firefox gets an empty clipboardData, so React reads an empty string |

### What would break this

- X changes React's paste handler
- The `[data-testid="tweetTextarea_0"]` selector changes

---

## X image injection

### Adopted: Object.defineProperty + change event

`input.files` is read-only and cannot be assigned directly. The workaround is to override it with `Object.defineProperty` and then dispatch a `change` event.

```ts
Object.defineProperty(input, 'files', { value: dt.files, writable: true, configurable: true })
input.dispatchEvent(new Event('change', { bubbles: true }))
```

### Rejected alternatives

| Approach | Reason |
|---|---|
| DragEvent (drag and drop) | Firefox's React handler on x.com does not process drop events |
| ClipboardEvent paste (image) | Untested, but expected to hit the same empty clipboardData issue as text on Firefox |

### What would break this

- The `[data-testid="fileInput"]` / `input[type="file"]` selector changes

---

## Injection order and error isolation

### Text before image

Text injection (ClipboardEvent) focuses the compose area. Without this step, the file input does not appear in the DOM on `x.com/home`, causing image injection to time out. On `/compose/post` the order matters less, but the current order is preserved for consistency.

### Separate try-catch blocks

Wrapping both injections in a single try-catch would cause image injection to be skipped whenever text injection fails. Keeping them independent lets each succeed or fail on its own.

---

## Content script world split

| Script | World | Reason |
|---|---|---|
| content/index.ts | isolated | `browser.runtime.sendMessage` is only available in the isolated world |
| injector.content/index.ts | MAIN | ClipboardEvent must be dispatched from the MAIN world to reach React's handlers |

Data flows from isolated → MAIN via `window.postMessage`.

---

## Firefox MV3

Firefox MV2 does not have `browser.action` (the toolbar button API) — MV2 uses `browserAction`, which WXT's polyfill does not cover. Firefox has supported MV3 since version 109, so building with MV3 resolves this.

Both `dev:firefox` and `build:firefox` require the `--mv3` flag. Omitting it from either command causes the extension to fail to start on Firefox.

---

## hooks/ vs lib/

| Directory | What goes there |
|---|---|
| `src/hooks/` | Anything that uses SolidJS primitives (`createSignal`, `createEffect`, etc.) |
| `src/lib/` | Pure functions and type definitions with no dependency on SolidJS or the DOM |

### Decision rule

If the function can be called outside a SolidJS reactive root (e.g. in a plain unit test without `createRoot`), it belongs in `lib/`. If it cannot, it belongs in `hooks/`.

### What breaks if ignored

- Putting pure functions in `hooks/` makes it unclear whether a reactive root is needed, complicating test setup
- Putting signals in `lib/` triggers "owner not found" warnings when called outside a component
