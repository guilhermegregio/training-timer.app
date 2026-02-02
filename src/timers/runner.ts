import type { TimerConfig, TimerState, TimerType, Phase, MetronomeSettings } from '@/types'
import { PHASE_COLORS } from '@/types'
import { audioManager, speechManager, wakeLockManager, historyManager, settingsManager } from '@/managers'
import { formatTime, formatTimeMillis, $id, addClass, removeClass } from '@/utils'
import { buildPhases } from './builder'
import { startMetronomeForPhase, stopMetronome, setMetronomePaused } from './metronome'

function formatExerciseDisplay(phase: Phase): string {
  if (!phase.exercises?.length) return ''
  const ex = phase.exercises[0]
  if (!ex) return ''
  let text = ex.name
  if (ex.reps) text += ` ${ex.reps}x`
  if (ex.weight) text += ` @${ex.weight}${ex.weightUnit ?? 'kg'}`
  if (ex.percentage) text += ` ${ex.percentage}`
  if (ex.pse) text += ` PSE ${ex.pse}`
  return text
}

function getPhaseMetronomeSettings(phase: Phase, baseSettings: MetronomeSettings | undefined): MetronomeSettings | undefined {
  if (!baseSettings) return undefined
  if (phase.metronome) {
    return { ...baseSettings, bpm: phase.metronome }
  }
  return baseSettings
}

let timerState: TimerState = {
  type: null,
  phases: [],
  currentPhaseIndex: 0,
  currentPhaseTime: 0,
  totalElapsed: 0,
  rounds: 0,
  laps: [],
  startTime: null,
  pausedTime: 0,
}

let timerInterval: number | null = null
let isPaused = false
let lastConfig: TimerConfig | null = null

export function getTimerState(): TimerState {
  return timerState
}

export function getLastConfig(): TimerConfig | null {
  return lastConfig
}

export function setLastConfig(config: TimerConfig): void {
  lastConfig = config
}

export function startTimer(config: TimerConfig): void {
  lastConfig = config
  audioManager.init()
  audioManager.resume()
  wakeLockManager.acquire()

  timerState = {
    type: config.type,
    phases: buildPhases(config),
    currentPhaseIndex: 0,
    currentPhaseTime: 0,
    totalElapsed: 0,
    rounds: 0,
    laps: [],
    startTime: Date.now(),
    pausedTime: 0,
  }

  showTimerScreen()
  runTimer()
}

function showTimerScreen(): void {
  const screen = $id('timer-screen')
  if (screen) addClass(screen, 'active')
  isPaused = false
  const pauseBtn = $id('btn-pause')
  if (pauseBtn) pauseBtn.textContent = 'Pause'

  // Setup metronome BPM display
  const metro = lastConfig?.metronome ?? { enabled: false, bpm: 120 }
  const metroBpmEl = $id('metro-bpm-display')
  if (metroBpmEl) metroBpmEl.textContent = `${metro.bpm} BPM`

  // Hide indicator initially
  const metroEl = $id('timer-metronome')
  if (metroEl) removeClass(metroEl, 'active')

  updateTimerDisplay()
  updateTimerControls()
}

