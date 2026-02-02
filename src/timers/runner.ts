import {
  audioManager,
  historyManager,
  settingsManager,
  speechManager,
  wakeLockManager,
} from '@/managers'
import type { MetronomeSettings, Phase, TimerConfig, TimerState, TimerType } from '@/types'
import { PHASE_COLORS } from '@/types'
import { $id, addClass, formatTime, formatTimeMillis, removeClass } from '@/utils'
import { buildPhases } from './builder'
import { setMetronomePaused, startMetronomeForPhase, stopMetronome } from './metronome'

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

function getPhaseMetronomeSettings(
  phase: Phase,
  baseSettings: MetronomeSettings | undefined
): MetronomeSettings | undefined {
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

  const phases = buildPhases(config)

  // Detect if we have exercise phases with time cap
  const firstExercisePhase = phases.find((p) => p.timeCap)
  const globalTimeCap = firstExercisePhase?.timeCap

  timerState = {
    type: config.type,
    phases,
    currentPhaseIndex: 0,
    currentPhaseTime: 0,
    totalElapsed: 0,
    rounds: 0,
    laps: [],
    startTime: Date.now(),
    pausedTime: 0,
    globalTimeCap,
    globalCapStartTime: undefined,
    amrapRound: 1,
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

  // Handle exercise stepping phases (ForTime/AMRAP with exercises)
  if (phase?.isWait && phase.exerciseIndex) {
    const isLast = phase.exerciseIndex === phase.exerciseCount
    const isForTime = phase.label === 'fortime'
    const buttonText = isLast && isForTime ? 'Finish' : 'Next'

    controls.innerHTML = `
      <button class="btn btn-danger" onclick="window.timerApp.stopTimer()">Stop</button>
      <button class="btn btn-secondary" id="btn-pause" onclick="window.timerApp.togglePause()">Pause</button>
      <button class="btn btn-done btn-primary" onclick="window.timerApp.advanceFromWait()">${buttonText}</button>
    `
    return
  }

  // Handle regular wait phase (isWait indicates a phase that counts up without time limit)
  if (phase?.isWait) {
    controls.innerHTML = `
      <button class="btn btn-danger" onclick="window.timerApp.stopTimer()">Stop</button>
      <button class="btn btn-secondary" id="btn-pause" onclick="window.timerApp.togglePause()">Pause</button>
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

    // Start cap timer when entering first exercise phase
    if (phase.exerciseIndex === 1 && timerState.globalTimeCap && !timerState.globalCapStartTime) {
      timerState.globalCapStartTime = Date.now()
    }

    // Check if time cap expired
    if (timerState.globalTimeCap && timerState.globalCapStartTime) {
      const capElapsed = (Date.now() - timerState.globalCapStartTime - timerState.pausedTime) / 1000
      if (capElapsed >= timerState.globalTimeCap) {
        completeWorkout()
        return
      }
    }

    // Wait phases don't auto-complete - they need user interaction
    // Don't call updateTimerControls() here - it replaces innerHTML and breaks button click events
    if (phase.isWait) {
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
  // Wait phases should look like work phases (green color) - only difference is no time limit
  const displayColor = phase.isWait ? PHASE_COLORS['work'] : phaseColor
  let phaseLabel: string
  if (phase.isWait) {
    // Show as "WORK!" to look like a normal work phase
    phaseLabel = 'WORK!'
  } else {
    phaseLabel = phase.type.toUpperCase() + (phase.type === 'work' ? '!' : '')
  }
  if (phaseEl) {
    phaseEl.textContent = phaseLabel
    phaseEl.style.color = displayColor
  }

  // Time display
  const settings = settingsManager.get()
  if (
    phase.isWait ||
    timerState.type === 'stopwatch' ||
    (timerState.type === 'amrap' && phase.type === 'work') ||
    (timerState.type === 'fortime' &&
      phase.type === 'work' &&
      phase.duration === Number.POSITIVE_INFINITY)
  ) {
    // Count up (stopwatch style)
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
  if (timeEl) timeEl.style.color = displayColor

  // Info
  if (infoEl) {
    if (phase.exerciseIndex && phase.exerciseCount) {
      // Exercise stepping mode
      let info = `Exercise ${phase.exerciseIndex}/${phase.exerciseCount}`
      if (phase.label === 'amrap' && timerState.amrapRound) {
        info = `Round ${timerState.amrapRound} | ${info}`
      }
      infoEl.textContent = info
    } else if (phase.round) {
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
    if (nextPhaseData && !phase.isWait) {
      const nextDuration = nextPhaseData.isWait ? '∞' : formatTime(nextPhaseData.duration)
      nextEl.textContent = `Next: ${nextPhaseData.type} ${nextDuration}`
    } else {
      nextEl.textContent = ''
    }
  }

  // Progress bar
  if (progressEl) {
    if (phase.duration !== Number.POSITIVE_INFINITY) {
      const progress = (timerState.currentPhaseTime / phase.duration) * 100
      progressEl.style.width = `${100 - progress}%`
      progressEl.style.background = displayColor
    } else {
      progressEl.style.width = '100%'
      progressEl.style.background = displayColor
    }
  }

  // Update stats
  const statTotalEl = $id('stat-total')
  const statWorkEl = $id('stat-work')
  const statCapContainer = $id('stat-cap-container')
  const statCapEl = $id('stat-cap')

  if (statTotalEl) {
    statTotalEl.textContent = formatTime(Math.floor(timerState.totalElapsed))
  }
  if (statWorkEl) {
    // Calculate work time so far
    let workTime = 0
    for (let i = 0; i < timerState.currentPhaseIndex; i++) {
      const p = timerState.phases[i]
      if (p?.type === 'work') {
        workTime += p.duration === Number.POSITIVE_INFINITY ? 0 : p.duration
      }
    }
    if (phase.type === 'work') {
      workTime += timerState.currentPhaseTime
    }
    statWorkEl.textContent = formatTime(Math.floor(workTime))
  }

  // Time cap display
  if (statCapContainer && statCapEl) {
    if (timerState.globalTimeCap && timerState.globalCapStartTime) {
      const capElapsed = (Date.now() - timerState.globalCapStartTime - timerState.pausedTime) / 1000
      const capRemaining = Math.max(0, timerState.globalTimeCap - capElapsed)
      statCapEl.textContent = formatTime(Math.ceil(capRemaining))
      ;(statCapContainer as HTMLElement).style.display = ''
    } else if (timerState.globalTimeCap) {
      // Show full cap before it starts
      statCapEl.textContent = formatTime(timerState.globalTimeCap)
      ;(statCapContainer as HTMLElement).style.display = ''
    } else {
      ;(statCapContainer as HTMLElement).style.display = 'none'
    }
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
  const lastLap =
    timerState.laps.length > 0 ? (timerState.laps[timerState.laps.length - 1]?.total ?? 0) : 0
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

  const currentPhase = timerState.phases[timerState.currentPhaseIndex]

  // AMRAP: last exercise - loop back to first
  if (currentPhase?.loopEnd && timerState.globalTimeCap) {
    const capElapsed = timerState.globalCapStartTime
      ? (Date.now() - timerState.globalCapStartTime - timerState.pausedTime) / 1000
      : 0

    if (capElapsed < timerState.globalTimeCap) {
      // Loop back to first exercise
      const loopStartIndex = timerState.phases.findIndex((p) => p.loopStart)
      if (loopStartIndex >= 0) {
        timerState.amrapRound = (timerState.amrapRound || 1) + 1
        timerState.rounds++
        timerState.currentPhaseIndex = loopStartIndex
        timerState.currentPhaseTime = 0
        speechManager.announceRound(timerState.amrapRound)
        updateTimerDisplay()
        updateTimerControls()
        return
      }
    }
    // Time expired - complete workout
    completeWorkout()
    return
  }

  // ForTime: last exercise - complete workout
  if (
    currentPhase?.exerciseIndex === currentPhase?.exerciseCount &&
    currentPhase?.label === 'fortime'
  ) {
    completeWorkout()
    return
  }

  // Normal advance
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
      workTime: workPhases.reduce(
        (sum, p) => sum + Math.min(p.duration, timerState.totalElapsed),
        0
      ),
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
