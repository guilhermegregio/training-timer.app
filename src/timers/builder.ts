import type { Phase, TimerConfig } from '@/types'

export function buildPhases(config: TimerConfig): Phase[] {
  const phases: Phase[] = []

  switch (config.type) {
    case 'stopwatch':
      phases.push({ type: 'stopwatch', duration: Number.POSITIVE_INFINITY })
      break

    case 'countdown':
      phases.push({ type: 'countdown', duration: config.duration })
      break

    case 'intervals':
      if (config.warmup > 0) {
        phases.push({ type: 'warmup', duration: config.warmup })
      }
      for (let i = 0; i < config.rounds; i++) {
        phases.push({ type: 'work', duration: config.work, round: i + 1 })
        if (config.rest > 0) {
          phases.push({ type: 'rest', duration: config.rest, round: i + 1 })
        }
      }
      if (config.cooldown > 0) {
        phases.push({ type: 'cooldown', duration: config.cooldown })
      }
      break

    case 'emom':
      if (config.warmup > 0) {
        phases.push({ type: 'warmup', duration: config.warmup })
      }
      for (let i = 0; i < config.rounds; i++) {
        phases.push({ type: 'work', duration: 60, round: i + 1 })
      }
      if (config.cooldown > 0) {
        phases.push({ type: 'cooldown', duration: config.cooldown })
      }
      break

    case 'amrap':
      if (config.warmup > 0) {
        phases.push({ type: 'warmup', duration: config.warmup })
      }
      phases.push({ type: 'work', duration: config.timeCap })
      if (config.cooldown > 0) {
        phases.push({ type: 'cooldown', duration: config.cooldown })
      }
      break

    case 'fortime':
      if (config.warmup > 0) {
        phases.push({ type: 'warmup', duration: config.warmup })
      }
      phases.push({ type: 'work', duration: config.timeCap || Number.POSITIVE_INFINITY })
      if (config.cooldown > 0) {
        phases.push({ type: 'cooldown', duration: config.cooldown })
      }
      break

    case 'custom':
      return config.parsed.phases
  }

  return phases
}
