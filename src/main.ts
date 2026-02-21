import './styles/main.css'
import { registerSW } from 'virtual:pwa-register'

import { libraryManager, wakeLockManager } from './managers'
import { applyCustomPreset, setBpm, toggleMetroEnabled, updateBpmSlider } from './timers/configs'
import {
  addLap,
  addRound,
  advanceFromWait,
  backToConfig,
  backToConfigFromComplete,
  closeComplete,
  finishForTime,
  getLastConfig,
  restartWorkout,
  skipPhase,
  stopTimer,
  togglePause,
} from './timers/runner'
import {
  deleteWorkout,
  editWorkout,
  playWorkout,
  renderLibrary,
  shareWorkoutById,
  toggleFavorite,
} from './ui/library'
import {
  closeModal,
  closeShareImport,
  openSaveModal,
  saveSharedWorkout,
  saveWorkout,
  showShareImport,
} from './ui/modals'
import { switchTab } from './ui/navigation'
import { applyPreset, closeConfig, openTimer, startTimerFromConfig } from './ui/screens'
import {
  clearAllData,
  exportData,
  handleImport,
  importData,
  initSettingsUI,
  toggleSetting,
  updateAlertVolume,
  updateMetronomeVolume,
  updateBpm as updateSettingsBpm,
} from './ui/settings'
import { $id, getSharedWorkoutFromUrl } from './utils'

const PIX_CODE = '2706658d-8ffe-4a23-92cc-f29fdb45bfe9'

function copyPixCode(): void {
  const btn = $id('pix-copy-btn') as HTMLButtonElement | null
  const copy = () => {
    if (btn) {
      btn.textContent = 'Copied!'
      setTimeout(() => {
        btn.textContent = 'Copy'
      }, 2000)
    }
  }

  if (navigator.clipboard) {
    navigator.clipboard.writeText(PIX_CODE).then(copy)
  } else {
    const textarea = document.createElement('textarea')
    textarea.value = PIX_CODE
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    copy()
  }
}

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
  shareWorkout: shareWorkoutById,
  editWorkout,
  deleteWorkout,

  // Share import
  closeShareImport,
  saveSharedWorkout,

  // Donate
  copyPixCode,

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
  libraryManager.seedDefaults()
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

  // Check for shared workout in URL
  const sharedWorkout = getSharedWorkoutFromUrl()
  if (sharedWorkout) {
    switchTab('library')
    showShareImport(sharedWorkout)
  }
})

// Handle visibility change for wake lock
document.addEventListener('visibilitychange', async () => {
  const config = getLastConfig()
  if (document.visibilityState === 'visible' && config) {
    wakeLockManager.acquire()
  }
})

// PWA Version and Update
const versionEl = $id('app-version')
if (versionEl) {
  versionEl.textContent = __APP_VERSION__
}

function showUpdateButton() {
  const updateRow = $id('update-row')
  if (updateRow) {
    updateRow.style.display = 'flex'
  }
}

const updateSW = registerSW({
  onNeedRefresh() {
    showUpdateButton()
  },
  onOfflineReady() {
    console.log('PWA ready for offline use')
  },
})

// Update app function for the button
;(window as Window & { updateApp?: () => void }).updateApp = () => {
  updateSW(true)
}

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
