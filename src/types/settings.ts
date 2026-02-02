export interface AudioSettings {
  voice: boolean
  sounds: boolean
  countdown3: boolean
  alertVolume: number
  metronomeVolume: number
}

export interface MetronomeSettings {
  enabled: boolean
  bpm: number
  duringWork: boolean
  duringRest: boolean
  always: boolean
}

export interface DisplaySettings {
  wakelock: boolean
  millis: boolean
}

export interface MetronomeDefaults {
  metronomeDefault: boolean
  bpm: number
}

export interface Settings extends AudioSettings, DisplaySettings, MetronomeDefaults {}

export const DEFAULT_SETTINGS: Settings = {
  voice: false,
  sounds: true,
  countdown3: true,
  alertVolume: 80,
  metronomeVolume: 60,
  metronomeDefault: false,
  bpm: 120,
  wakelock: true,
  millis: true,
}

export const DEFAULT_METRONOME_SETTINGS: MetronomeSettings = {
  enabled: false,
  bpm: 120,
  duringWork: true,
  duringRest: false,
  always: false,
}