function updateTimerControls(): void {
  const controls = $id('timer-controls')
  if (!controls) return

  const type = timerState.type
  const phase = timerState.phases[timerState.currentPhaseIndex]

  // Handle wait phase
  if (phase?.type === 'wait') {
    controls.innerHTML = `
      <button class="btn btn-danger" onclick="window.timerApp.stopTimer()">Stop</button>
      <button class="btn btn-done btn-primary" onclick="window.timerApp.advanceFromWait()">DONE</button>
    `
    return
  }

  if (type === 'stopwatch') {
    controls.innerHTML = `
      <button class="btn btn-danger" onclick="window.timerApp.stopTimer()">Stop</button>
      <button class="btn btn-secondary" id="btn-pause" onclick="window.timerApp.togglePause()">Pause</button>
      <button class="btn btn-secondary" onclick="window.timerApp.addLap()">Lap</button>
    `
  } else if (type === 'amrap') {
    controls.innerHTML = `
      <button class="btn btn-danger" onclick="window.timerApp.stopTimer()">Stop</button>
      <button class="btn btn-secondary" id="btn-pause" onclick="window.timerApp.togglePause()">Pause</button>
      <button class="btn btn-primary" onclick="window.timerApp.addRound()">+1 Round</button>
    `
  } else if (type === 'fortime') {
    controls.innerHTML = `
      <button class="btn btn-danger" onclick="window.timerApp.stopTimer()">Stop</button>
      <button class="btn btn-secondary" id="btn-pause" onclick="window.timerApp.togglePause()">Pause</button>
      <button class="btn btn-primary" onclick="window.timerApp.finishForTime()">DONE</button>
    `
  } else {
    controls.innerHTML = `
      <button class="btn btn-danger" onclick="window.timerApp.stopTimer()">Stop</button>
      <button class="btn btn-secondary" id="btn-pause" onclick="window.timerApp.togglePause()">Pause</button>
      <button class="btn btn-secondary" onclick="window.timerApp.skipPhase()">Skip</button>
    `
  }
}

function runTimer(): void {
  let lastTick = Date.now()
  let lastSecond = -1

  // Announce first phase
  const firstPhase = timerState.phases[0]
  if (firstPhase) {
    speechManager.announcePhase(firstPhase.type)
    if (firstPhase.type === 'work') audioManager.playWorkStart()
    else if (firstPhase.type === 'rest') audioManager.playRestStart()

    // Start metronome for first phase (with phase-specific BPM if set)
    const metroSettings = getPhaseMetronomeSettings(firstPhase, lastConfig?.metronome)
    startMetronomeForPhase(firstPhase, metroSettings, isPaused)
  }

  timerInterval = window.setInterval(() => {
    if (isPaused) {
      lastTick = Date.now()
      return
    }

    const now = Date.now()
    const delta = (now - lastTick) / 1000
    lastTick = now

    timerState.currentPhaseTime += delta
    timerState.totalElapsed += delta

    const phase = timerState.phases[timerState.currentPhaseIndex]
    if (!phase) {
      completeWorkout()
      return
    }

    // Wait phases don't auto-complete - they need user interaction
    if (phase.type === 'wait') {
      updateTimerDisplay()
      return
    }

    const remaining = phase.duration - timerState.currentPhaseTime
    const currentSecond = Math.ceil(remaining)

    // Countdown beeps
    if (
      currentSecond !== lastSecond &&
      currentSecond <= 3 &&
      currentSecond > 0 &&
      phase.duration !== Number.POSITIVE_INFINITY
    ) {
      audioManager.playCountdown(currentSecond)
      const settings = settingsManager.get()
      if (settings.voice && currentSecond <= 3) {
        speechManager.announceNumber(currentSecond)
      }
      lastSecond = currentSecond
    }

    // Phase complete
    if (remaining <= 0 && phase.duration !== Number.POSITIVE_INFINITY) {
      nextPhase()
    }

    updateTimerDisplay()
  }, 50)
}

function nextPhase(): void {
  timerState.currentPhaseIndex++
  timerState.currentPhaseTime = 0

  const phase = timerState.phases[timerState.currentPhaseIndex]
  if (!phase) {
    completeWorkout()
    return
  }

  // Announce phase
  speechManager.announcePhase(phase.type)
  if (phase.round) {
    speechManager.announceRound(phase.round)
  }

  // Play sounds
  if (phase.type === 'work') {
    audioManager.playWorkStart()
  } else if (phase.type === 'rest') {
    audioManager.playRestStart()
  } else {
    audioManager.playRoundComplete()
  }

  // Start/stop metronome based on phase (with phase-specific BPM if set)
  const metroSettings = getPhaseMetronomeSettings(phase, lastConfig?.metronome)
  startMetronomeForPhase(phase, metroSettings, isPaused)

  updateTimerDisplay()
}

