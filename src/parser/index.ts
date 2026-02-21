import type {
  BlockType,
  Exercise,
  MetronomeMode,
  ParsedWorkout,
  Phase,
  PhaseType,
  WorkoutBlock,
} from '@/types'
import { parseTimeDuration } from '@/utils/format'

function expandExercisePhases(phases: Phase[]): Phase[] {
  const result: Phase[] = []

  for (const phase of phases) {
    if (!shouldExpandPhase(phase) || !phase.exercises) {
      result.push(phase)
      continue
    }

    const exerciseCount = phase.exercises.length
    const isAmrap = phase.label === 'amrap'

    for (let idx = 0; idx < phase.exercises.length; idx++) {
      const ex = phase.exercises[idx]
      if (!ex) continue
      result.push({
        ...phase,
        type: 'work',
        duration: Number.POSITIVE_INFINITY,
        isWait: true,
        exercises: [ex],
        exerciseIndex: idx + 1,
        exerciseCount,
        loopStart: isAmrap && idx === 0,
        loopEnd: isAmrap && idx === exerciseCount - 1,
        timeCap: phase.duration !== Number.POSITIVE_INFINITY ? phase.duration : undefined,
      })
    }
  }

  return result
}

function shouldExpandPhase(phase: Phase): boolean {
  return (
    phase.type === 'work' &&
    !!phase.exercises &&
    phase.exercises.length > 1 &&
    (phase.isWait || phase.label === 'fortime' || phase.label === 'amrap')
  )
}

function parseReps(part: string): number | null {
  if (part.match(/^\d+x$/i)) return Number.parseInt(part, 10)
  return null
}

function parseWeight(part: string): { weight: number; unit: 'kg' | 'lbs' } | null {
  if (!part.match(/^@\d+/)) return null
  const match = part.slice(1).match(/(\d+)(kg|lbs)?/i)
  if (!match) return null
  return {
    weight: Number.parseInt(match[1] ?? '0', 10),
    unit: (match[2]?.toLowerCase() as 'kg' | 'lbs') ?? 'kg',
  }
}

function parsePercentage(part: string): string | null {
  return part.includes('%') ? part : null
}

function parsePse(part: string): number | null {
  if (!part.toLowerCase().startsWith('pse')) return null
  return Number.parseInt(part.replace(/pse\s*/i, ''), 10)
}

function parseExercise(text: string): Exercise {
  const nameMatch = text.match(/^([^(]+)/)
  const exercise: Exercise = { name: nameMatch?.[1]?.trim() ?? text }

  const metaMatch = text.match(/\(([^)]+)\)/)
  if (!metaMatch?.[1]) return exercise

  for (const part of metaMatch[1].split('|').map((p) => p.trim())) {
    const reps = parseReps(part)
    if (reps !== null) {
      exercise.reps = reps
      continue
    }

    const weight = parseWeight(part)
    if (weight) {
      exercise.weight = weight.weight
      exercise.weightUnit = weight.unit
      continue
    }

    const percentage = parsePercentage(part)
    if (percentage) {
      exercise.percentage = percentage
      continue
    }

    const pse = parsePse(part)
    if (pse !== null) exercise.pse = pse
  }

  return exercise
}

function extractMetronome(line: string): {
  bpm: number | null
  bpmMode: MetronomeMode | null
  cleanedLine: string
} {
  const match = line.match(/\[(\d+)\s*bpm(?:\s+(work|rest|always))?\]/i)
  if (match?.[1]) {
    const mode = (match[2]?.toLowerCase() as MetronomeMode) ?? 'work'
    return {
      bpm: Number.parseInt(match[1], 10),
      bpmMode: mode,
      cleanedLine: line.replace(match[0], '').trim(),
    }
  }
  return { bpm: null, bpmMode: null, cleanedLine: line }
}

function extractMillisConfig(line: string): {
  millis: boolean | null
  cleanedLine: string
} {
  const match = line.match(/\bms=(on|off)\b/i)
  if (match?.[1]) {
    return {
      millis: match[1].toLowerCase() === 'on',
      cleanedLine: line.replace(match[0], '').trim(),
    }
  }
  return { millis: null, cleanedLine: line }
}

