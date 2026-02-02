import type { MetronomeSettings } from './settings'
import type { Phase, Exercise } from './phase'

export type TimerType =
  | 'stopwatch'
  | 'countdown'
  | 'intervals'
  | 'emom'
  | 'amrap'
  | 'fortime'
  | 'custom'

export interface BaseTimerConfig {
  type: TimerType
  metronome?: MetronomeSettings
}

export interface StopwatchConfig extends BaseTimerConfig {
  type: 'stopwatch'
}

export interface CountdownConfig extends BaseTimerConfig {
  type: 'countdown'
  duration: number
}

export interface IntervalsConfig extends BaseTimerConfig {
  type: 'intervals'
  work: number
  rest: number
  rounds: number
  warmup: number
  cooldown: number
}

export interface EmomConfig extends BaseTimerConfig {
  type: 'emom'
  rounds: number
  warmup: number
  cooldown: number
}

export interface AmrapConfig extends BaseTimerConfig {
  type: 'amrap'
  timeCap: number
  warmup: number
  cooldown: number
}

export interface ForTimeConfig extends BaseTimerConfig {
  type: 'fortime'
  timeCap: number
  warmup: number
  cooldown: number
}

export interface CustomConfig extends BaseTimerConfig {
  type: 'custom'
  text: string
  parsed: ParsedWorkout
}

export type TimerConfig =
  | StopwatchConfig
  | CountdownConfig
  | IntervalsConfig
  | EmomConfig
  | AmrapConfig
  | ForTimeConfig
  | CustomConfig

export type BlockType =
  | 'warmup'
  | 'cooldown'
  | 'fortime'
  | 'amrap'
  | 'emom'
  | 'tabata'
  | 'rest'
  | 'wait'
  | 'work'

export interface WorkoutBlock {
  type: BlockType
  label?: string
  phases: Phase[]
  totalDuration: number
  repetitions?: number
  exercises?: Exercise[]
  metronome?: number
}

export interface ParsedWorkout {
  phases: Phase[]
  blocks: WorkoutBlock[]
  error?: string
}

export interface Lap {
  lap: number
  split: number
  total: number
}

export interface TimerState {
  type: TimerType | null
  phases: Phase[]
  currentPhaseIndex: number
  currentPhaseTime: number
  totalElapsed: number
  rounds: number
  laps: Lap[]
  startTime: number | null
  pausedTime: number
  globalTimeCap?: number // Time cap total for exercise stepping
  globalCapStartTime?: number // When the cap started
  amrapRound?: number // Current AMRAP round
}

export interface SavedWorkout {
  id: number
  name: string
  description?: string
  type: TimerType
  tags?: string[]
  textDefinition?: string
  config?: TimerConfig
  metronome?: MetronomeSettings
  createdAt: string
  updatedAt: string
  lastUsedAt: string | null
  useCount: number
  isFavorite: boolean
}

export interface HistoryEntry {
  id: number
  date: string
  type: TimerType
  duration: number
  workTime: number
  rounds: number
  config: TimerConfig
}

export const INITIAL_TIMER_STATE: TimerState = {
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
