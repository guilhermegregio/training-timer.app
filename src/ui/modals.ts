import { libraryManager } from '@/managers'
import type { SavedWorkout, TimerType } from '@/types'
import { $id, addClass, escapeHtml, getInputValue, removeClass } from '@/utils'
import { renderLibrary } from './library'

export function openSaveModal(workout: SavedWorkout | null = null): void {
  const isEdit = !!workout
  const modalContent = $id('modal-content')
  if (!modalContent) return

  modalContent.innerHTML = `
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
      <select id="save-type">
        <option value="intervals" ${workout?.type === 'intervals' ? 'selected' : ''}>Intervals</option>
        <option value="emom" ${workout?.type === 'emom' ? 'selected' : ''}>EMOM</option>
        <option value="amrap" ${workout?.type === 'amrap' ? 'selected' : ''}>AMRAP</option>
        <option value="fortime" ${workout?.type === 'fortime' ? 'selected' : ''}>For Time</option>
        <option value="custom" ${workout?.type === 'custom' ? 'selected' : ''}>Custom</option>
      </select>
    </div>
    <div class="form-group">
      <label>Tags (comma separated)</label>
      <input type="text" id="save-tags" value="${isEdit && workout.tags ? workout.tags.join(', ') : ''}">
    </div>
    <div class="form-group">
      <label>Workout Definition (for custom)</label>
      <textarea id="save-text" class="text-editor" style="min-height: 120px;">${isEdit ? escapeHtml(workout.textDefinition || '') : ''}</textarea>
    </div>
    <div class="btn-group">
      <button class="btn btn-secondary" onclick="window.timerApp.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="window.timerApp.saveWorkout(${isEdit ? workout.id : 'null'})">${isEdit ? 'Update' : 'Save'}</button>
    </div>
  `

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
