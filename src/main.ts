import './styles/main.css'

import { wakeLockManager } from './managers'
import {
  toggleMetroEnabled,
  setBpm,
  updateBpmSlider,
  applyCustomPreset,
} from './timers/configs'
import {
  togglePause,
  skipPhase,
  addLap,
  addRound,
  finishForTime,
  advanceFromWait,
  stopTimer,
  backToConfig,
  closeComplete,
  backToConfigFromComplete,
  restartWorkout,
  getLastConfig,
} from './timers/runner'
import { switchTab } from './ui/navigation'
import { openSaveModal, closeModal, saveWorkout } from './ui/modals'
import {
  renderLibrary,
  toggleFavorite,
  playWorkout,
  editWorkout,
  deleteWorkout,
} from './ui/library'
import {
  initSettingsUI,
  toggleSetting,
  updateAlertVolume,
  updateMetronomeVolume,
  updateBpm as updateSettingsBpm,
  exportData,
  importData,
  handleImport,
  clearAllData,
} from './ui/settings'
import { openTimer, closeConfig, startTimerFromConfig, applyPreset } from './ui/screens'
import { $id } from './utils'

// Expose functions to window for onclick handlers
declare global {
  interface Window {
    timerApp: typeof timerApp
  }
}

const timerApp = {
  // Navigation
  switchTab,

  // Timer configs
  openTimer,
  closeConfig,
  startTimerFromConfig,
  applyPreset,
  applyCustomPreset,

  // Timer runtime
  togglePause,
  skipPhase,
  addLap,
  addRound,
  finishForTime,
  advanceFromWait,
  stopTimer: () => stopTimer(),
  backToConfig: () => backToConfig(openTimer),
  closeComplete,
  backToConfigFromComplete: () => backToConfigFromComplete(openTimer),
  restartWorkout,

  // Metronome
  toggleMetroEnabled,
  setBpm,
  updateBpmSlider,

  // Library
  openSaveModal: () => openSaveModal(null),
  closeModal,
  saveWorkout,
  toggleFavorite,
  playWorkout: (id: number) => playWorkout(id, openTimer),
  editWorkout,
  deleteWorkout,

  // Settings
  toggleSetting,
  updateAlertVolume,
  updateMetronomeVolume,
  updateBpm: updateSettingsBpm,
  exportData,
  importData,
  clearAllData,
}

window.timerApp = timerApp

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  initSettingsUI()

  // Library search
  const librarySearch = $id('library-search')
  if (librarySearch) {
    librarySearch.addEventListener('input', renderLibrary)
  }

  // Import file handler
  const importInput = $id('import-input')
  if (importInput) {
    importInput.addEventListener('change', handleImport)
  }
})

// Handle visibility change for wake lock
document.addEventListener('visibilitychange', async () => {
  const config = getLastConfig()
  if (document.visibilityState === 'visible' && config) {
    wakeLockManager.acquire()
  }
})

// PWA Install
let deferredPrompt: BeforeInstallPromptEvent | null = null

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e as BeforeInstallPromptEvent
  const installRow = $id('install-row')
  if (installRow) installRow.style.display = 'flex'
})

// Install app function for the button
;(window as Window & { installApp?: () => void }).installApp = () => {
  if (deferredPrompt) {
    deferredPrompt.prompt()
    deferredPrompt.userChoice.then((result) => {
      if (result.outcome === 'accepted') {
        const installRow = $id('install-row')
        if (installRow) installRow.style.display = 'none'
      }
      deferredPrompt = null
    })
  }
}
