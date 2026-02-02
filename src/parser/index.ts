import type { Phase, PhaseType, ParsedWorkout } from '@/types'
import { parseTimeDuration } from '@/utils/format'

export function parseCustomWorkout(text: string): ParsedWorkout {
  const phases: Phase[] = []
  const lines = text
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))

  let currentBlock: PhaseType | null = null
  let repeatCount = 1
  let repeatPhases: Phase[] = []
  let inRepeat = false

  for (const line of lines) {
    const lineLower = line.toLowerCase()

    // EMOM section labels (ignore, just organizational)
    // "emom", "emom 1", "emom 2", etc.
    if (lineLower.match(/^emom(\s+\d+)?$/i)) {
      continue
    }

    // ForTime with cap: "fortime 10min" -> work phase of given duration
    if (lineLower.match(/^for\s*time\s+\d+/i)) {
      const duration = parseTimeDuration(lineLower)
      if (duration > 0) {
        phases.push({ type: 'work', duration })
      }
      continue
    }

    // AMRAP: "amrap 12min" -> work phase of given duration
    if (lineLower.match(/^amrap\s+\d+/i)) {
      const duration = parseTimeDuration(lineLower)
      if (duration > 0) {
        phases.push({ type: 'work', duration })
      }
      continue
    }

    // Parse time: "30s", "1m", "1:30", "90"
    const timeMatch =
      lineLower.match(/^(\d+):(\d+)$/) ||
      lineLower.match(/^(\d+)\s*(s|sec|seconds?)?$/) ||
      lineLower.match(/^(\d+)\s*(m|min|minutes?)$/)

    // Standalone rest: "1min rest", "30s rest", "rest 1min"
    if (lineLower.includes('rest') && lineLower.match(/\d+/) && !timeMatch) {
      const duration = parseTimeDuration(lineLower)
      if (duration > 0) {
        phases.push({ type: 'rest', duration })
        continue
      }
    }

    if (lineLower === 'warmup' || lineLower === 'warm up' || lineLower === 'warm-up') {
      currentBlock = 'warmup'
    } else if (lineLower === 'cooldown' || lineLower === 'cool down' || lineLower === 'cool-down') {
      currentBlock = 'cooldown'
    } else if (lineLower.match(/^(tabata|hiit|intervals?)\s*(\d+)x?$/i)) {
      const match = lineLower.match(/(\d+)/)
      repeatCount = Number.parseInt(match?.[1] ?? '1', 10) || 1
      inRepeat = true
      repeatPhases = []
    } else if (lineLower.match(/^(\d+)x$/)) {
      const match = lineLower.match(/(\d+)/)
      repeatCount = Number.parseInt(match?.[1] ?? '1', 10) || 1
      inRepeat = true
      repeatPhases = []
    } else if (lineLower === 'end' || lineLower === 'endrepeat') {
      if (inRepeat && repeatPhases.length > 0) {
        for (let r = 0; r < repeatCount; r++) {
          phases.push(...repeatPhases.map((p) => ({ ...p })))
        }
      }
      inRepeat = false
      repeatCount = 1
      repeatPhases = []
    } else if (timeMatch || lineLower.match(/^\d+\s*(s|m|sec|min)/)) {
      let duration = 0

      const colonMatch = lineLower.match(/^(\d+):(\d+)$/)
      if (colonMatch) {
        duration =
          Number.parseInt(colonMatch[1] ?? '0', 10) * 60 +
          Number.parseInt(colonMatch[2] ?? '0', 10)
      } else if (lineLower.match(/(\d+)\s*(m|min)/)) {
        const numMatch = lineLower.match(/(\d+)/)
        duration = Number.parseInt(numMatch?.[1] ?? '0', 10) * 60
      } else {
        const numMatch = lineLower.match(/(\d+)/)
        duration = Number.parseInt(numMatch?.[1] ?? '0', 10)
      }

      let phaseType: PhaseType = 'work'
      if (lineLower.includes('rest')) phaseType = 'rest'
      else if (lineLower.includes('work')) phaseType = 'work'
      else if (currentBlock === 'warmup') phaseType = 'warmup'
      else if (currentBlock === 'cooldown') phaseType = 'cooldown'

      const phase: Phase = { type: phaseType, duration }

      if (inRepeat) {
        repeatPhases.push(phase)
      } else {
        phases.push(phase)
      }

      if (!inRepeat) currentBlock = null
    } else if (lineLower === 'work') {
      currentBlock = 'work'
    } else if (lineLower === 'rest') {
      currentBlock = 'rest'
    }
  }

  // Handle unclosed repeat
  if (inRepeat && repeatPhases.length > 0) {
    for (let r = 0; r < repeatCount; r++) {
      phases.push(...repeatPhases.map((p) => ({ ...p })))
    }
  }

  if (phases.length === 0) {
    return { error: 'No valid phases found', phases: [] }
  }

  return { phases }
}

export { customPresets, intervalPresets } from './presets'
