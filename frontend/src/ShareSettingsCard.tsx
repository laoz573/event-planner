import { useEffect, useState } from 'react'
import type { EventItem, ShareSetting, UserSummary } from './types'
import { deleteShare, fetchShares, fetchUsers, upsertShare } from './api'
import { formatPeriod } from './dateUtils'

interface ShareSettingsCardProps {
  year: number
  events: EventItem[]
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : '不明なエラーが発生しました'
}

/**
 * 「自分のイベントを既存の他ユーザーに共有する」設定を管理するカード(設定タブに埋め込む)。
 *
 * - 共有相手は既存ユーザーからドロップダウンで選ぶ(新規登録はしない)
 * - 「すべて共有する」を選ぶと、この設定より後に追加した新しいイベントも自動的に共有対象になる
 *   (バックエンド側でJOINにより動的に判定しているため)
 * - 個別に選ぶ場合は、いま表示中の{year}年の自分のイベントから選択する
 *   (別の年のイベントを選びたい場合は、年間計画タブなどで年を切り替えてからこの設定に戻ってください)
 * - 共有されたイベントは相手側では閲覧専用になる(編集・削除はできない)
 */
function ShareSettingsCard({ year, events }: ShareSettingsCardProps) {
  const [users, setUsers] = useState<UserSummary[]>([])
  const [shares, setShares] = useState<ShareSetting[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editingUserId, setEditingUserId] = useState<number | ''>('')
  const [formShareAll, setFormShareAll] = useState(true)
  const [formEventIds, setFormEventIds] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)

  function load() {
    setLoading(true)
    setError(null)
    Promise.all([fetchUsers(), fetchShares()])
      .then(([u, s]) => {
        setUsers(u)
        setShares(s)
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function openNewForm() {
    setEditingUserId('')
    setFormShareAll(true)
    setFormEventIds(new Set())
    setShowForm(true)
    setError(null)
  }

  function openEditForm(share: ShareSetting) {
    setEditingUserId(share.sharedWithUserId)
    setFormShareAll(share.shareAll)
    setFormEventIds(new Set(share.eventIds))
    setShowForm(true)
    setError(null)
  }

  function toggleEvent(id: number) {
    setFormEventIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSave() {
    if (editingUserId === '') {
      setError('共有する相手を選択してください')
      return
    }
    if (!formShareAll && formEventIds.size === 0) {
      setError('共有するイベントを1件以上選択するか、「すべて共有する」を選んでください')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await upsertShare(editingUserId, formShareAll, Array.from(formEventIds))
      setShowForm(false)
      load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(sharedWithUserId: number) {
    setError(null)
    try {
      await deleteShare(sharedWithUserId)
      load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const isEditingExisting = shares.some((s) => s.sharedWithUserId === editingUserId)
  const alreadySharedUserIds = new Set(shares.map((s) => s.sharedWithUserId))
  const selectableUsers = isEditingExisting ? users : users.filter((u) => !alreadySharedUserIds.has(u.id))

  return (
    <div className="ep-share-settings">
      {loading && <p className="ep-muted-hint">読み込み中...</p>}
      {error && <p className="error-text">{error}</p>}

      {shares.length > 0 && (
        <ul className="ep-share-list">
          {shares.map((s) => (
            <li key={s.sharedWithUserId} className="ep-share-list-item">
              <span className="ep-share-list-username">{s.sharedWithUsername}</span>
              <span className="ep-share-list-mode">
                {s.shareAll ? 'すべて共有中(今後追加分も自動で共有)' : `${s.eventIds.length}件のイベントを共有中`}
              </span>
              <div className="ep-share-list-actions">
                <button className="ep-btn-ghost" onClick={() => openEditForm(s)}>
                  編集
                </button>
                <button className="ep-btn-ghost" onClick={() => handleRemove(s.sharedWithUserId)}>
                  解除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && users.length === 0 && shares.length === 0 && (
        <p className="ep-muted-hint">共有できる他のユーザーがいません(設定タブの「アカウント管理」から作成できます)</p>
      )}

      {!showForm && (users.length > 0 || shares.length > 0) && (
        <button className="ep-btn-primary" onClick={openNewForm} disabled={selectableUsersEmptyForNew(users, alreadySharedUserIds)}>
          ＋ 新しく共有する
        </button>
      )}

      {showForm && (
        <div className="ep-share-form">
          <div className="auth-field">
            <label htmlFor="share-user-select">共有する相手</label>
            <select
              id="share-user-select"
              value={editingUserId}
              onChange={(e) => setEditingUserId(e.target.value ? Number(e.target.value) : '')}
              disabled={isEditingExisting}
            >
              <option value="">選択してください</option>
              {selectableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username}
                </option>
              ))}
            </select>
          </div>

          <div className="ep-share-mode-toggle">
            <label>
              <input type="radio" name="share-mode" checked={formShareAll} onChange={() => setFormShareAll(true)} />
              すべて共有する(今後追加するイベントも自動で共有されます)
            </label>
            <label>
              <input type="radio" name="share-mode" checked={!formShareAll} onChange={() => setFormShareAll(false)} />
              選択したイベントのみ共有する
            </label>
          </div>

          {!formShareAll && (
            <div className="ep-share-event-picker">
              <p className="ep-muted-hint">{year}年のイベントから選択してください</p>
              {events.length === 0 && <p className="ep-muted-hint">{year}年のイベントがありません</p>}
              {events.map((ev) => (
                <label key={ev.id} className="ep-share-event-option">
                  <input type="checkbox" checked={formEventIds.has(ev.id)} onChange={() => toggleEvent(ev.id)} />
                  <span className="ep-name-swatch" style={{ background: ev.color }} />
                  <span className="ep-share-event-name">{ev.name}</span>
                  <span className="ep-share-event-period">{formatPeriod(ev.startDate, ev.endDate)}</span>
                </label>
              ))}
            </div>
          )}

          <div className="ep-share-form-actions">
            <button className="ep-btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </button>
            <button className="ep-btn-ghost" onClick={() => setShowForm(false)} disabled={saving}>
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function selectableUsersEmptyForNew(users: UserSummary[], alreadySharedUserIds: Set<number>): boolean {
  return users.filter((u) => !alreadySharedUserIds.has(u.id)).length === 0
}

export default ShareSettingsCard