interface ParserContext {
  phases: Phase[]
  blocks: WorkoutBlock[]
  currentBlockType: BlockType | null
  currentCustomLabel: string | null
  currentMetronome: number | null
  currentMetronomeMode: MetronomeMode | null
  currentExercises: Exercise[]
  repeatCount: number
  repeatPhases: Phase[]
  inRepeat: boolean
  repeatLabel: string | null
  repeatMetronome: number | null
  repeatMetronomeMode: MetronomeMode | null
  repeatExplicitClose: boolean
  explicitCloseRepeats: Set<number>
  currentLineIndex: number
  nextBlockId: number
}

function createContext(): ParserContext {
  return {
    phases: [],
    blocks: [],
    currentBlockType: null,
    currentCustomLabel: null,
    currentMetronome: null,
    currentMetronomeMode: null,
    currentExercises: [],
    repeatCount: 1,
    repeatPhases: [],
    inRepeat: false,
    repeatLabel: null,
    repeatMetronome: null,
    repeatMetronomeMode: null,
    repeatExplicitClose: false,
    explicitCloseRepeats: new Set(),
    currentLineIndex: 0,
    nextBlockId: 0,
  }
}

function createBlock(
  type: BlockType,
  blockPhases: Phase[],
  label?: string,
  repetitions?: number,
  exercises?: Exercise[],
  metronome?: number,
  subPhases?: Phase[]
): WorkoutBlock {
  return {
    type,
    label,
    phases: blockPhases,
    totalDuration: blockPhases.reduce(
      (sum, p) => sum + (p.duration === Number.POSITIVE_INFINITY ? 0 : p.duration),
      0
    ),
    repetitions,
    exercises: exercises?.length ? exercises : undefined,
    metronome,
    subPhases: subPhases?.length ? subPhases : undefined,
  }
}

function flushCurrentBlock(ctx: ParserContext): void {
  if (ctx.currentExercises.length > 0 && ctx.phases.length > 0) {
    const lastPhase = ctx.phases[ctx.phases.length - 1]
    if (lastPhase && !lastPhase.exercises?.length) {
      lastPhase.exercises = [...ctx.currentExercises]
    }
  }
  ctx.currentExercises = []
}

function resetRepeatState(ctx: ParserContext): void {
  ctx.inRepeat = false
  ctx.repeatCount = 1
  ctx.repeatPhases = []
  ctx.repeatLabel = null
  ctx.repeatMetronome = null
  ctx.repeatMetronomeMode = null
  ctx.repeatExplicitClose = false
}

function expandRepeatPhases(ctx: ParserContext): Phase[] {
  const blockPhases: Phase[] = []
  const phasesPerRound = ctx.repeatPhases.length
  const totalRounds = ctx.repeatCount
  const blockLabel = ctx.currentCustomLabel ?? ctx.repeatLabel ?? undefined
  const blockId = ctx.nextBlockId++

  for (let round = 0; round < ctx.repeatCount; round++) {
    for (let subPhase = 0; subPhase < phasesPerRound; subPhase++) {
      const p = ctx.repeatPhases[subPhase]
      if (!p) continue

      const phase: Phase = {
        ...p,
        blockId,
        blockLabel,
        blockRound: round + 1,
        blockTotalRounds: totalRounds,
        blockSubPhase: subPhase + 1,
        blockSubPhaseTotal: phasesPerRound,
      }
      if (ctx.currentExercises.length > 0 && !phase.exercises?.length) {
        phase.exercises = [...ctx.currentExercises]
      }
      ctx.phases.push(phase)
      blockPhases.push(phase)
    }
  }
  return blockPhases
}

function closeRepeat(ctx: ParserContext): void {
  if (!ctx.inRepeat || ctx.repeatPhases.length === 0) {
    resetRepeatState(ctx)
    return
  }

  const phaseExercises = ctx.repeatPhases.flatMap((p) => p.exercises ?? [])
  const blockPhases = expandRepeatPhases(ctx)
  const blockExercises =
    phaseExercises.length > 0
      ? phaseExercises
      : ctx.currentExercises.length > 0
        ? ctx.currentExercises
        : undefined

  // Save sub-phases template for structured preview when repeat is complex
  const phasesWithExercises = ctx.repeatPhases.filter((p) => p.exercises?.length).length
  const isComplex =
    phasesWithExercises > 1 || (ctx.repeatPhases.length > 2 && phasesWithExercises > 0)
  const subPhases = isComplex ? [...ctx.repeatPhases] : undefined

  ctx.blocks.push(
    createBlock(
      ctx.repeatLabel === 'tabata' ? 'tabata' : 'work',
      blockPhases,
      ctx.currentCustomLabel ?? ctx.repeatLabel ?? undefined,
      ctx.repeatCount,
      blockExercises,
      ctx.repeatMetronome ?? undefined,
      subPhases
    )
  )
  ctx.currentExercises = []
  ctx.currentCustomLabel = null
  resetRepeatState(ctx)
}

