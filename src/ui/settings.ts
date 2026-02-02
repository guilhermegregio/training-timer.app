import { $id, setInputValue } from '@/utils'
import { settingsManager, audioManager, historyManager, libraryManager } from '@/managers'
import { DEFAULT_SETTINGS } from '@/types'
import { renderLibrary } from './library'

export function initSettingsUI(): void {
  const settings = settingsManager.load()
  applySettingsToUI(settings)
}

export function applySettingsToUI(settings = settingsManager.get()): void {
  const toggleKeys = ['voice', 'sounds', 'countdown3', 'metronomeDefault', 'wakelock', 'millis'] as const
  for (const key of toggleKeys) {
    const el = $id(`setting-${key}`)
    if (el?.classList.contains('toggle')) {
      el.classList.toggle('active', !!settings[key])
    }
  }

  setInputValue('setting-alertVolume', settings.alertVolume)
  const alertVolumeValue = $id('alertVolume-value')
  if (alertVolumeValue) alertVolumeValue.textContent = `${settings.alertVolume}%`

  setInputValue('setting-metronomeVolume', settings.metronomeVolume)
  const metronomeVolumeValue = $id('metronomeVolume-value')
  if (metronomeVolumeValue) metronomeVolumeValue.textContent = `${settings.metronomeVolume}%`

  setInputValue('setting-bpm', settings.bpm)
  const bpmValue = $id('bpm-value')
  if (bpmValue) bpmValue.textContent = String(settings.bpm)

  audioManager.alertVolume = settings.alertVolume / 100
  audioManager.metronomeVolume = settings.metronomeVolume / 100
}

export function toggleSetting(key: 'voice' | 'sounds' | 'countdown3' | 'metronomeDefault' | 'wakelock' | 'millis'): void {
  settingsManager.toggle(key)
  const el = $id(`setting-${key}`)
  if (el) el.classList.toggle('active', settingsManager.get()[key])
}

export function updateAlertVolume(value: string): void {
  const numValue = Number.parseInt(value, 10)
  settingsManager.update({ alertVolume: numValue })
  const el = $id('alertVolume-value')
  if (el) el.textContent = `${value}%`
  audioManager.alertVolume = numValue / 100
}

export function updateMetronomeVolume(value: string): void {
  const numValue = Number.parseInt(value, 10)
  settingsManager.update({ metronomeVolume: numValue })
  const el = $id('metronomeVolume-value')
  if (el) el.textContent = `${value}%`
  audioManager.metronomeVolume = numValue / 100
}

export function updateBpm(value: string): void {
  const numValue = Number.parseInt(value, 10)
  settingsManager.update({ bpm: numValue })
  const el = $id('bpm-value')
  if (el) el.textContent = value
}

export function exportData(): void {
  const data = {
    settings: settingsManager.get(),
    library: libraryManager.getAll(),
    history: historyManager.getAll(),
    exportDate: new Date().toISOString(),
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `workout-timer-backup-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importData(): void {
  const input = $id('import-input') as HTMLInputElement | null
  input?.click()
}

export function handleImport(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string)

      if (data.settings) {
        settingsManager.update({ ...DEFAULT_SETTINGS, ...data.settings })
        applySettingsToUI()
      }

      if (data.library) {
        localStorage.setItem('workout_library', JSON.stringify(data.library))
      }

      if (data.history) {
        localStorage.setItem('workout_history', JSON.stringify(data.history))
      }

      alert('Data imported successfully!')
      renderLibrary()
    } catch (err) {
      alert(`Failed to import: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }
  reader.readAsText(file)
  input.value = ''
}

export function clearAllData(): void {
  if (confirm('This will delete all saved workouts, history, and settings. Continue?')) {
    localStorage.clear()
    settingsManager.reset()
    applySettingsToUI()
    renderLibrary()
    alert('All data cleared')
  }
}
