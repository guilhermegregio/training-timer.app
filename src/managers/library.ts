import type { SavedWorkout, TimerType, MetronomeSettings } from '@/types'

const STORAGE_KEY = 'workout_library'

interface WorkoutInput {
  name: string
  description?: string
  type: TimerType
  tags?: string[]
  textDefinition?: string
  metronome?: MetronomeSettings
}

class LibraryManagerClass {
  getAll(): SavedWorkout[] {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  }

  private save(workouts: SavedWorkout[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts))
  }

  add(workout: WorkoutInput): SavedWorkout {
    const all = this.getAll()
    const entry: SavedWorkout = {
      ...workout,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastUsedAt: null,
      useCount: 0,
      isFavorite: false,
    }
    all.unshift(entry)
    this.save(all)
    return entry
  }

  update(id: number, updates: Partial<WorkoutInput>): void {
    const all = this.getAll()
    const idx = all.findIndex((w) => w.id === id)
    if (idx !== -1 && all[idx]) {
      all[idx] = {
        ...all[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      }
      this.save(all)
    }
  }

  delete(id: number): void {
    const all = this.getAll().filter((w) => w.id !== id)
    this.save(all)
  }

  markUsed(id: number): void {
    const all = this.getAll()
    const idx = all.findIndex((w) => w.id === id)
    if (idx !== -1 && all[idx]) {
      all[idx].lastUsedAt = new Date().toISOString()
      all[idx].useCount++
      this.save(all)
    }
  }

  toggleFavorite(id: number): boolean {
    const all = this.getAll()
    const idx = all.findIndex((w) => w.id === id)
    if (idx !== -1 && all[idx]) {
      all[idx].isFavorite = !all[idx].isFavorite
      this.save(all)
      return all[idx].isFavorite
    }
    return false
  }

  getById(id: number): SavedWorkout | undefined {
    return this.getAll().find((w) => w.id === id)
  }

  search(query: string): SavedWorkout[] {
    const lowerQuery = query.toLowerCase()
    return this.getAll().filter(
      (w) =>
        w.name.toLowerCase().includes(lowerQuery) ||
        w.description?.toLowerCase().includes(lowerQuery) ||
        w.tags?.some((t) => t.toLowerCase().includes(lowerQuery))
    )
  }
}

export const libraryManager = new LibraryManagerClass()
