import { describe, it, expect } from 'vitest'
import { parseCustomWorkout } from '../../src/parser'

describe('parseCustomWorkout', () => {
  it('parses simple work phase', () => {
    const result = parseCustomWorkout('30s work')
    expect(result.phases).toHaveLength(1)
    expect(result.phases[0]).toEqual({ type: 'work', duration: 30 })
  })

  it('parses simple rest phase', () => {
    const result = parseCustomWorkout('10s rest')
    expect(result.phases).toHaveLength(1)
    expect(result.phases[0]).toEqual({ type: 'rest', duration: 10 })
  })

  it('parses warmup block', () => {
    const result = parseCustomWorkout(`
warmup
60s
`)
    expect(result.phases).toHaveLength(1)
    expect(result.phases[0]).toEqual({ type: 'warmup', duration: 60 })
  })

  it('parses cooldown block', () => {
    const result = parseCustomWorkout(`
cooldown
2min
`)
    expect(result.phases).toHaveLength(1)
    expect(result.phases[0]).toEqual({ type: 'cooldown', duration: 120 })
  })

  it('parses AMRAP format', () => {
    const result = parseCustomWorkout('amrap 12min')
    expect(result.phases).toHaveLength(1)
    expect(result.phases[0]).toEqual({ type: 'work', duration: 720 })
  })

  it('parses For Time format', () => {
    const result = parseCustomWorkout('fortime 10min')
    expect(result.phases).toHaveLength(1)
    expect(result.phases[0]).toEqual({ type: 'work', duration: 600 })
  })

  it('ignores comments', () => {
    const result = parseCustomWorkout(`
# This is a comment
30s work
`)
    expect(result.phases).toHaveLength(1)
    expect(result.phases[0]).toEqual({ type: 'work', duration: 30 })
  })

  it('returns error for empty input', () => {
    const result = parseCustomWorkout('')
    expect(result.error).toBe('No valid phases found')
    expect(result.phases).toHaveLength(0)
  })

  it('handles unclosed repeat blocks at end of file', () => {
    const result = parseCustomWorkout(`
3x
30s work
`)
    // Parser should automatically close repeat at end of input
    expect(result.phases).toHaveLength(3)
    expect(result.phases[0]).toEqual({ type: 'work', duration: 30 })
    expect(result.phases[1]).toEqual({ type: 'work', duration: 30 })
    expect(result.phases[2]).toEqual({ type: 'work', duration: 30 })
  })

  it('parses simple time values without explicit type', () => {
    const result = parseCustomWorkout('30s')
    expect(result.phases).toHaveLength(1)
    expect(result.phases[0]?.type).toBe('work') // Defaults to work
    expect(result.phases[0]?.duration).toBe(30)
  })

  it('parses minute format', () => {
    const result = parseCustomWorkout('2min work')
    expect(result.phases).toHaveLength(1)
    expect(result.phases[0]).toEqual({ type: 'work', duration: 120 })
  })

  it('parses standalone rest', () => {
    const result = parseCustomWorkout('1min rest')
    expect(result.phases).toHaveLength(1)
    expect(result.phases[0]).toEqual({ type: 'rest', duration: 60 })
  })

  it('parses multiple phases in sequence', () => {
    const result = parseCustomWorkout(`
warmup
30s

30s work
10s rest
30s work

cooldown
30s
`)
    expect(result.phases.length).toBeGreaterThanOrEqual(4)
    expect(result.phases[0]?.type).toBe('warmup')
  })
})
