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
  // Se fase tem BPM próprio via [xBpm], auto-ativa o metrônomo
  if (phase.metronome) {
    return {
      enabled: true,
      bpm: phase.metronome,
      duringWork: true,
      duringRest: true,
      always: true, // Garante que toca independente do tipo de fase
    }
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

function shouldStartCapTimer(phase: Phase): boolean {
  return phase.exerciseIndex === 1 && !!timerState.globalTimeCap && !timerState.globalCapStartTime
}

function isTimeCapExpired(): boolean {
  if (!timerState.globalTimeCap || !timerState.globalCapStartTime) return false
  const capElapsed = (Date.now() - timerState.globalCapStartTime - timerState.pausedTime) / 1000
  return capElapsed >= timerState.globalTimeCap
}

function handleCountdownBeeps(phase: Phase, currentSecond: number, lastSecond: number): boolean {
  if (currentSecond === lastSecond) return false
  if (currentSecond > 3 || currentSecond <= 0) return false
  if (phase.duration === Number.POSITIVE_INFINITY) return false

  audioManager.playCountdown(currentSecond)
  const settings = settingsManager.get()
  if (settings.voice) speechManager.announceNumber(currentSecond)
  return true
}

function timerTick(lastTickRef: { value: number }, lastSecondRef: { value: number }): void {
  if (isPaused) {
    lastTickRef.value = Date.now()
    return
  }

  const now = Date.now()
  const delta = (now - lastTickRef.value) / 1000
  lastTickRef.value = now

  timerState.currentPhaseTime += delta
  timerState.totalElapsed += delta

  const phase = timerState.phases[timerState.currentPhaseIndex]
  if (!phase) {
    completeWorkout()
    return
  }

  if (shouldStartCapTimer(phase)) timerState.globalCapStartTime = Date.now()
  if (isTimeCapExpired()) {
    completeWorkout()
    return
  }

  if (phase.isWait) {
    updateTimerDisplay()
    return
  }

  const remaining = phase.duration - timerState.currentPhaseTime
  const currentSecond = Math.ceil(remaining)

  if (handleCountdownBeeps(phase, currentSecond, lastSecondRef.value)) {
    lastSecondRef.value = currentSecond
  }

  if (remaining <= 0 && phase.duration !== Number.POSITIVE_INFINITY) {
    nextPhase()
  }

  updateTimerDisplay()
}

function runTimer(): void {
  const lastTickRef = { value: Date.now() }
  const lastSecondRef = { value: -1 }

  const firstPhase = timerState.phases[0]
  if (firstPhase) {
    speechManager.announcePhase(firstPhase.type)
    if (firstPhase.type === 'work') audioManager.playWorkStart()
    else if (firstPhase.type === 'rest') audioManager.playRestStart()

    const metroSettings = getPhaseMetronomeSettings(firstPhase, lastConfig?.metronome)
    startMetronomeForPhase(firstPhase, metroSettings, isPaused)
  }

  timerInterval = window.setInterval(() => {
    timerTick(lastTickRef, lastSecondRef)
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

function updateBlockLabel(phase: Phase): void {
  const el = $id('timer-block-label')
  if (!el) return
  if (phase.customLabel || phase.label) {
    el.textContent = phase.customLabel ?? phase.label?.toUpperCase() ?? ''
    addClass(el, 'active')
  } else {
    removeClass(el, 'active')
  }
}

function updateExerciseDisplay(phase: Phase): void {
  const el = $id('timer-exercise')
  if (!el) return
  const text = formatExerciseDisplay(phase)
  if (text) {
    el.textContent = text
    addClass(el, 'active')
  } else {
    removeClass(el, 'active')
  }
}

function getDisplayColor(phase: Phase): string {
  const phaseColor = PHASE_COLORS[phase.type] || 'var(--text-primary)'
  return phase.isWait ? PHASE_COLORS.work : phaseColor
}

function updatePhaseLabel(phase: Phase, color: string): void {
  const el = $id('timer-phase')
  if (!el) return
  const label = phase.isWait
    ? 'WORK!'
    : phase.type.toUpperCase() + (phase.type === 'work' ? '!' : '')
  el.textContent = label
  el.style.color = color
}

function shouldCountUp(phase: Phase): boolean {
  return (
    phase.isWait ||
    timerState.type === 'stopwatch' ||
    (timerState.type === 'amrap' && phase.type === 'work') ||
    (timerState.type === 'fortime' &&
      phase.type === 'work' &&
      phase.duration === Number.POSITIVE_INFINITY)
  )
}

function updateTimeDisplay(phase: Phase, color: string): void {
  const el = $id('timer-time')
  if (!el) return

  if (shouldCountUp(phase)) {
    const settings = settingsManager.get()
    el.textContent =
      settings.millis && timerState.type === 'stopwatch'
        ? formatTimeMillis(timerState.currentPhaseTime)
        : formatTime(Math.floor(timerState.currentPhaseTime))
  } else {
    const remaining = Math.max(0, phase.duration - timerState.currentPhaseTime)
    el.textContent = formatTime(Math.ceil(remaining))
  }
  el.style.color = color
}

function getInfoText(phase: Phase): string {
  if (phase.exerciseIndex && phase.exerciseCount) {
    const info = `Exercise ${phase.exerciseIndex}/${phase.exerciseCount}`
    return phase.label === 'amrap' && timerState.amrapRound
      ? `Round ${timerState.amrapRound} | ${info}`
      : info
  }
  if (phase.round) {
    const totalRounds = timerState.phases.filter((p) => p.type === 'work').length
    return `Round ${phase.round}/${totalRounds}`
  }
  if (timerState.type === 'amrap') return `Rounds: ${timerState.rounds}`
  if (timerState.type === 'stopwatch' && timerState.laps.length > 0)
    return `Laps: ${timerState.laps.length}`
  return ''
}

function updateInfoDisplay(phase: Phase): void {
  const el = $id('timer-info')
  if (el) el.textContent = getInfoText(phase)
}

function updateNextPhaseDisplay(phase: Phase): void {
  const el = $id('timer-next')
  if (!el) return
  const nextPhaseData = timerState.phases[timerState.currentPhaseIndex + 1]
  if (nextPhaseData && !phase.isWait) {
    const nextDuration = nextPhaseData.isWait ? '∞' : formatTime(nextPhaseData.duration)
    el.textContent = `Next: ${nextPhaseData.type} ${nextDuration}`
  } else {
    el.textContent = ''
  }
}

function updateProgressBar(phase: Phase, color: string): void {
  const el = $id('timer-progress')
  if (!el) return
  if (phase.duration !== Number.POSITIVE_INFINITY) {
    const progress = (timerState.currentPhaseTime / phase.duration) * 100
    el.style.width = `${100 - progress}%`
  } else {
    el.style.width = '100%'
  }
  el.style.background = color
}

function calculateWorkTime(phase: Phase): number {
  let workTime = 0
  for (let i = 0; i < timerState.currentPhaseIndex; i++) {
    const p = timerState.phases[i]
    if (p?.type === 'work') workTime += p.duration === Number.POSITIVE_INFINITY ? 0 : p.duration
  }
  if (phase.type === 'work') workTime += timerState.currentPhaseTime
  return workTime
}

function updateStats(phase: Phase): void {
  const statTotalEl = $id('stat-total')
  const statWorkEl = $id('stat-work')
  if (statTotalEl) statTotalEl.textContent = formatTime(Math.floor(timerState.totalElapsed))
  if (statWorkEl) statWorkEl.textContent = formatTime(Math.floor(calculateWorkTime(phase)))
}

function updateTimeCapDisplay(): void {
  const container = $id('stat-cap-container') as HTMLElement | null
  const el = $id('stat-cap')
  if (!container || !el) return

  if (timerState.globalTimeCap && timerState.globalCapStartTime) {
    const capElapsed = (Date.now() - timerState.globalCapStartTime - timerState.pausedTime) / 1000
    el.textContent = formatTime(Math.ceil(Math.max(0, timerState.globalTimeCap - capElapsed)))
    container.style.display = ''
  } else if (timerState.globalTimeCap) {
    el.textContent = formatTime(timerState.globalTimeCap)
    container.style.display = ''
  } else {
    container.style.display = 'none'
  }
}

function updateTimerDisplay(): void {
  const phase = timerState.phases[timerState.currentPhaseIndex]
  if (!phase) return

  const color = getDisplayColor(phase)

  updateBlockLabel(phase)
  updateExerciseDisplay(phase)
  updatePhaseLabel(phase, color)
  updateTimeDisplay(phase, color)
  updateInfoDisplay(phase)
  updateNextPhaseDisplay(phase)
  updateProgressBar(phase, color)
  updateStats(phase)
  updateTimeCapDisplay()
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
