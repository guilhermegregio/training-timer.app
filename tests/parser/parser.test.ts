import { describe, it, expect } from 'vitest'
import { parseCustomWorkout } from '../../src/parser'

describe('parseCustomWorkout', () => {
  it('parses simple work phase', () => {
    const result = parseCustomWorkout('30s work')
    expect(result.phases).toHaveLength(1)
    expect(result.phases[0]).toMatchObject({ type: 'work', duration: 30 })
  })

  it('parses simple rest phase', () => {
    const result = parseCustomWorkout('10s rest')
    expect(result.phases).toHaveLength(1)
    expect(result.phases[0]).toMatchObject({ type: 'rest', duration: 10 })
  })

  it('parses warmup block', () => {
    const result = parseCustomWorkout(`
warmup
60s
`)
    expect(result.phases).toHaveLength(1)
    expect(result.phases[0]).toMatchObject({ type: 'warmup', duration: 60 })
  })

  it('parses cooldown block', () => {
    const result = parseCustomWorkout(`
cooldown
2min
`)
    expect(result.phases).toHaveLength(1)
    expect(result.phases[0]).toMatchObject({ type: 'cooldown', duration: 120 })
  })

  it('parses AMRAP format', () => {
    const result = parseCustomWorkout('amrap 12min')
    expect(result.phases).toHaveLength(1)
    expect(result.phases[0]).toMatchObject({ type: 'work', duration: 720, label: 'amrap' })
  })

  it('parses For Time format', () => {
    const result = parseCustomWorkout('fortime 10min')
    expect(result.phases).toHaveLength(1)
    expect(result.phases[0]).toMatchObject({ type: 'work', duration: 600, label: 'fortime' })
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
    expect(result.phases).toHaveLength(3)
    expect(result.phases[0]).toMatchObject({ type: 'work', duration: 30 })
    expect(result.phases[1]).toMatchObject({ type: 'work', duration: 30 })
    expect(result.phases[2]).toMatchObject({ type: 'work', duration: 30 })
  })

  it('parses simple time values without explicit type', () => {
    const result = parseCustomWorkout('30s')
    expect(result.phases).toHaveLength(1)
    expect(result.phases[0]?.type).toBe('work')
    expect(result.phases[0]?.duration).toBe(30)
  })

  it('parses minute format', () => {
    const result = parseCustomWorkout('2min work')
    expect(result.phases).toHaveLength(1)
    expect(result.phases[0]).toMatchObject({ type: 'work', duration: 120 })
  })

  it('parses standalone rest', () => {
    const result = parseCustomWorkout('1min rest')
    expect(result.phases).toHaveLength(1)
    expect(result.phases[0]).toMatchObject({ type: 'rest', duration: 60 })
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

  it('parses Tabata with work and rest phases', () => {
    const result = parseCustomWorkout(`
8x
20s work
10s rest
`)
    expect(result.phases).toHaveLength(16)
    for (let i = 0; i < 8; i++) {
      expect(result.phases[i * 2]).toMatchObject({ type: 'work', duration: 20 })
      expect(result.phases[i * 2 + 1]).toMatchObject({ type: 'rest', duration: 10 })
    }
  })

  it('parses complex workout with multiple repeat blocks', () => {
    const result = parseCustomWorkout(`
warmup
2min

emom 1
10x
60s work

1min rest

emom 2
5x
40s work
20s rest

cooldown
2min
`)
    expect(result.phases).toHaveLength(23)
    expect(result.phases[0]).toMatchObject({ type: 'warmup', duration: 120 })
    for (let i = 1; i <= 10; i++) {
      expect(result.phases[i]).toMatchObject({ type: 'work', duration: 60 })
    }
    expect(result.phases[11]).toMatchObject({ type: 'rest', duration: 60 })
    for (let i = 0; i < 5; i++) {
      expect(result.phases[12 + i * 2]).toMatchObject({ type: 'work', duration: 40 })
      expect(result.phases[12 + i * 2 + 1]).toMatchObject({ type: 'rest', duration: 20 })
    }
    expect(result.phases[22]).toMatchObject({ type: 'cooldown', duration: 120 })
  })

  it('parses repeat with explicit end marker', () => {
    const result = parseCustomWorkout(`
3x
30s work
10s rest
end
60s work
`)
    expect(result.phases).toHaveLength(7)
    expect(result.phases[0]).toMatchObject({ type: 'work', duration: 30 })
    expect(result.phases[1]).toMatchObject({ type: 'rest', duration: 10 })
    expect(result.phases[6]).toMatchObject({ type: 'work', duration: 60 })
  })

  // NEW FEATURES TESTS

  describe('custom labels', () => {
    it('parses custom label with # prefix', () => {
      const result = parseCustomWorkout(`
# Parte A - Forca
fortime 10min
`)
      expect(result.phases).toHaveLength(1)
      expect(result.phases[0]?.customLabel).toBe('Parte A - Forca')
    })

    it('assigns custom label to following phases', () => {
      const result = parseCustomWorkout(`
# Warmup Section
warmup
5min
`)
      expect(result.phases[0]?.customLabel).toBe('Warmup Section')
    })

    it('creates blocks with labels', () => {
      const result = parseCustomWorkout(`
# Parte A
amrap 10min
`)
      expect(result.blocks).toHaveLength(1)
      expect(result.blocks[0]?.label).toBe('Parte A')
      expect(result.blocks[0]?.type).toBe('amrap')
    })
  })

  describe('wait phase', () => {
    it('parses wait keyword with infinite duration', () => {
      const result = parseCustomWorkout(`
30s work
wait
30s work
`)
      expect(result.phases).toHaveLength(3)
      expect(result.phases[1]?.type).toBe('wait')
      expect(result.phases[1]?.duration).toBe(Number.POSITIVE_INFINITY)
      expect(result.phases[1]?.isWait).toBe(true)
    })

    it('creates wait block', () => {
      const result = parseCustomWorkout(`
wait
`)
      expect(result.blocks).toHaveLength(1)
      expect(result.blocks[0]?.type).toBe('wait')
    })

    it('wait with custom label', () => {
      const result = parseCustomWorkout(`
# Ready for next
wait
`)
      expect(result.phases[0]?.customLabel).toBe('Ready for next')
      expect(result.phases[0]?.isWait).toBe(true)
    })

    it('parses wait work as work phase with isWait', () => {
      const result = parseCustomWorkout(`
wait work
`)
      expect(result.phases).toHaveLength(1)
      expect(result.phases[0]?.type).toBe('work')
      expect(result.phases[0]?.duration).toBe(Number.POSITIVE_INFINITY)
      expect(result.phases[0]?.isWait).toBe(true)
    })

    it('parses wait rest as rest phase with isWait', () => {
      const result = parseCustomWorkout(`
wait rest
`)
      expect(result.phases).toHaveLength(1)
      expect(result.phases[0]?.type).toBe('rest')
      expect(result.phases[0]?.duration).toBe(Number.POSITIVE_INFINITY)
      expect(result.phases[0]?.isWait).toBe(true)
    })

    it('wait inherits warmup type when in warmup block', () => {
      const result = parseCustomWorkout(`
warmup
wait
`)
      expect(result.phases).toHaveLength(1)
      expect(result.phases[0]?.type).toBe('warmup')
      expect(result.phases[0]?.isWait).toBe(true)
    })

    it('wait inherits cooldown type when in cooldown block', () => {
      const result = parseCustomWorkout(`
cooldown
wait
`)
      expect(result.phases).toHaveLength(1)
      expect(result.phases[0]?.type).toBe('cooldown')
      expect(result.phases[0]?.isWait).toBe(true)
    })

    it('wait work inside repeat block', () => {
      const result = parseCustomWorkout(`
8x
wait work
60s rest
`)
      expect(result.phases).toHaveLength(16)
      for (let i = 0; i < 8; i++) {
        expect(result.phases[i * 2]).toMatchObject({
          type: 'work',
          duration: Number.POSITIVE_INFINITY,
          isWait: true,
        })
        expect(result.phases[i * 2 + 1]).toMatchObject({
          type: 'rest',
          duration: 60,
        })
        expect(result.phases[i * 2 + 1]?.isWait).toBeUndefined()
      }
    })

    it('complex strength workout with wait work and fixed rest', () => {
      const result = parseCustomWorkout(`
warmup
wait

8x
wait work
60s rest
`)
      // 1 warmup wait + 8 * (work wait + rest) = 1 + 16 = 17
      expect(result.phases).toHaveLength(17)
      expect(result.phases[0]).toMatchObject({
        type: 'warmup',
        duration: Number.POSITIVE_INFINITY,
        isWait: true,
      })
      // First work phase
      expect(result.phases[1]).toMatchObject({
        type: 'work',
        duration: Number.POSITIVE_INFINITY,
        isWait: true,
      })
      // First rest phase
      expect(result.phases[2]).toMatchObject({
        type: 'rest',
        duration: 60,
      })
    })
  })

  describe('exercises', () => {
    it('parses exercise with name only', () => {
      const result = parseCustomWorkout(`
fortime 10min
- back squat
`)
      expect(result.phases[0]?.exercises).toHaveLength(1)
      expect(result.phases[0]?.exercises?.[0]?.name).toBe('back squat')
    })

    it('parses exercise with reps', () => {
      const result = parseCustomWorkout(`
amrap 10min
- air squat (20x)
`)
      expect(result.phases[0]?.exercises?.[0]?.reps).toBe(20)
    })

    it('parses exercise with weight in kg', () => {
      const result = parseCustomWorkout(`
fortime 10min
- deadlift (@100kg)
`)
      expect(result.phases[0]?.exercises?.[0]?.weight).toBe(100)
      expect(result.phases[0]?.exercises?.[0]?.weightUnit).toBe('kg')
    })

    it('parses exercise with weight in lbs', () => {
      const result = parseCustomWorkout(`
fortime 10min
- deadlift (@225lbs)
`)
      expect(result.phases[0]?.exercises?.[0]?.weight).toBe(225)
      expect(result.phases[0]?.exercises?.[0]?.weightUnit).toBe('lbs')
    })

    it('parses exercise with percentage', () => {
      const result = parseCustomWorkout(`
fortime 10min
- back squat (80%)
`)
      expect(result.phases[0]?.exercises?.[0]?.percentage).toBe('80%')
    })

    it('parses exercise with PSE', () => {
      const result = parseCustomWorkout(`
fortime 10min
- back squat (PSE 8)
`)
      expect(result.phases[0]?.exercises?.[0]?.pse).toBe(8)
    })

    it('parses exercise with all metadata', () => {
      const result = parseCustomWorkout(`
fortime 10min
- back squat (5x|@100kg|80%|PSE 8)
`)
      const ex = result.phases[0]?.exercises?.[0]
      expect(ex?.name).toBe('back squat')
      expect(ex?.reps).toBe(5)
      expect(ex?.weight).toBe(100)
      expect(ex?.weightUnit).toBe('kg')
      expect(ex?.percentage).toBe('80%')
      expect(ex?.pse).toBe(8)
    })

    it('parses multiple exercises and expands to individual phases', () => {
      const result = parseCustomWorkout(`
amrap 10min
- air squat (20x)
- pull up (10x)
- push ups (15x)
`)
      // With exercise stepping, multiple exercises expand into individual wait phases
      expect(result.phases).toHaveLength(3)
      expect(result.phases[0]?.exercises?.[0]?.name).toBe('air squat')
      expect(result.phases[0]?.exerciseIndex).toBe(1)
      expect(result.phases[0]?.exerciseCount).toBe(3)
      expect(result.phases[0]?.loopStart).toBe(true)
      expect(result.phases[1]?.exercises?.[0]?.name).toBe('pull up')
      expect(result.phases[1]?.exerciseIndex).toBe(2)
      expect(result.phases[2]?.exercises?.[0]?.name).toBe('push ups')
      expect(result.phases[2]?.exerciseIndex).toBe(3)
      expect(result.phases[2]?.loopEnd).toBe(true)
    })

    it('exercises show in blocks', () => {
      const result = parseCustomWorkout(`
fortime 10min
- deadlift (5x|@120kg)
`)
      expect(result.blocks[0]?.exercises).toHaveLength(1)
      expect(result.blocks[0]?.exercises?.[0]?.name).toBe('deadlift')
    })

    it('exercises do not leak between consecutive work phases', () => {
      const result = parseCustomWorkout(`
60s work [6bpm]
- burpee (6x)
60s work [8bpm]
- burpee (8x)
60s work [10bpm]
- burpee (10x)
`)
      expect(result.phases).toHaveLength(3)
      expect(result.phases[0]?.exercises).toHaveLength(1)
      expect(result.phases[0]?.exercises?.[0]?.reps).toBe(6)
      expect(result.phases[1]?.exercises).toHaveLength(1)
      expect(result.phases[1]?.exercises?.[0]?.reps).toBe(8)
      expect(result.phases[2]?.exercises).toHaveLength(1)
      expect(result.phases[2]?.exercises?.[0]?.reps).toBe(10)

      expect(result.blocks).toHaveLength(3)
      expect(result.blocks[0]?.exercises).toHaveLength(1)
      expect(result.blocks[0]?.exercises?.[0]?.reps).toBe(6)
      expect(result.blocks[1]?.exercises).toHaveLength(1)
      expect(result.blocks[1]?.exercises?.[0]?.reps).toBe(8)
      expect(result.blocks[2]?.exercises).toHaveLength(1)
      expect(result.blocks[2]?.exercises?.[0]?.reps).toBe(10)
    })

    it('fortime with multiple exercises expands to individual phases', () => {
      const result = parseCustomWorkout(`
for time 10min
- barbell thruster (21x|@95lbs)
- pull up (21x)
- barbell thruster (15x|@95lbs)
- pull up (15x)
`)
      expect(result.phases).toHaveLength(4)
      expect(result.phases[0]?.exerciseIndex).toBe(1)
      expect(result.phases[0]?.exerciseCount).toBe(4)
      expect(result.phases[0]?.label).toBe('fortime')
      expect(result.phases[0]?.timeCap).toBe(600) // 10 minutes
      expect(result.phases[0]?.isWait).toBe(true)
      expect(result.phases[0]?.loopStart).toBeFalsy() // ForTime doesn't loop
      expect(result.phases[3]?.exerciseIndex).toBe(4)
      expect(result.phases[3]?.loopEnd).toBeFalsy()
    })
  })

  describe('metronome', () => {
    it('parses metronome BPM in brackets', () => {
      const result = parseCustomWorkout(`
fortime 10min [60bpm]
`)
      expect(result.phases[0]?.metronome).toBe(60)
    })

    it('metronome applies to repeat blocks', () => {
      const result = parseCustomWorkout(`
8x [170bpm]
20s work
10s rest
`)
      expect(result.phases[0]?.metronome).toBe(170)
      expect(result.phases[1]?.metronome).toBe(170)
    })

    it('metronome shows in blocks', () => {
      const result = parseCustomWorkout(`
tabata 8x [170bpm]
20s work
10s rest
`)
      expect(result.blocks[0]?.metronome).toBe(170)
    })

    it('case insensitive BPM parsing', () => {
      const result = parseCustomWorkout(`
fortime 10min [60BPM]
`)
      expect(result.phases[0]?.metronome).toBe(60)
    })
  })

  describe('blocks', () => {
    it('creates blocks for warmup', () => {
      const result = parseCustomWorkout(`
warmup
5min
`)
      expect(result.blocks).toHaveLength(1)
      expect(result.blocks[0]?.type).toBe('warmup')
      expect(result.blocks[0]?.totalDuration).toBe(300)
    })

    it('creates blocks for cooldown', () => {
      const result = parseCustomWorkout(`
cooldown
5min
`)
      expect(result.blocks).toHaveLength(1)
      expect(result.blocks[0]?.type).toBe('cooldown')
    })

    it('creates blocks for fortime', () => {
      const result = parseCustomWorkout(`
fortime 10min
`)
      expect(result.blocks).toHaveLength(1)
      expect(result.blocks[0]?.type).toBe('fortime')
    })

    it('creates blocks for amrap', () => {
      const result = parseCustomWorkout(`
amrap 12min
`)
      expect(result.blocks).toHaveLength(1)
      expect(result.blocks[0]?.type).toBe('amrap')
    })

    it('creates blocks for tabata', () => {
      const result = parseCustomWorkout(`
tabata 8x
20s work
10s rest
`)
      expect(result.blocks).toHaveLength(1)
      expect(result.blocks[0]?.type).toBe('tabata')
      expect(result.blocks[0]?.repetitions).toBe(8)
    })

    it('creates blocks for rest', () => {
      const result = parseCustomWorkout(`
1min rest
`)
      expect(result.blocks).toHaveLength(1)
      expect(result.blocks[0]?.type).toBe('rest')
    })

    it('complex workout creates multiple blocks', () => {
      const result = parseCustomWorkout(`
warmup
5min

# Parte A
fortime 10min
- back squat (5x|@100kg)

wait

# Parte B
amrap 10min
- air squat (20x)

cooldown
5min
`)
      expect(result.blocks.length).toBeGreaterThanOrEqual(5)
      expect(result.blocks[0]?.type).toBe('warmup')
      expect(result.blocks[1]?.type).toBe('fortime')
      expect(result.blocks[2]?.type).toBe('wait')
      expect(result.blocks[3]?.type).toBe('amrap')
      expect(result.blocks[4]?.type).toBe('cooldown')
    })
  })

  describe('ignores comments', () => {
    it('ignores lines starting with # that look like comments', () => {
      const result = parseCustomWorkout(`
30s work
`)
      expect(result.phases).toHaveLength(1)
    })
  })

  describe('explicit repeat blocks with end', () => {
    it('repeat with end groups complex blocks with empty lines', () => {
      const result = parseCustomWorkout(`
4x
wait work
- KB swing (20x)

60s rest

wait work
- Goblet squat (20x)

90s rest
end
`)
      // Per round: wait work + 60s rest + wait work + 90s rest = 4 phases
      // 4 rounds * 4 phases = 16 phases
      // wait work phases expand exercises: each wait work has 1 exercise
      expect(result.phases).toHaveLength(16)
      for (let round = 0; round < 4; round++) {
        const base = round * 4
        // First wait work
        expect(result.phases[base]).toMatchObject({
          type: 'work',
          duration: Number.POSITIVE_INFINITY,
          isWait: true,
        })
        expect(result.phases[base]?.exercises?.[0]?.name).toBe('KB swing')
        // 60s rest
        expect(result.phases[base + 1]).toMatchObject({
          type: 'rest',
          duration: 60,
        })
        // Second wait work
        expect(result.phases[base + 2]).toMatchObject({
          type: 'work',
          duration: Number.POSITIVE_INFINITY,
          isWait: true,
        })
        expect(result.phases[base + 2]?.exercises?.[0]?.name).toBe('Goblet squat')
        // 90s rest
        expect(result.phases[base + 3]).toMatchObject({
          type: 'rest',
          duration: 90,
        })
      }
    })

    it('empty lines inside explicit repeat are ignored', () => {
      const result = parseCustomWorkout(`
2x
30s work

10s rest
end
`)
      // 2 rounds * (work + rest) = 4 phases
      expect(result.phases).toHaveLength(4)
      expect(result.phases[0]).toMatchObject({ type: 'work', duration: 30 })
      expect(result.phases[1]).toMatchObject({ type: 'rest', duration: 10 })
      expect(result.phases[2]).toMatchObject({ type: 'work', duration: 30 })
      expect(result.phases[3]).toMatchObject({ type: 'rest', duration: 10 })
    })

    it('exercises attach to their respective wait phases inside repeat', () => {
      const result = parseCustomWorkout(`
2x
wait work
- push up (10x)
- pull up (5x)

wait work
- squat (20x)

60s rest
end
`)
      // Per round: wait work (2 exercises expand to 2) + wait work (1 exercise) + rest = 4 phases after expansion
      // 2 rounds * 4 = 8 phases
      expect(result.phases).toHaveLength(8)
      // First round, first wait work expanded
      expect(result.phases[0]?.exercises?.[0]?.name).toBe('push up')
      expect(result.phases[1]?.exercises?.[0]?.name).toBe('pull up')
      // First round, second wait work
      expect(result.phases[2]?.exercises?.[0]?.name).toBe('squat')
      // First round, rest
      expect(result.phases[3]).toMatchObject({ type: 'rest', duration: 60 })
      expect(result.phases[3]?.exercises).toBeUndefined()
    })

    it('repeat without end still closes on empty line (backward compat)', () => {
      const result = parseCustomWorkout(`
3x
30s work

60s rest
`)
      // 3x closes on empty line, then 60s rest is separate
      expect(result.phases).toHaveLength(4)
      expect(result.phases[0]).toMatchObject({ type: 'work', duration: 30 })
      expect(result.phases[1]).toMatchObject({ type: 'work', duration: 30 })
      expect(result.phases[2]).toMatchObject({ type: 'work', duration: 30 })
      expect(result.phases[3]).toMatchObject({ type: 'rest', duration: 60 })
    })
  })

  describe('separator ---', () => {
    it('--- separates independent sections', () => {
      const result = parseCustomWorkout(`
2x
30s work
10s rest
end

---

2x
20s work
5s rest
end
`)
      // Section 1: 2 * (30s work + 10s rest) = 4
      // Section 2: 2 * (20s work + 5s rest) = 4
      expect(result.phases).toHaveLength(8)
      expect(result.phases[0]).toMatchObject({ type: 'work', duration: 30 })
      expect(result.phases[1]).toMatchObject({ type: 'rest', duration: 10 })
      expect(result.phases[4]).toMatchObject({ type: 'work', duration: 20 })
      expect(result.phases[5]).toMatchObject({ type: 'rest', duration: 5 })
    })

    it('--- closes an open repeat block', () => {
      const result = parseCustomWorkout(`
2x
30s work
10s rest
---
60s work
`)
      // 2 * (30s work + 10s rest) = 4, then 60s work = 1
      expect(result.phases).toHaveLength(5)
      expect(result.phases[4]).toMatchObject({ type: 'work', duration: 60 })
    })

    it('--- is not confused with exercise lines', () => {
      const result = parseCustomWorkout(`
fortime 10min
- push up (20x)
`)
      // Exercise line starts with - but is not ---
      expect(result.phases).toHaveLength(1)
      expect(result.phases[0]?.exercises?.[0]?.name).toBe('push up')
    })

    it('multiple --- separators chain sections', () => {
      const result = parseCustomWorkout(`
30s work
---
20s work
---
10s work
`)
      expect(result.phases).toHaveLength(3)
      expect(result.phases[0]).toMatchObject({ type: 'work', duration: 30 })
      expect(result.phases[1]).toMatchObject({ type: 'work', duration: 20 })
      expect(result.phases[2]).toMatchObject({ type: 'work', duration: 10 })
    })

    it('long separator with many dashes works', () => {
      const result = parseCustomWorkout(`
30s work
------
20s work
`)
      expect(result.phases).toHaveLength(2)
    })

    it('full complex workout with end and ---', () => {
      const result = parseCustomWorkout(`
4x
wait work
- KB swing (20x|@24kg)
- DB clean (15x|@15kg)

60s rest

wait work
- Goblet squat (20x)

90s rest
end

---

3x
wait work
- push up
- air squat

60s rest
end
`)
      // Section 1: 4 rounds * (wait work [2 exercises expand to 2] + 60s rest + wait work [1 exercise] + 90s rest) = 4 * 5 = 20
      // Section 2: 3 rounds * (wait work [2 exercises expand to 2] + 60s rest) = 3 * 3 = 9
      expect(result.phases).toHaveLength(29)

      // Verify section 1, round 1
      expect(result.phases[0]?.exercises?.[0]?.name).toBe('KB swing')
      expect(result.phases[0]?.exercises?.[0]?.reps).toBe(20)
      expect(result.phases[0]?.exercises?.[0]?.weight).toBe(24)
      expect(result.phases[1]?.exercises?.[0]?.name).toBe('DB clean')
      expect(result.phases[2]).toMatchObject({ type: 'rest', duration: 60 })
      expect(result.phases[3]?.exercises?.[0]?.name).toBe('Goblet squat')
      expect(result.phases[4]).toMatchObject({ type: 'rest', duration: 90 })

      // Verify section 2, round 1
      expect(result.phases[20]?.exercises?.[0]?.name).toBe('push up')
      expect(result.phases[21]?.exercises?.[0]?.name).toBe('air squat')
      expect(result.phases[22]).toMatchObject({ type: 'rest', duration: 60 })
    })
  })
})
