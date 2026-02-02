import NoSleep from 'nosleep.js'
import { settingsManager } from './settings'

class WakeLockManagerClass {
  private wakeLock: WakeLockSentinel | null = null
  private noSleep: NoSleep | null = null

  async acquire(): Promise<void> {
    const settings = settingsManager.get()
    if (!settings.wakelock) return

    // Try native Wake Lock API first
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen')
        return
      } catch (e) {
        console.log('Native Wake Lock failed:', e)
      }
    }

    // Fallback to NoSleep.js (for iOS PWA)
    if (!this.noSleep) {
      this.noSleep = new NoSleep()
    }
    try {
      await this.noSleep.enable()
    } catch (e) {
      console.log('NoSleep fallback failed:', e)
    }
  }

  release(): void {
    if (this.wakeLock) {
      this.wakeLock.release()
      this.wakeLock = null
    }
    if (this.noSleep) {
      this.noSleep.disable()
    }
  }
}

export const wakeLockManager = new WakeLockManagerClass()
