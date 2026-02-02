import { settingsManager } from './settings'

class AudioManagerClass {
  private ctx: AudioContext | null = null
  public alertVolume = 0.8
  public metronomeVolume = 0.6

  init(): void {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
  }

  resume(): void {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume()
    }
  }

  getContext(): AudioContext | null {
    return this.ctx
  }

  playTone(freq: number, duration: number, type: OscillatorType = 'sine', useMetronomeVolume = false): void {
    const settings = settingsManager.get()
    if (!settings.sounds && !useMetronomeVolume) return
    if (!this.ctx) return

    this.resume()
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = type
    osc.frequency.value = freq

    const vol = useMetronomeVolume ? this.metronomeVolume : this.alertVolume
    gain.gain.value = vol * 0.3
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration)

    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start()
    osc.stop(this.ctx.currentTime + duration)
  }

  playCountdown(num: number): void {
    const settings = settingsManager.get()
    if (!settings.countdown3) return
    this.playTone(num === 0 ? 880 : 660, 0.15, 'square')
  }

  playWorkStart(): void {
    this.playTone(880, 0.1)
    setTimeout(() => this.playTone(1100, 0.2), 100)
  }

  playRestStart(): void {
    this.playTone(440, 0.3)
  }

  playRoundComplete(): void {
    this.playTone(660, 0.1)
    setTimeout(() => this.playTone(880, 0.1), 100)
    setTimeout(() => this.playTone(1100, 0.15), 200)
  }

  playWorkoutFinish(): void {
    [0, 100, 200, 300, 400].forEach((delay, i) => {
      setTimeout(() => this.playTone(440 + i * 110, 0.2), delay)
    })
  }

  playMetronomeClick(): void {
    if (!this.ctx) return

    this.resume()
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'square'
    osc.frequency.value = 1000

    const vol = this.metronomeVolume * 0.6
    gain.gain.setValueAtTime(vol, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05)

    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start()
    osc.stop(this.ctx.currentTime + 0.05)
  }

  scheduleMetronomeClick(time: number): void {
    if (!this.ctx) return

    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'square'
    osc.frequency.value = 1000

    const vol = this.metronomeVolume * 0.6
    gain.gain.setValueAtTime(vol, time)
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05)

    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start(time)
    osc.stop(time + 0.05)
  }

  playAlert(): void {
    this.playTone(800, 0.5, 'sawtooth')
  }
}

export const audioManager = new AudioManagerClass()
