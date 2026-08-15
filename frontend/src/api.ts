import type { EventItem, EventUpsertPayload, ShareSetting, UserSummary } from './types'
import { AUTH_EXPIRED_EVENT, clearAuth, getToken } from './auth'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

async function handle<T>(res: Response, errorMessage: string): Promise<T> {
  if (!res.ok) {
    // バックエンドはResponseStatusExceptionのメッセージをJSONの"message"に入れて返すので、
    // 取れればそれを、取れなければステータスコードだけを表示する
    let detail = ''
    try {
      const body = await res.json()
      if (body?.message) detail = `: ${body.message}`
    } catch {
      // JSONでなければ無視
    }
    throw new Error(`${errorMessage} (status: ${res.status})${detail}`)
  }
  if (res.status === 204) {
    return undefined as T
  }
  return res.json()
}

/**
 * Authorizationヘッダーを自動付与するfetchラッパー。
 * 401が返ってきたらトークンを破棄し、ログイン画面へ戻すためのイベントを発火する。
 */
async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const headers = new Headers(options.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(url, { ...options, headers })

  if (res.status === 401) {
    clearAuth()
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
  }

  return res
}

export interface AuthResponse {
  token: string
  userId: number
  username: string
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  return handle<AuthResponse>(res, 'ログインに失敗しました')
}

// 外部公開にあたり自己登録を廃止したため、/api/auth/register はログイン必須(JwtAuthFilter対象)になった。
// そのため、他のエンドポイントと同様にauthFetch(Authorizationヘッダー付き)で呼び出す。
// 未ログイン状態で呼ぶと401が返り、authFetch側でログイン画面に戻すイベントが発火する。
export async function register(username: string, password: string): Promise<AuthResponse> {
  const res = await authFetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  return handle<AuthResponse>(res, 'ユーザー登録に失敗しました')
}

export async function fetchEvents(year: number): Promise<EventItem[]> {
  const res = await authFetch(`${API_BASE}/events?year=${year}`)
  return handle<EventItem[]>(res, 'イベント一覧の取得に失敗しました')
}

export async function createEvent(payload: EventUpsertPayload): Promise<EventItem> {
  const res = await authFetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  return handle<EventItem>(res, 'イベントの作成に失敗しました')
}

export async function updateEvent(id: number, payload: EventUpsertPayload): Promise<EventItem> {
  const res = await authFetch(`${API_BASE}/events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  return handle<EventItem>(res, 'イベントの更新に失敗しました')
}

export async function deleteEvent(id: number): Promise<void> {
  const res = await authFetch(`${API_BASE}/events/${id}`, { method: 'DELETE' })
  return handle<void>(res, 'イベントの削除に失敗しました')
}

/** 他のユーザーから共有されているイベント一覧(閲覧専用)。 */
export async function fetchSharedEvents(year: number): Promise<EventItem[]> {
  const res = await authFetch(`${API_BASE}/events/shared?year=${year}`)
  return handle<EventItem[]>(res, '共有されたイベントの取得に失敗しました')
}

/** イベント共有の相手を選ぶ画面向けに、自分以外の既存ユーザー一覧を取得する。 */
export async function fetchUsers(): Promise<UserSummary[]> {
  const res = await authFetch(`${API_BASE}/users`)
  return handle<UserSummary[]>(res, 'ユーザー一覧の取得に失敗しました')
}

/** 自分(ログイン中のユーザー)が誰にどう共有しているかの一覧。 */
export async function fetchShares(): Promise<ShareSetting[]> {
  const res = await authFetch(`${API_BASE}/shares`)
  return handle<ShareSetting[]>(res, '共有設定の取得に失敗しました')
}

/** 指定ユーザーへの共有設定を作成・更新する(shareAll=falseのときeventIdsが共有対象)。 */
export async function upsertShare(sharedWithUserId: number, shareAll: boolean, eventIds: number[]): Promise<ShareSetting> {
  const res = await authFetch(`${API_BASE}/shares/${sharedWithUserId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shareAll, eventIds })
  })
  return handle<ShareSetting>(res, '共有設定の更新に失敗しました')
}

/** 指定ユーザーへの共有を完全に解除する。 */
export async function deleteShare(sharedWithUserId: number): Promise<void> {
  const res = await authFetch(`${API_BASE}/shares/${sharedWithUserId}`, { method: 'DELETE' })
  return handle<void>(res, '共有の解除に失敗しました')
}