function handleCommentLine(rawLine: string, ctx: ParserContext): boolean {
  if (!rawLine.startsWith('#')) return false
  flushCurrentBlock(ctx)
  ctx.currentCustomLabel = rawLine.slice(1).trim()
  return true
}

function handleEmptyLine(rawLine: string, ctx: ParserContext): boolean {
  if (rawLine !== '') return false
  if (ctx.inRepeat && ctx.repeatExplicitClose) return true
  closeRepeat(ctx)
  return true
}

function getWaitPhaseType(lineLower: string, blockType: BlockType | null): PhaseType {
  if (lineLower === 'wait work') return 'work'
  if (lineLower === 'wait rest') return 'rest'
  if (lineLower === 'wait' && blockType === 'warmup') return 'warmup'
  if (lineLower === 'wait' && blockType === 'cooldown') return 'cooldown'
  return 'wait'
}

function createWaitPhase(ctx: ParserContext, phaseType: PhaseType): Phase {
  return {
    type: phaseType,
    duration: Number.POSITIVE_INFINITY,
    isWait: true,
    customLabel: ctx.currentCustomLabel ?? undefined,
    metronome: ctx.inRepeat
      ? (ctx.repeatMetronome ?? undefined)
      : (ctx.currentMetronome ?? undefined),
    metronomeMode: ctx.inRepeat
      ? (ctx.repeatMetronomeMode ?? undefined)
      : (ctx.currentMetronomeMode ?? undefined),
  }
}

function addWaitBlockToContext(ctx: ParserContext, phase: Phase): void {
  flushCurrentBlock(ctx)
  if (ctx.currentExercises.length > 0) phase.exercises = [...ctx.currentExercises]
  ctx.phases.push(phase)
  ctx.blocks.push(
    createBlock(
      'wait',
      [phase],
      ctx.currentCustomLabel ?? undefined,
      undefined,
      ctx.currentExercises.length > 0 ? ctx.currentExercises : undefined,
      ctx.currentMetronome ?? undefined
    )
  )
  ctx.currentExercises = []
  ctx.currentCustomLabel = null
  ctx.currentMetronome = null
}

function handleWaitLine(lineLower: string, ctx: ParserContext): boolean {
  if (lineLower !== 'wait' && !lineLower.startsWith('wait ')) return false

  const phaseType = getWaitPhaseType(lineLower, ctx.currentBlockType)
  const phase = createWaitPhase(ctx, phaseType)

  if (ctx.inRepeat) {
    ctx.repeatPhases.push(phase)
  } else {
    addWaitBlockToContext(ctx, phase)
  }
  return true
}

function attachExerciseToLast(exercise: Exercise, ctx: ParserContext): boolean {
  let attached = false
  const lastPhase = ctx.phases[ctx.phases.length - 1]
  if (lastPhase) {
    if (!lastPhase.exercises) lastPhase.exercises = []
    lastPhase.exercises.push(exercise)
    attached = true
  }
  const lastBlock = ctx.blocks[ctx.blocks.length - 1]
  if (lastBlock) {
    if (!lastBlock.exercises) lastBlock.exercises = []
    lastBlock.exercises.push(exercise)
    attached = true
  }
  return attached
}

function handleExerciseLine(line: string, ctx: ParserContext): boolean {
  if (!line.startsWith('-') && !line.startsWith('•')) return false

  const exercise = parseExercise(line.slice(1).trim())

  if (ctx.inRepeat) {
    const lastRepeatPhase = ctx.repeatPhases[ctx.repeatPhases.length - 1]
    if (lastRepeatPhase) {
      if (!lastRepeatPhase.exercises) lastRepeatPhase.exercises = []
      lastRepeatPhase.exercises.push(exercise)
    } else {
      ctx.currentExercises.push(exercise)
    }
    return true
  }

  // Attach directly to existing phase/block without buffering in
  // currentExercises, which would leak into the next phase.
  // Only buffer if no phase/block exists yet (exercises before any phase line).
  if (!attachExerciseToLast(exercise, ctx)) {
    ctx.currentExercises.push(exercise)
  }
  return true
}

