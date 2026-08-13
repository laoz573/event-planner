// 認証まわりの共通ユーティリティ(household の js/auth.js の考え方を踏襲)。
// トークンはlocalStorageに保存し、Authorization: Bearer ヘッダーのみで認証する
// (セッションCookieは使わない)。

const TOKEN_KEY = 'ep_token'
const USERNAME_KEY = 'ep_username'

/** トークン切れ(401)を検知したときに発火するカスタムイベント名。 */
export const AUTH_EXPIRED_EVENT = 'ep-auth-expired'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getUsername(): string | null {
  return localStorage.getItem(USERNAME_KEY)
}

export function setAuth(token: string, username: string): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USERNAME_KEY, username)
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USERNAME_KEY)
}

export function isLoggedIn(): boolean {
  return getToken() !== null
}
