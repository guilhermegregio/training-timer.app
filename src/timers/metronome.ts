import { audioManager } from '@/managers'
import type { MetronomeSettings, Phase } from '@/types'
import { $id, addClass, removeClass } from '@/utils'
import { METRONOME_LOOKAHEAD, METRONOME_SCHEDULE_AHEAD } from './types'

let metronomeInterval: number | null = null
let metronomeNextNoteTime = 0
let metronomeBpm = 120
let currentIsPaused = false

export function setMetronomePaused(isPaused: boolean): void {
  currentIsPaused = isPaused
}

export function startMetronomeForPhase(
  phase: Phase,
  settings: MetronomeSettings | undefined,
  isPaused: boolean
): void {
  stopMetronome()
  currentIsPaused = isPaused

  if (!settings?.enabled || !settings?.bpm) return

  // Determine if metronome should play for this phase
  const isSimpleTimer = phase.type === 'stopwatch' || phase.type === 'countdown'
  const shouldPlay =
    isSimpleTimer ||
    settings.always ||
    (settings.duringWork && phase.type === 'work') ||
    (settings.duringRest && phase.type === 'rest')

  const metroEl = $id('timer-metronome')

  if (!shouldPlay) {
    if (metroEl) removeClass(metroEl, 'active')
    return
  }

  // Show indicator and start metronome
  if (metroEl) addClass(metroEl, 'active')

  // Initialize Web Audio scheduling for precise timing
  audioManager.resume()
  const ctx = audioManager.getContext()
  if (!ctx) return

  metronomeBpm = settings.bpm
  metronomeNextNoteTime = ctx.currentTime

  const metroDot = $id('metro-dot')
  const interval = 60.0 / metronomeBpm

  // Lookahead scheduler - schedules notes ahead of time for precision
  function scheduleMetronome(): void {
    const ctx = audioManager.getContext()
    if (!ctx) return

    while (metronomeNextNoteTime < ctx.currentTime + METRONOME_SCHEDULE_AHEAD) {
      if (!currentIsPaused) {
        audioManager.scheduleMetronomeClick(metronomeNextNoteTime)

        // Schedule visual beat animation
        const timeUntilBeat = (metronomeNextNoteTime - ctx.currentTime) * 1000
        if (timeUntilBeat >= 0 && metroDot) {
          setTimeout(() => {
            addClass(metroDot, 'beat')
            setTimeout(() => removeClass(metroDot, 'beat'), 100)
          }, timeUntilBeat)
        }
      }
      metronomeNextNoteTime += interval
    }
  }

  // Run scheduler immediately then at regular intervals
  scheduleMetronome()
  metronomeInterval = window.setInterval(scheduleMetronome, METRONOME_LOOKAHEAD)
}

export function stopMetronome(): void {
  if (metronomeInterval !== null) {
    clearInterval(metronomeInterval)
    metronomeInterval = null
  }
}
