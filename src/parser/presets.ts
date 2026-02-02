export const customPresets: Record<string, string> = {
  tabata: `# Tabata (4 min)
8x
20s work
10s rest`,

  emom: `# EMOM - 10 rounds
emom
10x
60s work`,

  fortime: `# For Time (cap 10min)
fortime 10min`,

  amrap: `# AMRAP 12 min
amrap 12min`,

  complex: `# Complex Workout
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
2min`,
}

export const intervalPresets: Record<string, { work: number; rest: number; rounds: number }> = {
  tabata: { work: 20, rest: 10, rounds: 8 },
  '3030': { work: 30, rest: 30, rounds: 10 },
  '4020': { work: 40, rest: 20, rounds: 10 },
  '4515': { work: 45, rest: 15, rounds: 10 },
}