function handleStopwatchLine(
  lineLower: string,
  ctx: ParserContext,
  millis: boolean | null
): boolean {
  if (lineLower !== 'stopwatch') return false

  const phase: Phase = {
    type: 'stopwatch',
    duration: Number.POSITIVE_INFINITY,
    isWait: true,
    millis: millis ?? undefined,
    customLabel: ctx.currentCustomLabel ?? undefined,
    metronome: getContextMetronome(ctx),
    metronomeMode: getContextMetronomeMode(ctx),
  }

  if (ctx.inRepeat) {
    ctx.repeatPhases.push(phase)
  } else {
    flushCurrentBlock(ctx)
    if (ctx.currentExercises.length > 0) phase.exercises = [...ctx.currentExercises]
    ctx.phases.push(phase)
    ctx.blocks.push(
      createBlock(
        'work',
        [phase],
        ctx.currentCustomLabel ?? undefined,
        undefined,
        ctx.currentExercises.length > 0 ? ctx.currentExercises : undefined,
        ctx.currentMetronome ?? undefined
      )
    )
    resetContextAfterBlock(ctx)
  }
  return true
}

function handleCountdownLine(
  lineLower: string,
  ctx: ParserContext,
  millis: boolean | null
): boolean {
  if (!lineLower.startsWith('countdown ')) return false

  const duration = parseTimeDuration(lineLower)
  if (duration <= 0) return false

  const phase: Phase = {
    type: 'countdown',
    duration,
    millis: millis ?? undefined,
    customLabel: ctx.currentCustomLabel ?? undefined,
    metronome: getContextMetronome(ctx),
    metronomeMode: getContextMetronomeMode(ctx),
  }

  if (ctx.inRepeat) {
    ctx.repeatPhases.push(phase)
  } else {
    flushCurrentBlock(ctx)
    if (ctx.currentExercises.length > 0) phase.exercises = [...ctx.currentExercises]
    ctx.phases.push(phase)
    ctx.blocks.push(
      createBlock(
        'work',
        [phase],
        ctx.currentCustomLabel ?? undefined,
        undefined,
        ctx.currentExercises.length > 0 ? ctx.currentExercises : undefined,
        ctx.currentMetronome ?? undefined
      )
    )
    resetContextAfterBlock(ctx)
  }
  return true
}

function handleEmomLabel(lineLower: string, ctx: ParserContext): boolean {
  if (!lineLower.match(/^emom(\s+\d+)?$/i)) return false
  ctx.currentBlockType = 'emom'
  return true
}

function handleForTimeLine(
  lineLower: string,
  ctx: ParserContext,
  millis: boolean | null = null
): boolean {
  if (!lineLower.match(/^for\s*time\s+\d+/i)) return false

  closeRepeat(ctx)
  flushCurrentBlock(ctx)
  const duration = parseTimeDuration(lineLower)
  if (duration <= 0) return true

  const phase: Phase = {
    type: 'work',
    duration,
    label: 'fortime',
    millis: millis ?? undefined,
    customLabel: ctx.currentCustomLabel ?? undefined,
    metronome: ctx.currentMetronome ?? undefined,
    exercises: ctx.currentExercises.length > 0 ? [...ctx.currentExercises] : undefined,
  }
  ctx.phases.push(phase)
  ctx.blocks.push(
    createBlock(
      'fortime',
      [phase],
      ctx.currentCustomLabel ?? 'For Time',
      undefined,
      ctx.currentExercises.length > 0 ? ctx.currentExercises : undefined,
      ctx.currentMetronome ?? undefined
    )
  )
  ctx.currentExercises = []
  ctx.currentCustomLabel = null
  ctx.currentMetronome = null
  return true
}

function handleAmrapLine(
  lineLower: string,
  ctx: ParserContext,
  millis: boolean | null = null
): boolean {
  if (!lineLower.match(/^amrap\s+\d+/i)) return false

  closeRepeat(ctx)
  flushCurrentBlock(ctx)
  const duration = parseTimeDuration(lineLower)
  if (duration <= 0) return true

  const phase: Phase = {
    type: 'work',
    duration,
    label: 'amrap',
    millis: millis ?? undefined,
    customLabel: ctx.currentCustomLabel ?? undefined,
    metronome: ctx.currentMetronome ?? undefined,
    exercises: ctx.currentExercises.length > 0 ? [...ctx.currentExercises] : undefined,
  }
  ctx.phases.push(phase)
  ctx.blocks.push(
    createBlock(
      'amrap',
      [phase],
      ctx.currentCustomLabel ?? 'AMRAP',
      undefined,
      ctx.currentExercises.length > 0 ? ctx.currentExercises : undefined,
      ctx.currentMetronome ?? undefined
    )
  )
  ctx.currentExercises = []
  ctx.currentCustomLabel = null
  ctx.currentMetronome = null
  return true
}

