import type { EventItem, EventUpsertPayload } from './types'
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

export async function register(username: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
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