function updateTimerDisplay(): void {
  const phase = timerState.phases[timerState.currentPhaseIndex]
  if (!phase) return

  const phaseEl = $id('timer-phase')
  const timeEl = $id('timer-time')
  const infoEl = $id('timer-info')
  const nextEl = $id('timer-next')
  const progressEl = $id('timer-progress')
  const blockLabelEl = $id('timer-block-label')
  const exerciseEl = $id('timer-exercise')

  const phaseColor = PHASE_COLORS[phase.type] || 'var(--text-primary)'

  // Block label display
  if (blockLabelEl) {
    if (phase.customLabel || phase.label) {
      blockLabelEl.textContent = phase.customLabel ?? phase.label?.toUpperCase() ?? ''
      addClass(blockLabelEl, 'active')
    } else {
      removeClass(blockLabelEl, 'active')
    }
  }

  // Exercise display
  if (exerciseEl) {
    const exerciseText = formatExerciseDisplay(phase)
    if (exerciseText) {
      exerciseEl.textContent = exerciseText
      addClass(exerciseEl, 'active')
    } else {
      removeClass(exerciseEl, 'active')
    }
  }

  // Phase label and color
  const phaseLabel = phase.type === 'wait' ? 'DONE?' : phase.type.toUpperCase() + (phase.type === 'work' ? '!' : '')
  if (phaseEl) {
    phaseEl.textContent = phaseLabel
    phaseEl.style.color = phaseColor
  }

  // Time display
  const settings = settingsManager.get()
  if (
    timerState.type === 'stopwatch' ||
    (timerState.type === 'amrap' && phase.type === 'work') ||
    (timerState.type === 'fortime' && phase.type === 'work' && phase.duration === Number.POSITIVE_INFINITY)
  ) {
    // Count up
    const elapsed = timerState.currentPhaseTime
    if (timeEl) {
      if (settings.millis && timerState.type === 'stopwatch') {
        timeEl.textContent = formatTimeMillis(elapsed)
      } else {
        timeEl.textContent = formatTime(Math.floor(elapsed))
      }
    }
  } else {
    // Count down
    const remaining = Math.max(0, phase.duration - timerState.currentPhaseTime)
    if (timeEl) timeEl.textContent = formatTime(Math.ceil(remaining))
  }
  if (timeEl) timeEl.style.color = phaseColor

  // Info
  if (infoEl) {
    if (phase.round) {
      const totalRounds = timerState.phases.filter((p) => p.type === 'work').length
      infoEl.textContent = `Round ${phase.round}/${totalRounds}`
    } else if (timerState.type === 'amrap') {
      infoEl.textContent = `Rounds: ${timerState.rounds}`
    } else if (timerState.type === 'stopwatch' && timerState.laps.length > 0) {
      infoEl.textContent = `Laps: ${timerState.laps.length}`
    } else {
      infoEl.textContent = ''
    }
  }

  // Next phase
  const nextPhaseData = timerState.phases[timerState.currentPhaseIndex + 1]
  if (nextEl) {
    if (nextPhaseData && phase.duration !== Number.POSITIVE_INFINITY) {
      nextEl.textContent = `Next: ${nextPhaseData.type} ${formatTime(nextPhaseData.duration)}`
    } else {
      nextEl.textContent = ''
    }
  }

  // Progress bar
  if (progressEl) {
    if (phase.duration !== Number.POSITIVE_INFINITY) {
      const progress = (timerState.currentPhaseTime / phase.duration) * 100
      progressEl.style.width = `${100 - progress}%`
      progressEl.style.background = phaseColor
    } else {
      progressEl.style.width = '100%'
      progressEl.style.background = phaseColor
    }
  }

  // Update stats
  const statTotalEl = $id('stat-total')
  const statWorkEl = $id('stat-work')
  if (statTotalEl) {
    statTotalEl.textContent = formatTime(Math.floor(timerState.totalElapsed))
  }
  if (statWorkEl) {
    // Calculate work time so far
    let workTime = 0
    for (let i = 0; i < timerState.currentPhaseIndex; i++) {
      const p = timerState.phases[i]
      if (p?.type === 'work') {
        workTime += p.duration
      }
    }
    if (phase.type === 'work') {
      workTime += timerState.currentPhaseTime
    }
    statWorkEl.textContent = formatTime(Math.floor(workTime))
  }
}