function getContextMetronome(ctx: ParserContext): number | undefined {
  return ctx.inRepeat ? (ctx.repeatMetronome ?? undefined) : (ctx.currentMetronome ?? undefined)
}

function getContextMetronomeMode(ctx: ParserContext): MetronomeMode | undefined {
  return ctx.inRepeat
    ? (ctx.repeatMetronomeMode ?? undefined)
    : (ctx.currentMetronomeMode ?? undefined)
}

function resetContextAfterBlock(ctx: ParserContext): void {
  ctx.currentExercises = []
  ctx.currentCustomLabel = null
  ctx.currentMetronome = null
  ctx.currentMetronomeMode = null
}

function handleTimeTypeLine(
  lineLower: string,
  ctx: ParserContext,
  millis: boolean | null = null
): boolean {
  const match = lineLower.match(/^(\d+)\s*(s|sec|m|min)?\s*(work|rest)$/i)
  if (!match) return false

  const num = Number.parseInt(match[1] ?? '0', 10)
  const unit = match[2]?.toLowerCase()
  const type = (match[3]?.toLowerCase() ?? 'work') as PhaseType
  const duration = unit?.startsWith('m') ? num * 60 : num

  const phase: Phase = {
    type,
    duration,
    millis: millis ?? undefined,
    metronome: getContextMetronome(ctx),
    metronomeMode: getContextMetronomeMode(ctx),
  }

  if (ctx.inRepeat) {
    ctx.repeatPhases.push(phase)
    return true
  }

  if (ctx.currentExercises.length > 0) phase.exercises = [...ctx.currentExercises]
  phase.customLabel = ctx.currentCustomLabel ?? undefined
  ctx.phases.push(phase)

  if (!ctx.currentBlockType) {
    ctx.blocks.push(
      createBlock(
        type as BlockType,
        [phase],
        ctx.currentCustomLabel ?? undefined,
        undefined,
        ctx.currentExercises.length > 0 ? ctx.currentExercises : undefined,
        ctx.currentMetronome ?? undefined
      )
    )
    resetContextAfterBlock(ctx)
  }
  return true
}

function handleStandaloneRestLine(lineLower: string, ctx: ParserContext): boolean {
  const timeMatch =
    lineLower.match(/^(\d+):(\d+)$/) ||
    lineLower.match(/^(\d+)\s*(s|sec|seconds?)?$/) ||
    lineLower.match(/^(\d+)\s*(m|min|minutes?)$/)

  if (!lineLower.includes('rest') || !lineLower.match(/\d+/) || timeMatch) return false

  const duration = parseTimeDuration(lineLower)
  if (duration <= 0) return false

  if (ctx.inRepeat) {
    ctx.repeatPhases.push({ type: 'rest', duration })
    return true
  }

  closeRepeat(ctx)
  flushCurrentBlock(ctx)
  const phase: Phase = { type: 'rest', duration, customLabel: ctx.currentCustomLabel ?? undefined }
  ctx.phases.push(phase)
  ctx.blocks.push(createBlock('rest', [phase], ctx.currentCustomLabel ?? undefined))
  ctx.currentCustomLabel = null
  ctx.currentMetronome = null
  return true
}

function handleBlockTypeKeyword(lineLower: string, ctx: ParserContext): boolean {
  if (lineLower === 'warmup' || lineLower === 'warm up' || lineLower === 'warm-up') {
    closeRepeat(ctx)
    flushCurrentBlock(ctx)
    ctx.currentBlockType = 'warmup'
    return true
  }
  if (lineLower === 'cooldown' || lineLower === 'cool down' || lineLower === 'cool-down') {
    closeRepeat(ctx)
    flushCurrentBlock(ctx)
    ctx.currentBlockType = 'cooldown'
    return true
  }
  if (lineLower === 'work') {
    ctx.currentBlockType = 'work'
    return true
  }
  if (lineLower === 'rest') {
    ctx.currentBlockType = 'rest'
    return true
  }
  return false
}

