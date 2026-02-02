export type PhaseType =
  | 'work'
  | 'rest'
  | 'warmup'
  | 'cooldown'
  | 'prepare'
  | 'countdown'
  | 'stopwatch'
  | 'wait'

export interface Exercise {
  name: string
  reps?: number
  weight?: number
  weightUnit?: 'kg' | 'lbs'
  percentage?: string
  pse?: number
}

export interface Phase {
  type: PhaseType
  duration: number
  label?: string
  customLabel?: string
  round?: number
  exercises?: Exercise[]
  metronome?: number
}

export const PHASE_COLORS: Record<PhaseType, string> = {
  work: 'var(--phase-work)',
  rest: 'var(--phase-rest)',
  warmup: 'var(--phase-warmup)',
  cooldown: 'var(--phase-cooldown)',
  prepare: 'var(--phase-prepare)',
  countdown: 'var(--accent-cyan)',
  stopwatch: 'var(--accent-cyan)',
  wait: 'var(--phase-prepare)',
}

export const PHASE_LABELS: Record<PhaseType, string> = {
  work: 'Work!',
  rest: 'Rest',
  warmup: 'Warm up',
  cooldown: 'Cool down',
  prepare: 'Get ready',
  countdown: 'Countdown',
  stopwatch: 'Stopwatch',
  wait: 'Done?',
}
