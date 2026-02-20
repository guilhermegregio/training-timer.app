import { libraryManager } from '@/managers'
import { parseCustomWorkout } from '@/parser'
import { renderCustomPreviewStats } from '@/timers/configs'
import type { SavedWorkout, TimerType } from '@/types'
import {
  $id,
  addClass,
  clearShareParam,
  escapeHtml,
  getInputNumber,
  getInputValue,
  removeClass,
} from '@/utils'
import type { SharedWorkout } from '@/utils/share'
import { renderLibrary } from './library'

function renderTypeSelect(selectedType: TimerType | undefined): string {
  const typeToSelect: Record<string, string> = {
    stopwatch: 'stopwatch-tpl',
    countdown: 'countdown-tpl',
  }
  const effectiveType = typeToSelect[selectedType ?? ''] ?? selectedType ?? 'custom'
  const types = [
    { value: 'intervals', label: 'Intervals' },
    { value: 'tabata', label: 'Tabata' },
    { value: 'emom', label: 'EMOM' },
    { value: 'amrap', label: 'AMRAP' },
    { value: 'fortime', label: 'For Time' },
    { value: 'stopwatch-tpl', label: 'Stopwatch' },
    { value: 'countdown-tpl', label: 'Countdown' },
    { value: 'custom', label: 'Custom' },
  ]
  return types
    .map(
      (t) =>
        `<option value="${t.value}" ${effectiveType === t.value ? 'selected' : ''}>${t.label}</option>`
    )
    .join('')
}

function renderSaveModalContent(workout: SavedWorkout | null): string {
  const isEdit = !!workout
  return `
    <h2>${isEdit ? 'Edit' : 'Save'} Workout</h2>
    <div class="form-group">
      <label>Name</label>
      <input type="text" id="save-name" value="${isEdit ? escapeHtml(workout.name) : ''}">
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea id="save-desc" style="min-height: 80px;">${isEdit ? escapeHtml(workout.description || '') : ''}</textarea>
    </div>
    <div class="form-group">
      <label>Type</label>
      <select id="save-type">${renderTypeSelect(workout?.type)}</select>
    </div>
    <div class="form-group">
      <label>Tags (comma separated)</label>
      <input type="text" id="save-tags" value="${isEdit && workout.tags ? workout.tags.join(', ') : ''}">
    </div>
    <div class="form-group">
      <label>Countdown (sec)</label>
      <input type="number" id="save-countdown" value="${isEdit && workout.countdown ? workout.countdown : 0}" min="0" max="60" step="5">
    </div>
    <div class="form-group">
      <label>Workout Definition</label>
      <textarea id="save-text" class="text-editor" style="min-height: 120px;">${isEdit ? escapeHtml(workout.textDefinition || '') : ''}</textarea>
    </div>
    <div id="modal-preview" class="preview-section"></div>
    <div class="btn-group">
      <button class="btn btn-secondary" onclick="window.timerApp.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="window.timerApp.saveWorkout(${isEdit ? workout.id : 'null'})">${isEdit ? 'Update' : 'Save'}</button>
    </div>
  `
}

const typeTemplates: Record<string, string> = {
  intervals: '10x\n30s work\n30s rest',
  tabata: '8x\n20s work\n10s rest',
  emom: '10x\n60s work',
  amrap: 'amrap 12min',
  fortime: 'fortime 10min',
  'stopwatch-tpl': 'stopwatch',
  'countdown-tpl': 'countdown 1min',
}

let lastTemplate = ''

function updateModalPreview(): void {
  const textEl = $id('save-text') as HTMLTextAreaElement | null
  const previewEl = $id('modal-preview')
  if (!previewEl || !textEl) {
    if (previewEl) previewEl.innerHTML = ''
    return
  }
  const text = textEl.value.trim()
  if (!text) {
    previewEl.innerHTML = ''
    return
  }
  const result = parseCustomWorkout(text)
  if (result.phases?.length > 0) {
    previewEl.innerHTML = renderCustomPreviewStats(result.phases, result.blocks)
  } else {
    previewEl.innerHTML = ''
  }
}

