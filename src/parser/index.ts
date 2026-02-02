import type { Phase, PhaseType, Exercise, ParsedWorkout, WorkoutBlock, BlockType } from '@/types'
import { parseTimeDuration } from '@/utils/format'

function parseExercise(text: string): Exercise {
  const nameMatch = text.match(/^([^(]+)/)
  const name = nameMatch?.[1]?.trim() ?? text

  const exercise: Exercise = { name }

  const metaMatch = text.match(/\(([^)]+)\)/)
  if (metaMatch?.[1]) {
    const parts = metaMatch[1].split('|').map((p) => p.trim())
    for (const part of parts) {
      if (part.match(/^\d+x$/i)) {
        exercise.reps = Number.parseInt(part, 10)
      } else if (part.match(/^@\d+/)) {
        const match = part.slice(1).match(/(\d+)(kg|lbs)?/i)
        if (match) {
          exercise.weight = Number.parseInt(match[1] ?? '0', 10)
          exercise.weightUnit = (match[2]?.toLowerCase() as 'kg' | 'lbs') ?? 'kg'
        }
      } else if (part.includes('%')) {
        exercise.percentage = part
      } else if (part.toLowerCase().startsWith('pse')) {
        exercise.pse = Number.parseInt(part.replace(/pse\s*/i, ''), 10)
      }
    }
  }

  return exercise
}

function extractMetronome(line: string): { bpm: number | null; cleanedLine: string } {
  const match = line.match(/\[(\d+)\s*bpm\]/i)
  if (match?.[1]) {
    return {
      bpm: Number.parseInt(match[1], 10),
      cleanedLine: line.replace(match[0], '').trim(),
    }
  }
  return { bpm: null, cleanedLine: line }
}

