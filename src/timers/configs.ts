import type { TimerConfig, MetronomeSettings } from '@/types'
import type { TimerDefinition } from './types'
import { formatTime, getInputNumber, $id } from '@/utils'
import { settingsManager } from '@/managers'
import { parseCustomWorkout, customPresets } from '@/parser'

let currentMetroSettings: MetronomeSettings = {
  enabled: false,
  bpm: 120,
  duringWork: true,
  duringRest: false,
  always: false,
}

export function initMetroSettings(): void {
  const settings = settingsManager.get()
  currentMetroSettings = {
    enabled: settings.metronomeDefault,
    bpm: settings.bpm,
    duringWork: true,
    duringRest: false,
    always: false,
  }
}

export function getMetroSettingsFromUI(): MetronomeSettings {
  const enabledEl = $id('metro-enabled')
  const bpmInputEl = $id('metro-bpm-input') as HTMLInputElement | null
  const workEl = $id('metro-work') as HTMLInputElement | null
  const restEl = $id('metro-rest') as HTMLInputElement | null
  const alwaysEl = $id('metro-always') as HTMLInputElement | null

  if (enabledEl && bpmInputEl) {
    return {
      enabled: enabledEl.classList.contains('active'),
      bpm: Number.parseInt(bpmInputEl.value, 10) || 120,
      duringWork: workEl?.checked ?? true,
      duringRest: restEl?.checked ?? false,
      always: alwaysEl?.checked ?? false,
    }
  }
  return currentMetroSettings
}

export function renderMetronomeSection(): string {
  const settings = settingsManager.get()
  const enabled = settings.metronomeDefault
  const bpm = settings.bpm

  return `
    <div class="metronome-section">
      <h4>&#9835; Metronome / BPM</h4>
      <div class="setting-row" style="border: none; padding: 8px 0;">
        <div class="setting-label">Enable Metronome</div>
        <div class="toggle ${enabled ? 'active' : ''}" id="metro-enabled" onclick="window.timerApp.toggleMetroEnabled()"></div>
      </div>
      <div id="metro-settings" style="display: ${enabled ? 'block' : 'none'};">
        <div class="bpm-control">
          <div class="bpm-input-row">
            <input type="number" class="bpm-input" id="metro-bpm-input" value="${bpm}" min="5" max="200" onchange="window.timerApp.setBpm(this.value)" oninput="window.timerApp.updateBpmSlider(this.value)">
            <span class="bpm-label">BPM</span>
          </div>
          <input type="range" class="bpm-slider" id="metro-bpm-slider" min="5" max="200" value="${bpm}" oninput="window.timerApp.setBpm(this.value)">
        </div>
        <div class="bpm-presets">
          <button class="bpm-preset" onclick="window.timerApp.setBpm(30)">30</button>
          <button class="bpm-preset" onclick="window.timerApp.setBpm(60)">60</button>
          <button class="bpm-preset" onclick="window.timerApp.setBpm(120)">120</button>
          <button class="bpm-preset" onclick="window.timerApp.setBpm(150)">150</button>
          <button class="bpm-preset" onclick="window.timerApp.setBpm(170)">170</button>
          <button class="bpm-preset" onclick="window.timerApp.setBpm(180)">180</button>
        </div>
        <div class="play-during">
          <label><input type="checkbox" id="metro-work" checked><span class="emoji">&#128293;</span> Work</label>
          <label><input type="checkbox" id="metro-rest"><span class="emoji">&#128524;</span> Rest</label>
          <label><input type="checkbox" id="metro-always"><span class="emoji">&#127775;</span> Always</label>
        </div>
      </div>
    </div>
  `
}

export function toggleMetroEnabled(): void {
  currentMetroSettings.enabled = !currentMetroSettings.enabled
  const el = $id('metro-enabled')
  if (el) {
    el.classList.toggle('active', currentMetroSettings.enabled)
  }
  const settingsEl = $id('metro-settings')
  if (settingsEl) {
    settingsEl.style.display = currentMetroSettings.enabled ? 'block' : 'none'
  }
}

export function setBpm(value: number | string): void {
  const numValue = Math.max(5, Math.min(200, Number.parseInt(String(value), 10) || 120))
  currentMetroSettings.bpm = numValue
  const inputEl = $id('metro-bpm-input') as HTMLInputElement | null
  const sliderEl = $id('metro-bpm-slider') as HTMLInputElement | null
  if (inputEl) inputEl.value = String(numValue)
  if (sliderEl) sliderEl.value = String(numValue)

  document.querySelectorAll('.bpm-preset').forEach((btn) => {
    const btnEl = btn as HTMLElement
    btnEl.classList.toggle('active', Number.parseInt(btnEl.textContent ?? '', 10) === numValue)
  })
}

export function updateBpmSlider(value: string): void {
  const sliderEl = $id('metro-bpm-slider') as HTMLInputElement | null
  if (sliderEl) sliderEl.value = value
  currentMetroSettings.bpm = Math.max(5, Math.min(200, Number.parseInt(value, 10) || 120))
}

