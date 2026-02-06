import { audioManager, libraryManager, settingsManager, wakeLockManager } from '@/managers'
import { parseCustomWorkout } from '@/parser'
import { startTimer } from '@/timers'
import type { CustomConfig, SavedWorkout } from '@/types'
import { DEFAULT_METRONOME_SETTINGS } from '@/types'
import { $id, escapeHtml, getInputValue } from '@/utils'
import { openSaveModal } from './modals'

function extractExerciseLabels(textDefinition: string): string {
  const labels = textDefinition
    .split('\n')
    .filter((l) => l.trim().startsWith('#'))
    .map((l) => l.trim().slice(1).trim())
    .filter((l) => l.length > 0)
  return labels.join(' · ')
}

function renderWorkoutPreview(w: SavedWorkout): string {
  if (!w.textDefinition) return ''
  const preview = extractExerciseLabels(w.textDefinition)
  if (!preview) return ''
  return `<div class="workout-item-preview">${escapeHtml(preview)}</div>`
}

export function renderLibrary(): void {
  const workouts = libraryManager.getAll()
  const search = getInputValue('library-search').toLowerCase()
  const filtered = workouts.filter(
    (w) =>
      w.name.toLowerCase().includes(search) ||
      w.description?.toLowerCase().includes(search) ||
      w.tags?.some((t) => t.toLowerCase().includes(search))
  )

  const list = $id('workout-list')
  if (!list) return

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="icon">&#128218;</div>
        <p>${search ? 'No matching workouts' : 'No saved workouts yet'}</p>
      </div>
    `
    return
  }

  list.innerHTML = filtered
    .map(
      (w) => `
    <div class="workout-item">
      <div class="workout-item-header">
        <span class="workout-item-name">${escapeHtml(w.name)}</span>
        <span class="workout-item-fav ${w.isFavorite ? 'active' : ''}" onclick="window.timerApp.toggleFavorite(${w.id})">
          ${w.isFavorite ? '&#9733;' : '&#9734;'}
        </span>
      </div>
      <div class="workout-item-meta">
        <span class="badge badge-${w.type}">${w.type}</span>
        <span>Used ${w.useCount}x</span>
      </div>
      ${renderWorkoutPreview(w)}
      <div class="workout-item-actions">
        <button class="btn btn-primary" onclick="window.timerApp.playWorkout(${w.id})">Play</button>
        <button class="btn btn-secondary" onclick="window.timerApp.editWorkout(${w.id})">Edit</button>
        <button class="btn btn-secondary" onclick="window.timerApp.deleteWorkout(${w.id})">Delete</button>
      </div>
    </div>
  `
    )
    .join('')
}

export function toggleFavorite(id: number): void {
  libraryManager.toggleFavorite(id)
  renderLibrary()
}

export function playWorkout(id: number, openTimerFn: (type: string) => void): void {
  const workout = libraryManager.getById(id)
  if (!workout) return

  libraryManager.markUsed(id)

  if (workout.type === 'custom' && workout.textDefinition) {
    const settings = settingsManager.get()
    const defaultMetro = {
      ...DEFAULT_METRONOME_SETTINGS,
      enabled: settings.metronomeDefault,
      bpm: settings.bpm,
    }

    const config: CustomConfig = {
      type: 'custom',
      text: workout.textDefinition,
      parsed: parseCustomWorkout(workout.textDefinition),
      metronome: workout.metronome || defaultMetro,
    }

    if (!config.parsed.phases || config.parsed.phases.length === 0) {
      alert('Invalid workout definition')
      return
    }

    audioManager.init()
    wakeLockManager.acquire()

    startTimer(config)
  } else {
    openTimerFn(workout.type)
  }
}

export function editWorkout(id: number): void {
  const workout = libraryManager.getById(id)
  if (workout) openSaveModal(workout)
}

export function deleteWorkout(id: number): void {
  if (confirm('Delete this workout?')) {
    libraryManager.delete(id)
    renderLibrary()
  }
}