export function togglePause(): void {
  isPaused = !isPaused
  setMetronomePaused(isPaused)
  const pauseBtn = $id('btn-pause')
  if (pauseBtn) pauseBtn.textContent = isPaused ? 'Resume' : 'Pause'
}

export function skipPhase(): void {
  nextPhase()
}

export function addLap(): void {
  const elapsed = timerState.currentPhaseTime
  const lastLap = timerState.laps.length > 0 ? timerState.laps[timerState.laps.length - 1]?.total ?? 0 : 0
  timerState.laps.push({
    lap: timerState.laps.length + 1,
    split: elapsed - lastLap,
    total: elapsed,
  })
  audioManager.playRoundComplete()
  updateTimerDisplay()
}

export function addRound(): void {
  timerState.rounds++
  audioManager.playRoundComplete()
  updateTimerDisplay()
}

export function finishForTime(): void {
  completeWorkout()
}

export function advanceFromWait(): void {
  audioManager.playRoundComplete()
  nextPhase()
  updateTimerControls()
}

export function stopTimer(): boolean {
  if (confirm('Stop this workout?')) {
    if (timerInterval !== null) clearInterval(timerInterval)
    stopMetronome()
    timerInterval = null
    wakeLockManager.release()
    const screen = $id('timer-screen')
    if (screen) removeClass(screen, 'active')
    return true
  }
  return false
}

export function backToConfig(openTimerFn: (type: string) => void): void {
  if (confirm('Go back to configuration? Timer will be stopped.')) {
    if (timerInterval !== null) clearInterval(timerInterval)
    stopMetronome()
    timerInterval = null
    wakeLockManager.release()
    const screen = $id('timer-screen')
    if (screen) removeClass(screen, 'active')
    if (lastConfig?.type) {
      openTimerFn(lastConfig.type)
    }
  }
}

function completeWorkout(): void {
  if (timerInterval !== null) clearInterval(timerInterval)
  stopMetronome()
  timerInterval = null
  wakeLockManager.release()

  audioManager.playWorkoutFinish()
  speechManager.speak('Workout complete!')

  // Save to history
  if (lastConfig) {
    const workPhases = timerState.phases.filter((p) => p.type === 'work')
    historyManager.add({
      type: timerState.type as TimerType,
      duration: Math.floor(timerState.totalElapsed),
      workTime: workPhases.reduce((sum, p) => sum + Math.min(p.duration, timerState.totalElapsed), 0),
      rounds: timerState.rounds || workPhases.length,
      config: lastConfig,
    })
  }

  // Show complete screen
  const timerScreen = $id('timer-screen')
  if (timerScreen) removeClass(timerScreen, 'active')
  showCompleteScreen()
}

function showCompleteScreen(): void {
  const stats = $id('complete-stats')
  if (stats) {
    const workPhases = timerState.phases.filter((p) => p.type === 'work')
    stats.innerHTML = `
      <div class="stat-item">
        <div class="stat-value">${formatTime(Math.floor(timerState.totalElapsed))}</div>
        <div class="stat-label">Total Time</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${timerState.rounds || workPhases.length}</div>
        <div class="stat-label">Rounds</div>
      </div>
    `

    if (timerState.laps.length > 0) {
      stats.innerHTML += `
        <div class="stat-item" style="grid-column: span 2;">
          <div class="stat-value">${timerState.laps.length}</div>
          <div class="stat-label">Laps</div>
        </div>
      `
    }
  }

  const completeScreen = $id('complete-screen')
  if (completeScreen) addClass(completeScreen, 'active')
}

export function closeComplete(): void {
  const screen = $id('complete-screen')
  if (screen) removeClass(screen, 'active')
}

export function backToConfigFromComplete(openTimerFn: (type: string) => void): void {
  closeComplete()
  if (lastConfig?.type) {
    openTimerFn(lastConfig.type)
  }
}

export function restartWorkout(): void {
  closeComplete()
  if (lastConfig) {
    startTimer(lastConfig)
  }
}
