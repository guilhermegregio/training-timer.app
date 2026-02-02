import type { PhaseType } from '@/types'
import { settingsManager } from './settings'

const PHASE_PHRASES: Record<PhaseType, string> = {
  work: 'Work!',
  rest: 'Rest',
  warmup: 'Warm up',
  cooldown: 'Cool down',
  prepare: 'Get ready',
  countdown: 'Countdown',
  stopwatch: 'Go',
}

class SpeechManagerClass {
  private synth = window.speechSynthesis

  speak(text: string): void {
    const settings = settingsManager.get()
    if (!settings.voice || !this.synth) return

    this.synth.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.rate = 1.1
    utter.pitch = 1
    this.synth.speak(utter)
  }

  announcePhase(phase: PhaseType): void {
    const phrase = PHASE_PHRASES[phase] || phase
    this.speak(phrase)
  }

  announceNumber(num: number): void {
    this.speak(String(num))
  }

  announceRound(current: number, _total?: number): void {
    this.speak(`Round ${current}`)
  }
}

export const speechManager = new SpeechManagerClass()