function handleRepeatLine(lineLower: string, ctx: ParserContext): boolean {
  if (lineLower.match(/^(tabata|hiit|intervals?)\s*(\d+)x?$/i)) {
    closeRepeat(ctx)
    flushCurrentBlock(ctx)
    const match = lineLower.match(/(\d+)/)
    ctx.repeatCount = Number.parseInt(match?.[1] ?? '1', 10) || 1
    ctx.inRepeat = true
    ctx.repeatPhases = []
    ctx.repeatLabel = 'tabata'
    ctx.repeatExplicitClose = ctx.explicitCloseRepeats.has(ctx.currentLineIndex)
    ctx.repeatMetronome = ctx.currentMetronome
    ctx.repeatMetronomeMode = ctx.currentMetronomeMode
    ctx.currentMetronome = null
    ctx.currentMetronomeMode = null
    return true
  }
  if (lineLower.match(/^(\d+)x$/)) {
    closeRepeat(ctx)
    flushCurrentBlock(ctx)
    const match = lineLower.match(/(\d+)/)
    ctx.repeatCount = Number.parseInt(match?.[1] ?? '1', 10) || 1
    ctx.inRepeat = true
    ctx.repeatPhases = []
    ctx.repeatLabel = ctx.currentBlockType ?? null
    ctx.repeatExplicitClose = ctx.explicitCloseRepeats.has(ctx.currentLineIndex)
    ctx.repeatMetronome = ctx.currentMetronome
    ctx.repeatMetronomeMode = ctx.currentMetronomeMode
    ctx.currentMetronome = null
    ctx.currentMetronomeMode = null
    return true
  }
  if (lineLower === 'end' || lineLower === 'endrepeat') {
    closeRepeat(ctx)
    return true
  }
  return false
}

function parseTimeFromLine(lineLower: string): number {
  const colonMatch = lineLower.match(/^(\d+):(\d+)$/)
  if (colonMatch) {
    return (
      Number.parseInt(colonMatch[1] ?? '0', 10) * 60 + Number.parseInt(colonMatch[2] ?? '0', 10)
    )
  }
  if (lineLower.match(/(\d+)\s*(m|min)/)) {
    const numMatch = lineLower.match(/(\d+)/)
    return Number.parseInt(numMatch?.[1] ?? '0', 10) * 60
  }
  const numMatch = lineLower.match(/(\d+)/)
  return Number.parseInt(numMatch?.[1] ?? '0', 10)
}

function getPhaseTypeFromLine(lineLower: string, blockType: BlockType | null): PhaseType {
  if (lineLower.includes('rest')) return 'rest'
  if (lineLower.includes('work')) return 'work'
  if (blockType === 'warmup') return 'warmup'
  if (blockType === 'cooldown') return 'cooldown'
  return 'work'
}

function isTimeLineMatch(lineLower: string): boolean {
  const timeMatch =
    lineLower.match(/^(\d+):(\d+)$/) ||
    lineLower.match(/^(\d+)\s*(s|sec|seconds?)?$/) ||
    lineLower.match(/^(\d+)\s*(m|min|minutes?)$/)
  return !!timeMatch || !!lineLower.match(/^\d+\s*(s|m|sec|min)/)
}

function handleTimeLine(
  lineLower: string,
  ctx: ParserContext,
  millis: boolean | null = null
): boolean {
  if (!isTimeLineMatch(lineLower)) return false

  const duration = parseTimeFromLine(lineLower)
  const phaseType = getPhaseTypeFromLine(lineLower, ctx.currentBlockType)

  const phase: Phase = {
    type: phaseType,
    duration,
    millis: millis ?? undefined,
    metronome: getContextMetronome(ctx),
    metronomeMode: getContextMetronomeMode(ctx),
  }

  if (ctx.inRepeat) {
    ctx.repeatPhases.push(phase)
    return true
  }

  if (ctx.currentExercises.length > 0) phase.exercises = [...ctx.currentExercises]
  phase.customLabel = ctx.currentCustomLabel ?? undefined
  ctx.phases.push(phase)

  if (ctx.currentBlockType === 'warmup' || ctx.currentBlockType === 'cooldown') {
    ctx.blocks.push(
      createBlock(
        ctx.currentBlockType,
        [phase],
        ctx.currentCustomLabel ?? undefined,
        undefined,
        undefined,
        ctx.currentMetronome ?? undefined
      )
    )
    resetContextAfterBlock(ctx)
  }

  ctx.currentBlockType = null
  return true
}

