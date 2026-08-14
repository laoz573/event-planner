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
