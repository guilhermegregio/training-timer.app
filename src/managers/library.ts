import type { MetronomeSettings, SavedWorkout, TimerType } from '@/types'

const STORAGE_KEY = 'workout_library'

interface WorkoutInput {
  name: string
  description?: string
  type: TimerType
  tags?: string[]
  textDefinition?: string
  countdown?: number
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

  seedDefaults(): void {
    if (this.getAll().length > 0) return
    this.add({
      name: 'Strength Tendons',
      type: 'custom',
      tags: ['tendons', 'isometric', 'strength'],
      textDefinition: `warmup
10s

# calf raise hold
30s work
- calf raise hold

60s rest

# spanish squat hold
30s work
- spanish squat hold

60s rest

# deep push up isometric hold
20s work
- deep push up isometric hold

60s rest

# wall external rotation hold
30s work
- wall external rotation hold
10s rest
30s work
- wall external rotation hold

60s rest

# active dead hang
20s work
- active dead hang`,
    })
    this.add({
      name: 'Fortalecimento Fullbody DB',
      type: 'custom',
      tags: ['fullbody', 'dumbbell', 'strength'],
      textDefinition: `# air squat
2x
wait work
- air squat (20x)
60s rest

# lunge
2x
wait work
- lunge (20x)
60s rest

# calf raise + pogos
2x
wait work
- calf raise (20x)
- pogo jump (20x)
- pogo jump unilateral (10x)
- pogo jump unilateral (10x)
60s rest

# push up
2x
wait work
- push up (20x)
60s rest

# goblet squat
2x
wait work
- goblet squat (20x)
60s rest

# overhead lunge
2x
wait work
- overhead lunge (20x)
60s rest

# goblet lunge
2x
wait work
- goblet lunge (20x)
60s rest

# thruster
2x
wait work
- thruster (20x)
60s rest

# press
2x
wait work
- press (20x)
60s rest

# db bench over row
2x
wait work
- bench over row (20x)
60s rest

# hammer curl
2x
wait work
- hammer curl (20x)
60s rest

# calf raise
2x
wait work
- calf raise (20x)
60s rest`,
    })
  }
}

export const libraryManager = new LibraryManagerClass()