export function parseCustomWorkout(text: string): ParsedWorkout {
  const phases: Phase[] = []
  const blocks: WorkoutBlock[] = []

  const lines = text
    .trim()
    .split('\n')
    .map((l) => l.trim())

  let currentBlockType: BlockType | null = null
  let currentCustomLabel: string | null = null
  let currentMetronome: number | null = null
  let currentExercises: Exercise[] = []
  let repeatCount = 1
  let repeatPhases: Phase[] = []
  let inRepeat = false
  let repeatLabel: string | null = null
  let repeatMetronome: number | null = null

  function createBlock(
    type: BlockType,
    blockPhases: Phase[],
    label?: string,
    repetitions?: number,
    exercises?: Exercise[],
    metronome?: number,
  ): WorkoutBlock {
    return {
      type,
      label,
      phases: blockPhases,
      totalDuration: blockPhases.reduce((sum, p) => sum + (p.duration === Number.POSITIVE_INFINITY ? 0 : p.duration), 0),
      repetitions,
      exercises: exercises?.length ? exercises : undefined,
      metronome,
    }
  }

  function flushCurrentBlock(): void {
    if (currentExercises.length > 0 && phases.length > 0) {
      const lastPhase = phases[phases.length - 1]
      if (lastPhase && !lastPhase.exercises?.length) {
        lastPhase.exercises = [...currentExercises]
      }
    }
    currentExercises = []
  }

  function closeRepeat(): void {
    if (inRepeat && repeatPhases.length > 0) {
      const blockPhases: Phase[] = []
      for (let r = 0; r < repeatCount; r++) {
        for (const p of repeatPhases) {
          const phase = { ...p }
          if (currentExercises.length > 0 && !phase.exercises?.length) {
            phase.exercises = [...currentExercises]
          }
          phases.push(phase)
          blockPhases.push(phase)
        }
      }
      blocks.push(
        createBlock(
          repeatLabel === 'tabata' ? 'tabata' : 'work',
          blockPhases,
          currentCustomLabel ?? repeatLabel ?? undefined,
          repeatCount,
          currentExercises.length > 0 ? currentExercises : undefined,
          repeatMetronome ?? undefined,
        ),
      )
      currentExercises = []
      currentCustomLabel = null
    }
    inRepeat = false
    repeatCount = 1
    repeatPhases = []
    repeatLabel = null
    repeatMetronome = null
  }

  for (const rawLine of lines) {
    // Parse custom label (# Label)
    if (rawLine.startsWith('#')) {
      flushCurrentBlock()
      currentCustomLabel = rawLine.slice(1).trim()
      continue
    }

    // Skip empty lines but use them to close repeat blocks
    if (rawLine === '') {
      closeRepeat()
      continue
    }

    // Extract metronome from line
    const { bpm: lineBpm, cleanedLine } = extractMetronome(rawLine)
    if (lineBpm !== null) {
      if (inRepeat) {
        repeatMetronome = lineBpm
      } else {
        currentMetronome = lineBpm
      }
    }

    const line = cleanedLine
    const lineLower = line.toLowerCase()

    // Parse wait
    if (lineLower === 'wait') {
      closeRepeat()
      flushCurrentBlock()
      const phase: Phase = {
        type: 'wait',
        duration: 0,
        customLabel: currentCustomLabel ?? undefined,
      }
      phases.push(phase)
      blocks.push(createBlock('wait', [phase], currentCustomLabel ?? undefined))
      currentCustomLabel = null
      continue
    }

    // Parse exercises (- or •)
    if (line.startsWith('-') || line.startsWith('•')) {
      const exercise = parseExercise(line.slice(1).trim())
      currentExercises.push(exercise)

      // Also attach to the last phase and block if they exist
      if (phases.length > 0) {
        const lastPhase = phases[phases.length - 1]
        if (lastPhase) {
          if (!lastPhase.exercises) lastPhase.exercises = []
          lastPhase.exercises.push(exercise)
        }
      }
      if (blocks.length > 0) {
        const lastBlock = blocks[blocks.length - 1]
        if (lastBlock) {
          if (!lastBlock.exercises) lastBlock.exercises = []
          lastBlock.exercises.push(exercise)
        }
      }
      continue
    }

    // EMOM section labels (ignore, just organizational)
    if (lineLower.match(/^emom(\s+\d+)?$/i)) {
      currentBlockType = 'emom'
      continue
    }

    // ForTime with cap: "fortime 10min" -> work phase of given duration
    if (lineLower.match(/^for\s*time\s+\d+/i)) {
      closeRepeat()
      flushCurrentBlock()
      const duration = parseTimeDuration(lineLower)
      if (duration > 0) {
        const phase: Phase = {
          type: 'work',
          duration,
          label: 'fortime',
          customLabel: currentCustomLabel ?? undefined,
          metronome: currentMetronome ?? undefined,
          exercises: currentExercises.length > 0 ? [...currentExercises] : undefined,
        }
        phases.push(phase)
        blocks.push(
          createBlock(
            'fortime',
            [phase],
            currentCustomLabel ?? 'For Time',
            undefined,
            currentExercises.length > 0 ? currentExercises : undefined,
            currentMetronome ?? undefined,
          ),
        )
        currentExercises = []
        currentCustomLabel = null
        currentMetronome = null
      }
      continue
    }

    // AMRAP: "amrap 12min" -> work phase of given duration
    if (lineLower.match(/^amrap\s+\d+/i)) {
      closeRepeat()
      flushCurrentBlock()
      const duration = parseTimeDuration(lineLower)
      if (duration > 0) {
        const phase: Phase = {
          type: 'work',
          duration,
          label: 'amrap',
          customLabel: currentCustomLabel ?? undefined,
          metronome: currentMetronome ?? undefined,
          exercises: currentExercises.length > 0 ? [...currentExercises] : undefined,
        }
        phases.push(phase)
        blocks.push(
          createBlock(
            'amrap',
            [phase],
            currentCustomLabel ?? 'AMRAP',
            undefined,
            currentExercises.length > 0 ? currentExercises : undefined,
            currentMetronome ?? undefined,
          ),
        )
        currentExercises = []
        currentCustomLabel = null
        currentMetronome = null
      }
      continue
    }

    // Parse "Xs work", "Xs rest", "Xmin work", "Xmin rest" patterns first
    const timeTypeMatch = lineLower.match(/^(\d+)\s*(s|sec|m|min)?\s*(work|rest)$/i)
    if (timeTypeMatch) {
      const num = Number.parseInt(timeTypeMatch[1] ?? '0', 10)
      const unit = timeTypeMatch[2]?.toLowerCase()
      const type = (timeTypeMatch[3]?.toLowerCase() ?? 'work') as PhaseType
      const duration = unit?.startsWith('m') ? num * 60 : num

      const phase: Phase = {
        type,
        duration,
        metronome: inRepeat ? repeatMetronome ?? undefined : currentMetronome ?? undefined,
      }
      if (inRepeat) {
        repeatPhases.push(phase)
      } else {
        if (currentExercises.length > 0) {
          phase.exercises = [...currentExercises]
        }
        phase.customLabel = currentCustomLabel ?? undefined
        phases.push(phase)

        // Create a simple block for standalone phases
        if (!currentBlockType) {
          blocks.push(
            createBlock(
              type as BlockType,
              [phase],
              currentCustomLabel ?? undefined,
              undefined,
              currentExercises.length > 0 ? currentExercises : undefined,
              currentMetronome ?? undefined,
            ),
          )
          currentExercises = []
          currentCustomLabel = null
          currentMetronome = null
        }
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
        closeRepeat()
        flushCurrentBlock()
        const phase: Phase = { type: 'rest', duration, customLabel: currentCustomLabel ?? undefined }
        phases.push(phase)
        blocks.push(createBlock('rest', [phase], currentCustomLabel ?? undefined))
        currentCustomLabel = null
        currentMetronome = null
        continue
      }
    }

    if (lineLower === 'warmup' || lineLower === 'warm up' || lineLower === 'warm-up') {
      closeRepeat()
      flushCurrentBlock()
      currentBlockType = 'warmup'
    } else if (lineLower === 'cooldown' || lineLower === 'cool down' || lineLower === 'cool-down') {
      closeRepeat()
      flushCurrentBlock()
      currentBlockType = 'cooldown'
    } else if (lineLower.match(/^(tabata|hiit|intervals?)\s*(\d+)x?$/i)) {
      closeRepeat()
      flushCurrentBlock()
      const match = lineLower.match(/(\d+)/)
      repeatCount = Number.parseInt(match?.[1] ?? '1', 10) || 1
      inRepeat = true
      repeatPhases = []
      repeatLabel = 'tabata'
      repeatMetronome = currentMetronome
      currentMetronome = null
    } else if (lineLower.match(/^(\d+)x$/)) {
      closeRepeat()
      flushCurrentBlock()
      const match = lineLower.match(/(\d+)/)
      repeatCount = Number.parseInt(match?.[1] ?? '1', 10) || 1
      inRepeat = true
      repeatPhases = []
      repeatLabel = currentBlockType ?? null
      repeatMetronome = currentMetronome
      currentMetronome = null
    } else if (lineLower === 'end' || lineLower === 'endrepeat') {
      closeRepeat()
    } else if (timeMatch || lineLower.match(/^\d+\s*(s|m|sec|min)/)) {
      let duration = 0

      const colonMatch = lineLower.match(/^(\d+):(\d+)$/)
      if (colonMatch) {
        duration = Number.parseInt(colonMatch[1] ?? '0', 10) * 60 + Number.parseInt(colonMatch[2] ?? '0', 10)
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
      else if (currentBlockType === 'warmup') phaseType = 'warmup'
      else if (currentBlockType === 'cooldown') phaseType = 'cooldown'

      const phase: Phase = {
        type: phaseType,
        duration,
        metronome: inRepeat ? repeatMetronome ?? undefined : currentMetronome ?? undefined,
      }

      if (inRepeat) {
        repeatPhases.push(phase)
      } else {
        if (currentExercises.length > 0) {
          phase.exercises = [...currentExercises]
        }
        phase.customLabel = currentCustomLabel ?? undefined
        phases.push(phase)

        // Create block for warmup/cooldown
        if (currentBlockType === 'warmup' || currentBlockType === 'cooldown') {
          blocks.push(
            createBlock(
              currentBlockType,
              [phase],
              currentCustomLabel ?? undefined,
              undefined,
              undefined,
              currentMetronome ?? undefined,
            ),
          )
          currentExercises = []
          currentCustomLabel = null
          currentMetronome = null
        }
      }

      if (!inRepeat) currentBlockType = null
    } else if (lineLower === 'work') {
      currentBlockType = 'work'
    } else if (lineLower === 'rest') {
      currentBlockType = 'rest'
    }
  }

  // Handle unclosed repeat
  closeRepeat()

  // Handle any remaining exercises
  flushCurrentBlock()

  if (phases.length === 0) {
    return { error: 'No valid phases found', phases: [], blocks: [] }
  }

  return { phases, blocks }
}

export { customPresets, intervalPresets } from './presets'