export function openSaveModal(workout: SavedWorkout | null = null): void {
  const modalContent = $id('modal-content')
  if (!modalContent) return

  modalContent.innerHTML = renderSaveModalContent(workout)

  const textEl = $id('save-text') as HTMLTextAreaElement | null
  const typeEl = $id('save-type') as HTMLSelectElement | null
  if (textEl) textEl.addEventListener('input', updateModalPreview)
  if (typeEl) {
    typeEl.addEventListener('change', () => {
      if (textEl) {
        const currentText = textEl.value.trim()
        const template = typeTemplates[typeEl.value] || ''
        if (!currentText || currentText === lastTemplate) {
          textEl.value = template
          lastTemplate = template
        }
      }
      updateModalPreview()
    })
  }

  // For new workouts, fill template from initial type
  if (!workout && textEl && typeEl) {
    const template = typeTemplates[typeEl.value] || ''
    textEl.value = template
    lastTemplate = template
  } else {
    lastTemplate = textEl?.value.trim() || ''
  }

  updateModalPreview()

  const modalOverlay = $id('modal-overlay')
  if (modalOverlay) addClass(modalOverlay, 'active')
}

export function closeModal(): void {
  const modalOverlay = $id('modal-overlay')
  if (modalOverlay) removeClass(modalOverlay, 'active')
}

export function saveWorkout(id: number | null): void {
  const name = getInputValue('save-name').trim()
  if (!name) {
    alert('Name is required')
    return
  }

  const rawType = getInputValue('save-type')
  const typeMap: Record<string, TimerType> = {
    tabata: 'custom',
    'stopwatch-tpl': 'stopwatch',
    'countdown-tpl': 'countdown',
  }
  const type: TimerType = typeMap[rawType] ?? (rawType as TimerType)
  const countdown = getInputNumber('save-countdown', 0)

  const workout = {
    name,
    description: getInputValue('save-desc').trim(),
    type,
    tags: getInputValue('save-tags')
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t),
    textDefinition: getInputValue('save-text'),
    countdown: countdown > 0 ? countdown : undefined,
  }

  if (id) {
    libraryManager.update(id, workout)
  } else {
    libraryManager.add(workout)
  }

  closeModal()
  renderLibrary()
}

function renderSharedWorkoutPreview(workout: SharedWorkout): string {
  if (!workout.textDefinition) return ''
  const result = parseCustomWorkout(workout.textDefinition)
  if (result.phases?.length > 0) {
    return renderCustomPreviewStats(result.phases, result.blocks)
  }
  return ''
}

export function openShareImportModal(workout: SharedWorkout): void {
  const modalContent = $id('modal-content')
  if (!modalContent) return

  const tagsHtml = workout.tags?.length
    ? `<div class="share-import-tags">${workout.tags.map((t) => `<span class="badge badge-custom">${escapeHtml(t)}</span>`).join(' ')}</div>`
    : ''

  const descHtml = workout.description
    ? `<p class="share-import-desc">${escapeHtml(workout.description)}</p>`
    : ''

  const preview = renderSharedWorkoutPreview(workout)

  modalContent.innerHTML = `
    <h2>Shared Workout</h2>
    <div class="share-import-header">
      <span class="share-import-name">${escapeHtml(workout.name)}</span>
      <span class="badge badge-${workout.type}">${workout.type}</span>
    </div>
    ${descHtml}
    ${tagsHtml}
    ${preview ? `<div class="preview-section">${preview}</div>` : ''}
    <div class="btn-group">
      <button class="btn btn-secondary" onclick="window.timerApp.closeShareImport()">Cancel</button>
      <button class="btn btn-primary" onclick="window.timerApp.saveSharedWorkout()">Save to Library</button>
    </div>
  `

  const modalOverlay = $id('modal-overlay')
  if (modalOverlay) addClass(modalOverlay, 'active')
}

let pendingSharedWorkout: SharedWorkout | null = null

export function showShareImport(workout: SharedWorkout): void {
  pendingSharedWorkout = workout
  openShareImportModal(workout)
}

export function closeShareImport(): void {
  pendingSharedWorkout = null
  clearShareParam()
  closeModal()
}

export function saveSharedWorkout(): void {
  if (!pendingSharedWorkout) return

  libraryManager.add({
    name: pendingSharedWorkout.name,
    type: pendingSharedWorkout.type,
    textDefinition: pendingSharedWorkout.textDefinition,
    description: pendingSharedWorkout.description,
    tags: pendingSharedWorkout.tags,
    countdown: pendingSharedWorkout.countdown,
  })

  pendingSharedWorkout = null
  clearShareParam()
  closeModal()
  renderLibrary()
}
