import type { Phase, TimerConfig, MetronomeSettings } from '@/types'

export interface TimerDefinition {
  title: string
  render: () => string
  getConfig: () => TimerConfig
  validate: () => boolean
  onUpdate?: () => void
}

export interface TimerRuntime {
  config: TimerConfig
  phases: Phase[]
  currentPhaseIndex: number
  currentPhaseTime: number
  totalElapsed: number
  rounds: number
  laps: Array<{ lap: number; split: number; total: number }>
  startTime: number
  isPaused: boolean
  interval: number | null
  metronome: MetronomeState
}

export interface MetronomeState {
  settings: MetronomeSettings
  interval: number | null
  nextNoteTime: number
  bpm: number
}

export const METRONOME_SCHEDULE_AHEAD = 0.1 // Schedule 100ms ahead
export const METRONOME_LOOKAHEAD = 25 // Check every 25ms