function applyMetronome(ctx: ParserContext, bpm: number, mode: MetronomeMode | null): void {
  if (ctx.inRepeat) {
    ctx.repeatMetronome = bpm
    ctx.repeatMetronomeMode = mode
  } else {
    ctx.currentMetronome = bpm
    ctx.currentMetronomeMode = mode
  }
}

function extractLineConfigs(
  rawLine: string,
  ctx: ParserContext
): { line: string; lineLower: string; millis: boolean | null } {
  const { bpm, bpmMode, cleanedLine: afterMetronome } = extractMetronome(rawLine)
  if (bpm !== null) applyMetronome(ctx, bpm, bpmMode)

  const { millis, cleanedLine } = extractMillisConfig(afterMetronome)
  return { line: cleanedLine, lineLower: cleanedLine.toLowerCase(), millis }
}

function isRepeatStart(line: string): boolean {
  return !!line.match(/^(\d+)x$/) || !!line.match(/^(tabata|hiit|intervals?)\s*(\d+)x?$/i)
}

function isRepeatCloser(line: string): boolean {
  return line === 'end' || line === 'endrepeat' || !!line.match(/^-{3,}$/)
}

function isSectionBreak(line: string): boolean {
  return ['warmup', 'warm up', 'warm-up', 'cooldown', 'cool down', 'cool-down'].includes(line)
}

function findExplicitCloseRepeats(lines: string[]): Set<number> {
  const result = new Set<number>()
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i]?.trim().toLowerCase() ?? ''
    if (!isRepeatStart(lower)) continue

    for (let j = i + 1; j < lines.length; j++) {
      const check = lines[j]?.trim().toLowerCase() ?? ''
      if (isRepeatStart(check) || isSectionBreak(check)) break
      if (isRepeatCloser(check)) {
        result.add(i)
        break
      }
    }
  }
  return result
}

function handleSeparatorLine(rawLine: string, ctx: ParserContext): boolean {
  if (!rawLine.match(/^-{3,}$/)) return false
  closeRepeat(ctx)
  flushCurrentBlock(ctx)
  ctx.currentBlockType = null
  ctx.currentCustomLabel = null
  ctx.currentMetronome = null
  ctx.currentMetronomeMode = null
  ctx.currentExercises = []
  return true
}

function processLine(rawLine: string, ctx: ParserContext): void {
  if (handleCommentLine(rawLine, ctx)) return
  if (handleEmptyLine(rawLine, ctx)) return
  if (handleSeparatorLine(rawLine, ctx)) return

  const { line, lineLower, millis } = extractLineConfigs(rawLine, ctx)

  if (handleWaitLine(lineLower, ctx)) return
  if (handleExerciseLine(line, ctx)) return
  if (handleStopwatchLine(lineLower, ctx, millis)) return
  if (handleCountdownLine(lineLower, ctx, millis)) return
  if (handleEmomLabel(lineLower, ctx)) return
  if (handleForTimeLine(lineLower, ctx, millis)) return
  if (handleAmrapLine(lineLower, ctx, millis)) return
  if (handleTimeTypeLine(lineLower, ctx, millis)) return
  if (handleStandaloneRestLine(lineLower, ctx)) return
  if (handleBlockTypeKeyword(lineLower, ctx)) return
  if (handleRepeatLine(lineLower, ctx)) return
  handleTimeLine(lineLower, ctx, millis)
}

export function parseCustomWorkout(text: string): ParsedWorkout {
  const ctx = createContext()
  const lines = text
    .trim()
    .split('\n')
    .map((l) => l.trim())

  ctx.explicitCloseRepeats = findExplicitCloseRepeats(lines)

  for (let i = 0; i < lines.length; i++) {
    ctx.currentLineIndex = i
    processLine(lines[i] ?? '', ctx)
  }

  closeRepeat(ctx)
  flushCurrentBlock(ctx)

  if (ctx.phases.length === 0) {
    return { error: 'No valid phases found', phases: [], blocks: [] }
  }

  const expandedPhases = expandExercisePhases(ctx.phases)

  return { phases: expandedPhases, blocks: ctx.blocks }
}

export { customPresets, intervalPresets } from './presets'
