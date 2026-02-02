import type { Phase, TimerConfig } from '@/types'

function buildStopwatchPhases(): Phase[] {
  return [{ type: 'stopwatch', duration: Number.POSITIVE_INFINITY }]
}

function buildCountdownPhases(config: TimerConfig): Phase[] {
  return [{ type: 'countdown', duration: config.duration }]
}

function buildIntervalPhases(config: TimerConfig): Phase[] {
  const phases: Phase[] = []
  if (config.warmup > 0) phases.push({ type: 'warmup', duration: config.warmup })
  for (let i = 0; i < config.rounds; i++) {
    phases.push({ type: 'work', duration: config.work, round: i + 1 })
    if (config.rest > 0) phases.push({ type: 'rest', duration: config.rest, round: i + 1 })
  }
  if (config.cooldown > 0) phases.push({ type: 'cooldown', duration: config.cooldown })
  return phases
}

function buildEmomPhases(config: TimerConfig): Phase[] {
  const phases: Phase[] = []
  if (config.warmup > 0) phases.push({ type: 'warmup', duration: config.warmup })
  for (let i = 0; i < config.rounds; i++) {
    phases.push({ type: 'work', duration: 60, round: i + 1 })
  }
  if (config.cooldown > 0) phases.push({ type: 'cooldown', duration: config.cooldown })
  return phases
}

function buildAmrapPhases(config: TimerConfig): Phase[] {
  const phases: Phase[] = []
  if (config.warmup > 0) phases.push({ type: 'warmup', duration: config.warmup })
  phases.push({ type: 'work', duration: config.timeCap })
  if (config.cooldown > 0) phases.push({ type: 'cooldown', duration: config.cooldown })
  return phases
}

function buildForTimePhases(config: TimerConfig): Phase[] {
  const phases: Phase[] = []
  if (config.warmup > 0) phases.push({ type: 'warmup', duration: config.warmup })
  phases.push({ type: 'work', duration: config.timeCap || Number.POSITIVE_INFINITY })
  if (config.cooldown > 0) phases.push({ type: 'cooldown', duration: config.cooldown })
  return phases
}

const phaseBuilders: Record<string, (config: TimerConfig) => Phase[]> = {
  stopwatch: buildStopwatchPhases,
  countdown: buildCountdownPhases,
  intervals: buildIntervalPhases,
  emom: buildEmomPhases,
  amrap: buildAmrapPhases,
  fortime: buildForTimePhases,
}

export function buildPhases(config: TimerConfig): Phase[] {
  if (config.type === 'custom') return config.parsed.phases
  return phaseBuilders[config.type]?.(config) ?? []
}
