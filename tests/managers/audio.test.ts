import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'

// Mock AudioContext
class MockOscillator {
  type: OscillatorType = 'sine'
  frequency = { value: 440 }
  connect = vi.fn()
  start = vi.fn()
  stop = vi.fn()
}

class MockGain {
  gain = {
    value: 1,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  }
  connect = vi.fn()
}

class MockAudioContext {
  state = 'running'
  currentTime = 0
  destination = {}
  resume = vi.fn()
  createOscillator = vi.fn(() => new MockOscillator())
  createGain = vi.fn(() => new MockGain())
}

// Setup global mocks before importing the module
beforeAll(() => {
  vi.stubGlobal('window', {
    AudioContext: MockAudioContext,
    webkitAudioContext: MockAudioContext,
  })
})

// Mock settings manager
vi.mock('../../src/managers/settings', () => ({
  settingsManager: {
    get: vi.fn(() => ({
      sounds: true,
      countdown3: true,
      voice: false,
      alertVolume: 80,
      metronomeVolume: 60,
      wakelock: true,
      millis: true,
      metronomeDefault: false,
      bpm: 120,
    })),
  },
}))

describe('AudioManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('has default volume settings', async () => {
    const { audioManager } = await import('../../src/managers/audio')
    expect(audioManager.alertVolume).toBe(0.8)
    expect(audioManager.metronomeVolume).toBe(0.6)
  })

  it('can update volume settings', async () => {
    const { audioManager } = await import('../../src/managers/audio')
    audioManager.alertVolume = 0.5
    audioManager.metronomeVolume = 0.3
    expect(audioManager.alertVolume).toBe(0.5)
    expect(audioManager.metronomeVolume).toBe(0.3)
  })
})
