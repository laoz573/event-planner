// 日付はすべて 'YYYY-MM-DD' 形式の文字列(バックエンドのLocalDateとJSON上で対応)

/** チェックポイント1件分。dateは必須、labelは「50%の問題集完了」のような内容メモ(空文字可)、colorは△の色(#rrggbb)。 */
export interface CheckpointItem {
  date: string
  label: string
  color: string
}

export interface EventItem {
  id: number
  year: number
  name: string
  owner: string
  color: string
  startDate: string
  endDate: string
  goalDate: string | null
  goalColor: string
  checkpoints: CheckpointItem[]
  /** 自分のイベント(GET /api/events)ではundefined。共有されたイベント(GET /api/events/shared)では共有元のユーザー名。 */
  ownerUsername?: string | null
}

export interface EventUpsertPayload {
  year: number
  name: string
  owner: string
  color: string
  startDate: string
  endDate: string
  goalDate: string | null
  goalColor: string
  checkpoints: CheckpointItem[]
}

export type EventStatus = '予定' | '進行中' | '完了'

/** イベント共有の相手を選ぶ画面向けの、自分以外の既存ユーザー。 */
export interface UserSummary {
  id: number
  username: string
}

/** 自分が誰にどう共有しているかの1件分。shareAll=trueのときeventIdsは空配列。 */
export interface ShareSetting {
  sharedWithUserId: number
  sharedWithUsername: string
  shareAll: boolean
  eventIds: number[]
}
