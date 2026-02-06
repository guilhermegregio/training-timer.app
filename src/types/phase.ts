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

export type MetronomeMode = 'work' | 'rest' | 'always'

export interface Phase {
  type: PhaseType
  duration: number
  label?: string
  customLabel?: string
  round?: number
  exercises?: Exercise[]
  metronome?: number
  metronomeMode?: MetronomeMode
  isWait?: boolean
  exerciseIndex?: number // 1-based index (ex: 2 of 6)
  exerciseCount?: number // Total exercises in this segment
  loopStart?: boolean // First exercise in AMRAP loop
  loopEnd?: boolean // Last exercise in AMRAP loop
  timeCap?: number // Time cap for this segment

  // Block tracking for custom workouts
  blockId?: number // Unique block ID (0, 1, 2...)
  blockLabel?: string // Label of the block ("goblet squat", "db thruster")
  blockRound?: number // Current round within the block (1-6)
  blockTotalRounds?: number // Total rounds in the block (6)
  blockSubPhase?: number // Current sub-phase within round (1-4)
  blockSubPhaseTotal?: number // Total sub-phases per round

  actualDuration?: number // Actual time spent in phase (saved on advance)
  millis?: boolean // Show milliseconds display for this phase
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
