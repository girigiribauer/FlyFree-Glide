import { afterEach, describe, expect, test } from 'vitest'

import { extractAuthorHandle, extractText, extractUrl, findPost, getMyHandle } from './bskyDom'

afterEach(() => { document.body.innerHTML = '' })

describe('getMyHandle', () => {
  test('profileMenuItem 配下の a タグからハンドルを返す', () => {
    document.body.innerHTML = `
      <div data-testid="profileMenuItem">
        <a href="/profile/girigiribauer.com">Profile</a>
      </div>
    `
    expect(getMyHandle()).toBe('girigiribauer.com')
  })

  test('nav の a タグにフォールバックする', () => {
    document.body.innerHTML = `
      <nav><a href="/profile/girigiribauer.com">Profile</a></nav>
    `
    expect(getMyHandle()).toBe('girigiribauer.com')
  })

  test('プロフィールリンクがない場合は null', () => {
    document.body.innerHTML = '<nav><a href="/home">Home</a></nav>'
    expect(getMyHandle()).toBeNull()
  })

  test('サブパスがあるリンクは無視する（/profile/x/post/y など）', () => {
    document.body.innerHTML = `
      <nav><a href="/profile/someone/post/abc">Post</a></nav>
    `
    expect(getMyHandle()).toBeNull()
  })
})

describe('findPost', () => {
  test('postThreadItem の data-testid を持つ祖先を返す', () => {
    document.body.innerHTML = `
      <div data-testid="postThreadItem-by-alice.bsky.social">
        <div><button id="btn">share</button></div>
      </div>
    `
    const btn = document.getElementById('btn')!
    const result = findPost(btn)
    expect(result?.getAttribute('data-testid')).toBe('postThreadItem-by-alice.bsky.social')
  })

  test('feedItem の data-testid も認識する', () => {
    document.body.innerHTML = `
      <div data-testid="feedItem-by-alice.bsky.social">
        <span id="el"></span>
      </div>
    `
    const el = document.getElementById('el')!
    expect(findPost(el)).not.toBeNull()
  })

  test('投稿コンテナがない場合は null', () => {
    document.body.innerHTML = '<div id="el"></div>'
    const el = document.getElementById('el')!
    expect(findPost(el)).toBeNull()
  })
})

describe('extractAuthorHandle', () => {
  test('data-testid から著者ハンドルを返す', () => {
    document.body.innerHTML = `<div data-testid="postThreadItem-by-alice.bsky.social"></div>`
    const post = document.querySelector('div') as HTMLElement
    expect(extractAuthorHandle(post)).toBe('alice.bsky.social')
  })

  test('data-testid がない場合は投稿リンクの URL から取得する', () => {
    document.body.innerHTML = `
      <div>
        <a href="/profile/bob.bsky.social/post/abc123">link</a>
      </div>
    `
    const post = document.querySelector('div') as HTMLElement
    expect(extractAuthorHandle(post)).toBe('bob.bsky.social')
  })

  test('どちらもない場合は null', () => {
    document.body.innerHTML = '<div></div>'
    const post = document.querySelector('div') as HTMLElement
    expect(extractAuthorHandle(post)).toBeNull()
  })
})

describe('extractText', () => {
  test('data-testid="postText" の要素からテキストを取得する', () => {
    document.body.innerHTML = `
      <div>
        <div data-testid="postText">hello world</div>
      </div>
    `
    const post = document.querySelector('div') as HTMLElement
    expect(extractText(post)).toBe('hello world')
  })

  test('postText がない場合は data-word-wrap にフォールバックする', () => {
    document.body.innerHTML = `<div><div data-word-wrap>fallback text</div></div>`
    const post = document.querySelector('div') as HTMLElement
    expect(extractText(post)).toBe('fallback text')
  })

  test('テキストがない場合は空文字', () => {
    document.body.innerHTML = '<div></div>'
    const post = document.querySelector('div') as HTMLElement
    expect(extractText(post)).toBe('')
  })
})

describe('extractUrl', () => {
  test('/post/ を含む a タグから bsky.app の完全 URL を返す', () => {
    document.body.innerHTML = `
      <div>
        <a href="/profile/alice.bsky.social/post/abc123">link</a>
      </div>
    `
    const post = document.querySelector('div') as HTMLElement
    expect(extractUrl(post)).toBe('https://bsky.app/profile/alice.bsky.social/post/abc123')
  })

  test('すでに https:// から始まる URL はそのまま返す', () => {
    document.body.innerHTML = `
      <div>
        <a href="https://bsky.app/profile/alice.bsky.social/post/abc123">link</a>
      </div>
    `
    const post = document.querySelector('div') as HTMLElement
    expect(extractUrl(post)).toBe('https://bsky.app/profile/alice.bsky.social/post/abc123')
  })

  test('投稿リンクがない場合は空文字', () => {
    document.body.innerHTML = '<div><a href="/profile/alice">profile</a></div>'
    const post = document.querySelector('div') as HTMLElement
    expect(extractUrl(post)).toBe('')
  })
})
