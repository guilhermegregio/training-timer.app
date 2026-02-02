import { settingsManager } from './settings'

class WakeLockManagerClass {
  private wakeLock: WakeLockSentinel | null = null

  async acquire(): Promise<void> {
    const settings = settingsManager.get()
    if (!settings.wakelock || !('wakeLock' in navigator)) return

    try {
      this.wakeLock = await navigator.wakeLock.request('screen')
    } catch (e) {
      console.log('Wake Lock failed:', e)
    }
  }

  release(): void {
    if (this.wakeLock) {
      this.wakeLock.release()
      this.wakeLock = null
    }
  }
}

export const wakeLockManager = new WakeLockManagerClass()
