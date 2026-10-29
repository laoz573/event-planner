import { useState } from 'react'
import type { GenreItem } from './types'

interface GenreSettingsCardProps {
  genres: GenreItem[]
  onAdd: (name: string) => Promise<void>
  onRename: (id: number, name: string) => Promise<void>
  onRemove: (id: number) => Promise<void>
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : '不明なエラーが発生しました'
}

/** 1行分(名前の変更・削除)。入力途中の文字列はこの行のstateで持つ。 */
function GenreRow({
  genre,
  onRename,
  onRemove,
  onError
}: {
  genre: GenreItem
  onRename: (id: number, name: string) => Promise<void>
  onRemove: (id: number) => Promise<void>
  onError: (message: string | null) => void
}) {
  const [name, setName] = useState(genre.name)

  const save = () => {
    const trimmed = name.trim()
    if (!trimmed || trimmed === genre.name) {
      setName(genre.name)
      return
    }
    onError(null)
    onRename(genre.id, trimmed).catch((err) => {
      setName(genre.name)
      onError(errorText(err))
    })
  }

  const remove = () => {
    if (
      !window.confirm(
        `ジャンル「${genre.name}」を削除しますか?\n\nこのジャンルを選んでいたイベントは「未選択」に戻り、実績タブには表示されなくなります` +
          '(入力済みの実績は残りますが、ジャンルを選び直すまで集計されません)。'
      )
    ) {
      return
    }
    onError(null)
    onRemove(genre.id).catch((err) => onError(errorText(err)))
  }

  return (
    <div className="ep-genre-row">
      <input
        className="ep-genre-input"
        type="text"
        maxLength={50}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
        }}
      />
      <button className="ep-btn-ghost" onClick={save}>
        名前を変更
      </button>
      <button className="ep-row-del" onClick={remove}>
        🗑 削除
      </button>
    </div>
  )
}

/**
 * 設定タブのジャンル管理。ここで追加・名前変更・削除し、各イベントの「編集」で選ぶ。
 * 実績タブは、ジャンルを選んだイベントだけを対象にする。
 */
function GenreSettingsCard({ genres, onAdd, onRename, onRemove }: GenreSettingsCardProps) {
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const add = () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    setError(null)
    onAdd(trimmed)
      .then(() => setNewName(''))
      .catch((err) => setError(errorText(err)))
  }

  return (
    <div className="ep-chart-card ep-settings-card ep-settings-card-wide">
      <div className="ep-chart-card-head">
        <h3>ジャンル</h3>
      </div>
      <div className="ep-settings-body">
        <div className="ep-settings-row">
          <span className="ep-settings-label">ジャンルについて</span>
          <span className="ep-settings-value">
            イベント計画の「編集」でイベントごとに選べます(未選択も可)。ジャンルを選んだイベントは「実績」タブで作業時間を入力できます
          </span>
        </div>
        {error && <p className="error-text">{error}</p>}
        <div className="ep-genre-list">
          {genres.length === 0 && <p className="ep-muted-hint">ジャンルはまだありません。下から追加してください</p>}
          {genres.map((g) => (
            <GenreRow key={`${g.id}:${g.name}`} genre={g} onRename={onRename} onRemove={onRemove} onError={setError} />
          ))}
        </div>
        <div className="ep-genre-row">
          <input
            className="ep-genre-input"
            type="text"
            maxLength={50}
            placeholder="新しいジャンル名(例: 企画、デザイン)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add()
            }}
          />
          <button className="ep-btn-primary" onClick={add}>
            ＋ 追加
          </button>
        </div>
      </div>
    </div>
  )
}

export default GenreSettingsCard
