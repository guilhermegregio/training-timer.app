import { $id, $$, addClass, removeClass } from '@/utils'
import { timerConfigs, initMetroSettings } from '@/timers/configs'
import { startTimer } from '@/timers/runner'
import { intervalPresets } from '@/parser'

let currentTimerType: string | null = null

export function getCurrentTimerType(): string | null {
  return currentTimerType
}

export function openTimer(type: string): void {
  currentTimerType = type
  const config = timerConfigs[type]
  if (!config) return

  // Initialize metronome settings from defaults
  initMetroSettings()

  const configScreen = $id('config-screen')
  if (!configScreen) return

  configScreen.innerHTML = `
    <div class="config-header">
      <button class="config-back" onclick="window.timerApp.closeConfig()">&larr;</button>
      <h2>${config.title}</h2>
    </div>
    <div class="config-body">
      ${config.render()}
    </div>
    <div class="config-footer">
      <p style="text-align: center; color: var(--text-muted); font-size: 0.8rem; margin-bottom: 12px;">
        &#128274; Screen stays awake when running
      </p>
      <button class="btn btn-primary btn-block" onclick="window.timerApp.startTimerFromConfig()">&#9654; Start Workout</button>
    </div>
  `

  addClass(configScreen, 'active')

  // Add input listeners for preview updates
  if (config.onUpdate) {
    setTimeout(() => {
      config.onUpdate?.()
      $$('#config-screen input, #config-screen textarea').forEach((el) => {
        el.addEventListener('input', () => config.onUpdate?.())
      })
    }, 0)
  }

  // Setup "Always" checkbox mutual exclusion with work/rest
  setTimeout(() => {
    const alwaysEl = $id('metro-always') as HTMLInputElement | null
    const workEl = $id('metro-work') as HTMLInputElement | null
    const restEl = $id('metro-rest') as HTMLInputElement | null

    if (alwaysEl) {
      alwaysEl.addEventListener('change', () => {
        if (alwaysEl.checked) {
          if (workEl) workEl.checked = false
          if (restEl) restEl.checked = false
        }
      })
    }

    if (workEl) {
      workEl.addEventListener('change', () => {
        if (workEl.checked && alwaysEl) {
          alwaysEl.checked = false
        }
      })
    }

    if (restEl) {
      restEl.addEventListener('change', () => {
        if (restEl.checked && alwaysEl) {
          alwaysEl.checked = false
        }
      })
    }
  }, 0)
}

export function closeConfig(): void {
  const configScreen = $id('config-screen')
  if (configScreen) removeClass(configScreen, 'active')
  currentTimerType = null
}

export function startTimerFromConfig(): void {
  if (!currentTimerType) return

  const config = timerConfigs[currentTimerType]
  if (!config) return

  if (!config.validate()) {
    alert('Please check your settings')
    return
  }

  const timerConfig = config.getConfig()
  closeConfig()
  startTimer(timerConfig)
}

export function applyPreset(preset: string): void {
  const p = intervalPresets[preset]
  if (p) {
    const workEl = $id('int-work') as HTMLInputElement | null
    const restEl = $id('int-rest') as HTMLInputElement | null
    const roundsEl = $id('int-rounds') as HTMLInputElement | null

    if (workEl) workEl.value = String(p.work)
    if (restEl) restEl.value = String(p.rest)
    if (roundsEl) roundsEl.value = String(p.rounds)

    timerConfigs.intervals?.onUpdate?.()
  }
}
