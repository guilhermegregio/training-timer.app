import { DEFAULT_SETTINGS, type Settings } from '@/types'

const STORAGE_KEY = 'workout_settings'

type SettingsUpdateCallback = (settings: Settings) => void

class SettingsManagerClass {
  private settings: Settings = { ...DEFAULT_SETTINGS }
  private listeners: SettingsUpdateCallback[] = []

  load(): Settings {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
    }
    return this.settings
  }

  save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings))
    this.notifyListeners()
  }

  get(): Settings {
    return { ...this.settings }
  }

  update(updates: Partial<Settings>): void {
    this.settings = { ...this.settings, ...updates }
    this.save()
  }

  toggle<K extends keyof Settings>(key: K): boolean {
    const current = this.settings[key]
    if (typeof current === 'boolean') {
      ;(this.settings as Record<K, boolean>)[key] = !current
      this.save()
      return !current
    }
    return false
  }

  reset(): void {
    this.settings = { ...DEFAULT_SETTINGS }
    this.save()
  }

  subscribe(callback: SettingsUpdateCallback): () => void {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback)
    }
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.settings)
    }
  }
}

export const settingsManager = new SettingsManagerClass()