export const timerConfigs: Record<string, TimerDefinition> = {
  stopwatch: {
    title: 'Stopwatch',
    render: () => `
      <div class="form-group">
        <p style="color: var(--text-secondary); text-align: center; padding: 20px 0;">
          Simple stopwatch with lap functionality.<br>
          Press Start to begin counting.
        </p>
      </div>
      ${renderMetronomeSection()}
    `,
    getConfig: () => ({ type: 'stopwatch', metronome: getMetroSettingsFromUI() }),
    validate: () => true,
  },

  countdown: {
    title: 'Countdown Timer',
    render: () => `
      <div class="form-row">
        <div class="form-group">
          <label>Minutes</label>
          <input type="number" id="cd-minutes" value="5" min="0" max="60">
        </div>
        <div class="form-group">
          <label>Seconds</label>
          <input type="number" id="cd-seconds" value="0" min="0" max="59">
        </div>
      </div>
      ${renderMetronomeSection()}
    `,
    getConfig: () => ({
      type: 'countdown',
      duration: getInputNumber('cd-minutes', 0) * 60 + getInputNumber('cd-seconds', 0),
      metronome: getMetroSettingsFromUI(),
    }),
    validate: function() {
      const cfg = this.getConfig() as { duration: number }
      return cfg.duration > 0
    },
  },

  intervals: {
    title: 'Interval Timer',
    render: () => `
      <div class="presets">
        <button class="preset-btn" onclick="window.timerApp.applyPreset('tabata')">Tabata 20/10</button>
        <button class="preset-btn" onclick="window.timerApp.applyPreset('3030')">30/30</button>
        <button class="preset-btn" onclick="window.timerApp.applyPreset('4020')">40/20</button>
        <button class="preset-btn" onclick="window.timerApp.applyPreset('4515')">45/15</button>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Work (sec)</label>
          <input type="number" id="int-work" value="20" min="1" max="600">
        </div>
        <div class="form-group">
          <label>Rest (sec)</label>
          <input type="number" id="int-rest" value="10" min="0" max="600">
        </div>
      </div>
      <div class="form-group">
        <label>Rounds</label>
        <input type="number" id="int-rounds" value="8" min="1" max="100">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Warm Up (sec)</label>
          <input type="number" id="int-warmup" value="0" min="0" max="300">
        </div>
        <div class="form-group">
          <label>Cool Down (sec)</label>
          <input type="number" id="int-cooldown" value="0" min="0" max="300">
        </div>
      </div>
      ${renderMetronomeSection()}
      <div id="intervals-preview" class="preview-section"></div>
    `,
    getConfig: () => ({
      type: 'intervals',
      work: getInputNumber('int-work', 20),
      rest: getInputNumber('int-rest', 10),
      rounds: getInputNumber('int-rounds', 8),
      warmup: getInputNumber('int-warmup', 0),
      cooldown: getInputNumber('int-cooldown', 0),
      metronome: getMetroSettingsFromUI(),
    }),
    validate: function() {
      const cfg = this.getConfig() as { work: number; rounds: number }
      return cfg.work > 0 && cfg.rounds > 0
    },
    onUpdate: function() {
      const cfg = this.getConfig() as {
        warmup: number
        work: number
        rest: number
        rounds: number
        cooldown: number
      }
      const total = cfg.warmup + (cfg.work + cfg.rest) * cfg.rounds + cfg.cooldown
      const workTotal = cfg.work * cfg.rounds
      const previewEl = $id('intervals-preview')
      if (previewEl) {
        previewEl.innerHTML = `
          <h4>Preview</h4>
          <div class="preview-stats">
            <div class="preview-stat">
              <div class="preview-stat-value">${formatTime(total)}</div>
              <div class="preview-stat-label">Total</div>
            </div>
            <div class="preview-stat">
              <div class="preview-stat-value">${formatTime(workTotal)}</div>
              <div class="preview-stat-label">Work</div>
            </div>
            <div class="preview-stat">
              <div class="preview-stat-value">${cfg.rounds}</div>
              <div class="preview-stat-label">Rounds</div>
            </div>
          </div>
        `
      }
    },
  },

  emom: {
    title: 'EMOM',
    render: () => `
      <div class="form-group">
        <label>Minutes (Rounds)</label>
        <input type="number" id="emom-rounds" value="10" min="1" max="60">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Warm Up (sec)</label>
          <input type="number" id="emom-warmup" value="0" min="0" max="300">
        </div>
        <div class="form-group">
          <label>Cool Down (sec)</label>
          <input type="number" id="emom-cooldown" value="0" min="0" max="300">
        </div>
      </div>
      ${renderMetronomeSection()}
    `,
    getConfig: () => ({
      type: 'emom',
      rounds: getInputNumber('emom-rounds', 10),
      warmup: getInputNumber('emom-warmup', 0),
      cooldown: getInputNumber('emom-cooldown', 0),
      metronome: getMetroSettingsFromUI(),
    }),
    validate: function() {
      const cfg = this.getConfig() as { rounds: number }
      return cfg.rounds > 0
    },
  },

  amrap: {
    title: 'AMRAP',
    render: () => `
      <div class="form-group">
        <label>Time Cap (minutes)</label>
        <input type="number" id="amrap-time" value="10" min="1" max="60">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Warm Up (sec)</label>
          <input type="number" id="amrap-warmup" value="0" min="0" max="300">
        </div>
        <div class="form-group">
          <label>Cool Down (sec)</label>
          <input type="number" id="amrap-cooldown" value="0" min="0" max="300">
        </div>
      </div>
      ${renderMetronomeSection()}
    `,
    getConfig: () => ({
      type: 'amrap',
      timeCap: getInputNumber('amrap-time', 10) * 60 || 600,
      warmup: getInputNumber('amrap-warmup', 0),
      cooldown: getInputNumber('amrap-cooldown', 0),
      metronome: getMetroSettingsFromUI(),
    }),
    validate: function() {
      const cfg = this.getConfig() as { timeCap: number }
      return cfg.timeCap > 0
    },
  },

  fortime: {
    title: 'For Time',
    render: () => `
      <div class="form-group">
        <label>Time Cap (minutes, 0 = none)</label>
        <input type="number" id="ft-time" value="0" min="0" max="60">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Warm Up (sec)</label>
          <input type="number" id="ft-warmup" value="0" min="0" max="300">
        </div>
        <div class="form-group">
          <label>Cool Down (sec)</label>
          <input type="number" id="ft-cooldown" value="0" min="0" max="300">
        </div>
      </div>
      ${renderMetronomeSection()}
    `,
    getConfig: () => ({
      type: 'fortime',
      timeCap: getInputNumber('ft-time', 0) * 60 || 0,
      warmup: getInputNumber('ft-warmup', 0),
      cooldown: getInputNumber('ft-cooldown', 0),
      metronome: getMetroSettingsFromUI(),
    }),
    validate: () => true,
  },

  custom: {
    title: 'Custom Workout',
    render: () => `
      <div class="form-group">
        <label>Templates</label>
        <div class="presets">
          <button class="preset-btn" onclick="window.timerApp.applyCustomPreset('tabata')">Tabata</button>
          <button class="preset-btn" onclick="window.timerApp.applyCustomPreset('emom')">EMOM</button>
          <button class="preset-btn" onclick="window.timerApp.applyCustomPreset('fortime')">For Time</button>
          <button class="preset-btn" onclick="window.timerApp.applyCustomPreset('amrap')">AMRAP</button>
          <button class="preset-btn" onclick="window.timerApp.applyCustomPreset('complex')">Complex</button>
        </div>
      </div>
      <div class="form-group">
        <label>Workout Definition</label>
        <textarea id="custom-text" class="text-editor" placeholder="Example:
warmup
30s

tabata 8x
20s work
10s rest

cooldown
30s"></textarea>
      </div>
      ${renderMetronomeSection()}
      <div id="custom-preview" class="preview-section"></div>
      <div id="custom-error" style="color: var(--accent-red); margin-top: 12px;"></div>
    `,
    getConfig: () => {
      const textEl = $id('custom-text') as HTMLTextAreaElement | null
      const text = textEl?.value ?? ''
      return { type: 'custom', text, parsed: parseCustomWorkout(text), metronome: getMetroSettingsFromUI() }
    },
    validate: function() {
      const cfg = this.getConfig() as TimerConfig & { parsed: { phases: unknown[] } }
      return cfg.parsed?.phases?.length > 0
    },
    onUpdate: () => {
      const textEl = $id('custom-text') as HTMLTextAreaElement | null
      const text = textEl?.value ?? ''
      const result = parseCustomWorkout(text)
      const previewEl = $id('custom-preview')
      const errorEl = $id('custom-error')

      if (result.error) {
        if (errorEl) errorEl.textContent = result.error
        if (previewEl) previewEl.innerHTML = ''
      } else if (result.phases?.length > 0) {
        if (errorEl) errorEl.textContent = ''
        const total = result.phases.reduce((sum, p) => sum + p.duration, 0)
        const workTime = result.phases
          .filter((p) => p.type === 'work')
          .reduce((sum, p) => sum + p.duration, 0)
        const rounds = result.phases.filter((p) => p.type === 'work').length
        if (previewEl) {
          previewEl.innerHTML = `
            <h4>Preview</h4>
            <div class="preview-stats">
              <div class="preview-stat">
                <div class="preview-stat-value">${formatTime(total)}</div>
                <div class="preview-stat-label">Total</div>
              </div>
              <div class="preview-stat">
                <div class="preview-stat-value">${formatTime(workTime)}</div>
                <div class="preview-stat-label">Work</div>
              </div>
              <div class="preview-stat">
                <div class="preview-stat-value">${rounds}</div>
                <div class="preview-stat-label">Work Phases</div>
              </div>
            </div>
          `
        }
      } else {
        if (errorEl) errorEl.textContent = ''
        if (previewEl) previewEl.innerHTML = ''
      }
    },
  },
}

export function applyCustomPreset(name: string): void {
  const preset = customPresets[name]
  if (preset) {
    const textarea = $id('custom-text') as HTMLTextAreaElement | null
    if (textarea) {
      textarea.value = preset
      timerConfigs.custom?.onUpdate?.()
    }
  }
}
