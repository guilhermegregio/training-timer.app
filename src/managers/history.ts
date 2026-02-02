import type { HistoryEntry, TimerConfig, TimerType } from '@/types'

const STORAGE_KEY = 'workout_history'
const MAX_ITEMS = 50

interface HistoryAddInput {
  type: TimerType
  duration: number
  workTime: number
  rounds: number
  config: TimerConfig
}

class HistoryManagerClass {
  getAll(): HistoryEntry[] {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  }

  add(entry: HistoryAddInput): void {
    const history = this.getAll()
    const newEntry: HistoryEntry = {
      ...entry,
      id: Date.now(),
      date: new Date().toISOString(),
    }

    history.unshift(newEntry)
    if (history.length > MAX_ITEMS) history.pop()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export const historyManager = new HistoryManagerClass()
