import { libraryManager } from '@/managers'
import { parseCustomWorkout } from '@/parser'
import { renderCustomPreviewStats } from '@/timers/configs'
import type { SavedWorkout, TimerType } from '@/types'
import { $id, addClass, escapeHtml, getInputValue, removeClass } from '@/utils'
import { renderLibrary } from './library'

function renderTypeSelect(selectedType: TimerType | undefined): string {
  const types = [
    { value: 'intervals', label: 'Intervals' },
    { value: 'emom', label: 'EMOM' },
    { value: 'amrap', label: 'AMRAP' },
    { value: 'fortime', label: 'For Time' },
    { value: 'custom', label: 'Custom' },
  ]
  return types
    .map(
      (t) =>
        `<option value="${t.value}" ${selectedType === t.value ? 'selected' : ''}>${t.label}</option>`
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
      <label>Workout Definition (for custom)</label>
      <textarea id="save-text" class="text-editor" style="min-height: 120px;">${isEdit ? escapeHtml(workout.textDefinition || '') : ''}</textarea>
    </div>
    <div id="modal-preview" class="preview-section"></div>
    <div class="btn-group">
      <button class="btn btn-secondary" onclick="window.timerApp.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="window.timerApp.saveWorkout(${isEdit ? workout.id : 'null'})">${isEdit ? 'Update' : 'Save'}</button>
    </div>
  `
}

function updateModalPreview(): void {
  const textEl = $id('save-text') as HTMLTextAreaElement | null
  const previewEl = $id('modal-preview')
  const typeEl = $id('save-type') as HTMLSelectElement | null
  if (!previewEl || !textEl || typeEl?.value !== 'custom') {
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
  if (typeEl) typeEl.addEventListener('change', updateModalPreview)

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

  const workout = {
    name,
    description: getInputValue('save-desc').trim(),
    type: getInputValue('save-type') as TimerType,
    tags: getInputValue('save-tags')
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t),
    textDefinition: getInputValue('save-text'),
  }

  if (id) {
    libraryManager.update(id, workout)
  } else {
    libraryManager.add(workout)
  }

  closeModal()
  renderLibrary()
}
