// 日付はすべて 'YYYY-MM-DD' 形式の文字列(バックエンドのLocalDateとJSON上で対応)

export interface EventItem {
  id: number
  year: number
  name: string
  color: string
  startDate: string
  endDate: string
  goalDate: string | null
  checkpoints: string[]
}

export interface EventUpsertPayload {
  year: number
  name: string
  color: string
  startDate: string
  endDate: string
  goalDate: string | null
  checkpoints: string[]
}
