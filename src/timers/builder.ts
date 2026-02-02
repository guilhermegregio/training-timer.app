import type {
  AmrapConfig,
  CountdownConfig,
  EmomConfig,
  ForTimeConfig,
  IntervalsConfig,
  Phase,
  TimerConfig,
} from '@/types'

function buildStopwatchPhases(): Phase[] {
  return [{ type: 'stopwatch', duration: Number.POSITIVE_INFINITY }]
}

function buildCountdownPhases(config: CountdownConfig): Phase[] {
  return [{ type: 'countdown', duration: config.duration }]
}

function buildIntervalPhases(config: IntervalsConfig): Phase[] {
  const phases: Phase[] = []
  if (config.warmup > 0) phases.push({ type: 'warmup', duration: config.warmup })
  for (let i = 0; i < config.rounds; i++) {
    phases.push({ type: 'work', duration: config.work, round: i + 1 })
    if (config.rest > 0) phases.push({ type: 'rest', duration: config.rest, round: i + 1 })
  }
  if (config.cooldown > 0) phases.push({ type: 'cooldown', duration: config.cooldown })
  return phases
}

function buildEmomPhases(config: EmomConfig): Phase[] {
  const phases: Phase[] = []
  if (config.warmup > 0) phases.push({ type: 'warmup', duration: config.warmup })
  for (let i = 0; i < config.rounds; i++) {
    phases.push({ type: 'work', duration: 60, round: i + 1 })
  }
  if (config.cooldown > 0) phases.push({ type: 'cooldown', duration: config.cooldown })
  return phases
}

function buildAmrapPhases(config: AmrapConfig): Phase[] {
  const phases: Phase[] = []
  if (config.warmup > 0) phases.push({ type: 'warmup', duration: config.warmup })
  phases.push({ type: 'work', duration: config.timeCap })
  if (config.cooldown > 0) phases.push({ type: 'cooldown', duration: config.cooldown })
  return phases
}

function buildForTimePhases(config: ForTimeConfig): Phase[] {
  const phases: Phase[] = []
  if (config.warmup > 0) phases.push({ type: 'warmup', duration: config.warmup })
  phases.push({ type: 'work', duration: config.timeCap || Number.POSITIVE_INFINITY })
  if (config.cooldown > 0) phases.push({ type: 'cooldown', duration: config.cooldown })
  return phases
}

export function buildPhases(config: TimerConfig): Phase[] {
  switch (config.type) {
    case 'stopwatch':
      return buildStopwatchPhases()
    case 'countdown':
      return buildCountdownPhases(config)
    case 'intervals':
      return buildIntervalPhases(config)
    case 'emom':
      return buildEmomPhases(config)
    case 'amrap':
      return buildAmrapPhases(config)
    case 'fortime':
      return buildForTimePhases(config)
    case 'custom':
      return config.parsed.phases
    default:
      return []
  }
}
