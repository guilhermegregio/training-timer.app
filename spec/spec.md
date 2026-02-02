# Workout Timer PWA v2 - Especificação Completa

## Visão Geral

Aplicativo PWA de timer para treinos com suporte a múltiplos tipos de timer, configuração via texto (inspirado no intervals.icu), e biblioteca de workouts salvos. Funciona 100% offline.

---

## Stack Técnica

- **Frontend:** HTML5, CSS3, JavaScript Vanilla (sem frameworks)
- **PWA:** Service Worker para funcionamento offline, Web App Manifest
- **Audio:** Web Audio API para geração de sons programáticos
- **Speech:** Web Speech Synthesis API para anúncios de voz
- **Wake Lock:** Screen Wake Lock API para manter tela ativa durante treinos
- **Storage:** LocalStorage para histórico, configurações e workouts salvos

---

## Estrutura de Arquivos

```
workout-timer/
├── index.html          # App principal (single file com CSS e JS inline)
├── sw.js               # Service Worker para cache offline
├── manifest.json       # Web App Manifest para instalação PWA
└── icons/              # Ícones PNG (72, 96, 128, 144, 152, 192, 384, 512)
```

---

# FEATURES EXISTENTES (v1)

## 1. Sistema de Áudio

### 1.1 AudioManager Class
- Gerencia Web Audio API
- Cria AudioContext no primeiro user gesture
- Reativa se suspended

### 1.2 Sons Disponíveis
| Método | Frequência | Duração | Waveform | Uso |
|--------|------------|---------|----------|-----|
| `playCountdown()` | 600Hz | 100ms | Sine | Countdown 3,2,1 |
| `playWorkStart()` | 880Hz + 1100Hz | 150ms + 200ms | Square | Início do work |
| `playRestStart()` | 440Hz | 400ms | Sine | Início do rest |
| `playRoundComplete()` | 660→880→1100Hz | 100ms cada | Triangle | Round completo |
| `playWorkoutFinish()` | 523→659→784→1047Hz | 150-300ms | Square | Workout finalizado |
| `playMetronomeClick()` | 1800→900Hz sweep | 50ms | Sine | Click do metrônomo |

### 1.3 Volumes Separados
- `alertsVolume`: 0-100% (default 80%)
- `metronomeVolume`: 0-100% (default 60%)

### 1.4 Toggles de Áudio
- Voice Announcements (Speech Synthesis)
- Sound Effects (beeps)
- Countdown Last 3 Seconds

---

## 2. Speech Manager

### 2.1 Anúncios de Voz
- "Warm up" - início warm up
- "Work!" - início de cada work
- "Rest" - início de cada rest
- "Round [N]" - início de cada round
- "Cool down" - início cool down
- "3", "2", "1" - countdown final
- "Workout complete! Great job!" - finalização

---

## 3. Wake Lock Manager

### 3.1 Comportamento
- Ativa automaticamente quando timer inicia
- Desativa quando timer para/termina
- Reativa no visibilitychange (quando app volta ao foco)

### 3.2 Indicador Visual
- 🔒 "Screen stays awake when running" (inativo)
- 🔓 "Screen staying awake" (ativo, cor verde)

---

## 4. History Manager

### 4.1 Dados Salvos por Treino
```javascript
{
  type: "HIIT" | "HIIT (Partial)" | "Countdown" | "EMOM" | "AMRAP" | "For Time",
  date: ISO 8601 string,
  duration: number (segundos totais),
  workTime: number (segundos em work),
  rounds: number (rounds completados),
  config: { ... configurações específicas do tipo }
}
```

### 4.2 Persistência
- LocalStorage key: `workoutHistory`
- Máximo 50 itens
- Treinos parciais também são salvos

---

## 5. HIIT Timer (Atual)

### 5.1 Configurações
- Work Interval: 1-600s (step 5)
- Rest Interval: 0-600s (step 5)
- Warm Up: 0-300s (step 5)
- Cool Down: 0-300s (step 5)
- Rounds: 1-100 (step 1)

### 5.2 Fluxo de Fases
```
[Warm Up] → [Work] → [Rest] → [Work] → [Rest] → ... → [Cool Down] → [Complete]
            └─────────── Repete N rounds ───────────┘
```

### 5.3 Estado do HIIT
```javascript
{
  running: boolean,
  paused: boolean,
  phase: 'idle' | 'warmup' | 'work' | 'rest' | 'cooldown' | 'finished',
  currentRound: number,
  remainingSeconds: number,
  totalWorkTime: number,
  totalElapsed: number,
  intervalId: number | null,
  metronomeIntervalId: number | null,
  phaseDuration: number
}
```

### 5.4 Controles Durante Treino
- ⏹️ Stop - Para e volta para config (com confirmação)
- ⏸️/▶️ Pause/Resume
- ⏭️ Skip - Pula para próxima fase
- "← Back to Config" - Volta (com confirmação)

### 5.5 Tela de Complete
- "← Back to Config"
- "🔄 Restart"

---

## 6. Metrônomo

### 6.1 Configurações
- Enable/Disable toggle
- BPM: 50-240 (step 5)
- Presets: 12, 20 ,30, 60, 120, 160, 170, 180 BPM

### 6.2 Quando Tocar (checkboxes)
- 🔥 Work - apenas durante work
- 😌 Rest - apenas durante rest
- 🔁 Always - todas as fases

### 6.3 Indicador Visual
- Dot que pisca em cyan a cada beat
- Display do BPM atual

---

## 7. Stopwatch

### 7.1 Display
- Formato: MM:SS.cc (centésimos)
- Atualização: 10ms

### 7.2 Estado
```javascript
{
  running: boolean,
  startTime: number,
  elapsed: number,
  laps: number[],
  intervalId: number | null
}
```

### 7.3 Controles
- 📍 Lap - marca volta
- ▶️/⏸️ Start/Pause
- 🔄 Reset

---

## 8. PWA Features

### 8.1 Service Worker
- Cache-first strategy
- Funciona 100% offline

### 8.2 Manifest
- display: standalone
- orientation: portrait
- theme_color: #8b5cf6
- background_color: #0f172a

---

## 9. Design System

### 9.1 Cores
```css
--bg-primary: #0f172a
--bg-secondary: #1e293b
--bg-tertiary: #334155
--bg-card: #1a2332
--accent: #8b5cf6
--accent-light: #a78bfa
--accent-dark: #7c3aed
--success: #22c55e
--danger: #ef4444
--warning: #f59e0b
--cyan: #06b6d4
--text-primary: #f8fafc
--text-secondary: #94a3b8
--text-muted: #64748b
--border: #2d3a4f
```

### 9.2 Tipografia
- Display: Orbitron (Google Fonts)
- Body: Space Grotesk (Google Fonts)

### 9.3 Componentes
- Cards: border-radius 20px
- Botões config: 48x48px, border-radius 12px
- Inputs: border-radius 12px
- Toggle switches: estilo iOS
- Volume sliders: customizados

---

# NOVAS FEATURES (v2)

## 10. Nova Estrutura de Navegação

### 10.1 Tabs Principais (3 tabs)
```
[⏱️ Timers] [📚 Library] [⚙️ Settings]
```

### 10.2 Tab Timers - Sub-navegação
Todos os tipos de timer ficam na mesma aba com seletor:

```
┌─────────────────────────────────────┐
│  [Stopwatch] [Countdown] [Intervals]│
│  [EMOM] [AMRAP] [For Time] [Custom] │
└─────────────────────────────────────┘
```

---

## 11. Tipos de Timer

### 11.1 Stopwatch (existente)
- Cronômetro progressivo
- Laps
- Sem limite de tempo

### 11.2 Countdown Timer
- Timer regressivo simples
- Configuração: minutos + segundos
- Beeps finais
- "Time is up!" ao finalizar

### 11.3 Intervals (HIIT melhorado)
- Work / Rest / Warm Up / Cool Down / Rounds
- Fluxo atual do HIIT
- Presets: Tabata, EMOM, 30/30, Custom

### 11.4 EMOM (Every Minute On the Minute)
**Configurações:**
- Duration per round: 60s (fixo ou configurável)
- Total rounds: 1-60
- Warm Up: 0-300s
- Cool Down: 0-300s

**Fluxo:**
```
[Warm Up] → [60s] → [60s] → [60s] → ... → [Cool Down] → [Complete]
            └────────── N rounds ────────┘
```

**Display especial:**
- Mostra tempo restante no minuto atual
- Mostra round atual
- Beep no início de cada minuto

### 11.5 AMRAP (As Many Rounds As Possible)
**Configurações:**
- Time Cap: 1-60 minutos
- Warm Up: 0-300s
- Cool Down: 0-300s

**Fluxo:**
```
[Warm Up] → [AMRAP - conta para cima até time cap] → [Cool Down] → [Complete]
```

**Display especial:**
- Mostra tempo decorrido
- Mostra tempo restante até cap
- Botão para marcar round completado (+1 Round)
- Contador de rounds manual

### 11.6 For Time
**Configurações:**
- Time Cap: 1-60 minutos (opcional)
- Warm Up: 0-300s
- Cool Down: 0-300s

**Fluxo:**
```
[Warm Up] → [Timer conta para cima] → [Usuário clica DONE ou atinge cap] → [Cool Down] → [Complete]
```

**Display especial:**
- Mostra tempo decorrido
- Mostra tempo restante até cap (se definido)
- Botão DONE para finalizar
- Se atingir cap: "Time Cap!"

### 11.7 Custom (Text-based Timer) ⭐ NOVO
Parser de texto para criar workouts complexos.

---

## 12. Text-Based Workout Builder ⭐

### 12.1 Sintaxe
Inspirado no intervals.icu, permite definir workouts com texto simples.

### 12.2 Gramática
```
workout     = block+
block       = block_header newline duration_line+ newline?
block_header = block_type [repeat_count]
block_type  = "warmup" | "work" | "rest" | "cooldown" | "tabata" | "emom" | "amrap" | "fortime"
repeat_count = number "x" | number "rounds"
duration_line = duration [label]
duration    = number "s" | number "m" | number ":" number
label       = "work" | "rest" | any_text
```

### 12.3 Exemplos de Sintaxe

**Exemplo 1: HIIT Simples**
```
warmup
30s

work 8x
20s work
10s rest

cooldown
30s
```

**Exemplo 2: EMOM**
```
warmup
2m

emom 10x
60s

cooldown
1m
```

**Exemplo 3: Tabata**
```
tabata 8x
20s work
10s rest
```

**Exemplo 4: Workout Complexo**
```
warmup
3:00

emom 5x
60s

rest
2m

tabata 4x
20s work
10s rest

rest
1m

amrap 10m

cooldown
2:00
```

**Exemplo 5: For Time com Cap**
```
fortime 20m
# Complete as fast as possible
# 50 burpees
# 40 squats
# 30 push-ups
# 20 lunges
# 10 pull-ups
```

### 12.4 Parser Output
O parser converte o texto em uma estrutura de dados:

```javascript
{
  name: "Custom Workout",
  blocks: [
    {
      type: "warmup",
      duration: 30,
      repeat: 1
    },
    {
      type: "intervals",
      repeat: 8,
      phases: [
        { type: "work", duration: 20 },
        { type: "rest", duration: 10 }
      ]
    },
    {
      type: "cooldown",
      duration: 30,
      repeat: 1
    }
  ],
  totalDuration: 310, // calculado
  totalWork: 160,     // calculado
  totalRest: 80       // calculado
}
```

### 12.5 UI do Text Builder
```
┌─────────────────────────────────────┐
│ 📝 Custom Workout                   │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ warmup                          │ │
│ │ 30s                             │ │
│ │                                 │ │
│ │ tabata 8x                       │ │
│ │ 20s work                        │ │
│ │ 10s rest                        │ │
│ │                                 │ │
│ │ cooldown                        │ │
│ │ 30s                             │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ Preview:                            │
│ ⏱️ Total: 5:10                      │
│ 🔥 Work: 2:40                       │
│ 😌 Rest: 1:20                       │
│ 🔄 Rounds: 8                        │
├─────────────────────────────────────┤
│ [💾 Save to Library] [▶️ Start]     │
└─────────────────────────────────────┘
```

### 12.6 Validação e Erros
- Highlight de linha com erro
- Mensagem de erro clara
- Sugestão de correção

---

## 13. Workout Library ⭐

### 13.1 Estrutura de Dados
```javascript
// LocalStorage key: 'workoutLibrary'
{
  workouts: [
    {
      id: "uuid",
      name: "Morning Tabata",
      description: "Quick morning workout",
      type: "intervals" | "emom" | "amrap" | "fortime" | "custom",
      config: { ... }, // configuração específica do tipo
      textDefinition: "...", // para custom workouts
      createdAt: ISO 8601,
      updatedAt: ISO 8601,
      lastUsedAt: ISO 8601 | null,
      useCount: number,
      isFavorite: boolean,
      tags: ["morning", "quick", "tabata"]
    }
  ]
}
```

### 13.2 UI da Library
```
┌─────────────────────────────────────┐
│ 📚 Workout Library                  │
├─────────────────────────────────────┤
│ [🔍 Search...                     ] │
│ [All] [Favorites] [Recent]          │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ ⭐ Morning Tabata          HIIT │ │
│ │ 8 rounds • 4:00 total           │ │
│ │ Used 12 times                   │ │
│ │ [▶️] [✏️] [🗑️]                  │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 💪 EMOM 20                 EMOM │ │
│ │ 20 rounds • 20:00 total         │ │
│ │ Used 5 times                    │ │
│ │ [▶️] [✏️] [🗑️]                  │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ [➕ Create New Workout]             │
└─────────────────────────────────────┘
```

### 13.3 Ações da Library
- **▶️ Play**: Inicia o workout diretamente
- **✏️ Edit**: Abre editor (visual ou texto)
- **🗑️ Delete**: Remove (com confirmação)
- **⭐ Favorite**: Toggle favorito
- **📋 Duplicate**: Cria cópia

### 13.4 Filtros e Busca
- Busca por nome, descrição, tags
- Filtro por tipo (HIIT, EMOM, AMRAP, etc)
- Filtro por favoritos
- Ordenação: recente, mais usado, alfabético

---

## 14. Settings Tab ⭐

### 14.1 Seções
```
┌─────────────────────────────────────┐
│ ⚙️ Settings                         │
├─────────────────────────────────────┤
│ 🔊 Audio                            │
│ ├─ Voice Announcements    [toggle]  │
│ ├─ Sound Effects          [toggle]  │
│ ├─ Countdown Last 3s      [toggle]  │
│ ├─ Alerts Volume          [slider]  │
│ └─ Metronome Volume       [slider]  │
├─────────────────────────────────────┤
│ 🎵 Metronome                        │
│ ├─ Enable Metronome       [toggle]  │
│ ├─ Default BPM            [input]   │
│ └─ Play During            [select]  │
├─────────────────────────────────────┤
│ 🎨 Display                          │
│ ├─ Keep Screen Awake      [toggle]  │
│ └─ Show Milliseconds      [toggle]  │
├─────────────────────────────────────┤
│ 💾 Data                             │
│ ├─ Export Workouts        [button]  │
│ ├─ Import Workouts        [button]  │
│ ├─ Clear History          [button]  │
│ └─ Clear All Data         [button]  │
├─────────────────────────────────────┤
│ ℹ️ About                            │
│ ├─ Version: 2.0.0                   │
│ ├─ Install App            [button]  │
│ └─ Privacy Policy         [link]    │
└─────────────────────────────────────┘
```

### 14.2 Persistência de Settings
```javascript
// LocalStorage key: 'workoutSettings'
{
  audio: {
    voiceAnnouncements: true,
    soundEffects: true,
    countdownBeeps: true,
    alertsVolume: 80,
    metronomeVolume: 60
  },
  metronome: {
    enabled: false,
    defaultBpm: 120,
    playDuring: "work" | "rest" | "always"
  },
  display: {
    keepScreenAwake: true,
    showMilliseconds: false
  }
}
```

---

## 15. Quick Start Presets

### 15.1 Presets Disponíveis
Na tela inicial de cada tipo de timer, mostrar presets rápidos:

**Intervals:**
- Tabata (20s/10s × 8)
- 30/30 (30s/30s × 10)
- 40/20 (40s/20s × 10)
- Custom

**EMOM:**
- EMOM 10 (10 rounds)
- EMOM 15 (15 rounds)
- EMOM 20 (20 rounds)
- Custom

**AMRAP:**
- 10 min
- 15 min
- 20 min
- Custom

**For Time:**
- 10 min cap
- 15 min cap
- 20 min cap
- No cap

---

## 16. Melhorias na Execução do Timer

### 16.1 Preview do Workout
Antes de iniciar, mostrar resumo:
```
┌─────────────────────────────────────┐
│ Ready to Start                      │
├─────────────────────────────────────┤
│ ⏱️ Total Time: ~5:30                │
│ 🔥 Work Time: 2:40                  │
│ 😌 Rest Time: 1:20                  │
│ 🔄 Rounds: 8                        │
│ 📋 Warm Up: 30s                     │
│ 📋 Cool Down: 30s                   │
├─────────────────────────────────────┤
│ Phases:                             │
│ 1. Warm Up (30s)                    │
│ 2. Work (20s) × 8                   │
│ 3. Rest (10s) × 8                   │
│ 4. Cool Down (30s)                  │
├─────────────────────────────────────┤
│ [▶️ Start Workout]                  │
└─────────────────────────────────────┘
```

### 16.2 Progress Indicator
Durante execução, mostrar onde está no workout completo:
```
Phase 3/18: WORK (Round 2/8)
[████████░░░░░░░░░░░░] 40%
```

### 16.3 Próxima Fase
Mostrar o que vem a seguir:
```
Next: REST (10s)
```

---

## 17. Modelo de Dados Unificado

### 17.1 Workout Definition
```typescript
interface Workout {
  id: string;
  name: string;
  type: WorkoutType;
  blocks: WorkoutBlock[];
  settings: WorkoutSettings;
  metadata: WorkoutMetadata;
}

type WorkoutType = 'stopwatch' | 'countdown' | 'intervals' | 'emom' | 'amrap' | 'fortime' | 'custom';

interface WorkoutBlock {
  id: string;
  type: BlockType;
  duration: number; // em segundos
  repeat: number;
  phases?: WorkoutPhase[]; // para intervals
  label?: string;
}

type BlockType = 'warmup' | 'work' | 'rest' | 'cooldown' | 'emom' | 'amrap' | 'fortime';

interface WorkoutPhase {
  type: 'work' | 'rest';
  duration: number;
  label?: string;
}

interface WorkoutSettings {
  metronome: {
    enabled: boolean;
    bpm: number;
    playDuring: 'work' | 'rest' | 'always';
  };
}

interface WorkoutMetadata {
  createdAt: string;
  updatedAt: string;
  totalDuration: number;
  totalWork: number;
  totalRest: number;
}
```

### 17.2 Execution State
```typescript
interface ExecutionState {
  workout: Workout;
  status: 'idle' | 'running' | 'paused' | 'finished';
  currentBlockIndex: number;
  currentPhaseIndex: number;
  currentRound: number;
  remainingSeconds: number;
  totalElapsed: number;
  totalWorkTime: number;
  roundsCompleted: number; // para AMRAP
}
```

---

## 18. Fluxo de Navegação

```
┌─────────────┐
│   Timers    │
├─────────────┤
│ - Stopwatch │───────────────────────────────────┐
│ - Countdown │────────────────────────────────┐  │
│ - Intervals │─────────────────────────────┐  │  │
│ - EMOM      │──────────────────────────┐  │  │  │
│ - AMRAP     │───────────────────────┐  │  │  │  │
│ - For Time  │────────────────────┐  │  │  │  │  │
│ - Custom    │─────────────────┐  │  │  │  │  │  │
└─────────────┘                 │  │  │  │  │  │  │
                                ▼  ▼  ▼  ▼  ▼  ▼  ▼
                          ┌─────────────────────────┐
                          │    Timer Config Screen   │
                          │    (específica do tipo)  │
                          └───────────┬─────────────┘
                                      │
                                      ▼
                          ┌─────────────────────────┐
                          │    Preview / Confirm    │
                          │    [Save] [Start]       │
                          └───────────┬─────────────┘
                                      │
                                      ▼
                          ┌─────────────────────────┐
                          │    Timer Execution      │
                          │    [Pause] [Stop] [Skip]│
                          └───────────┬─────────────┘
                                      │
                                      ▼
                          ┌─────────────────────────┐
                          │    Complete Screen      │
                          │    [Save] [Restart]     │
                          └─────────────────────────┘
```

---

## 19. Checklist de Implementação

### Fase 1: Refatoração Base
- [ ] Reorganizar estrutura de navegação (3 tabs)
- [ ] Criar sub-navegação de tipos de timer
- [ ] Mover settings para tab dedicada
- [ ] Persistir settings no localStorage

### Fase 2: Novos Tipos de Timer
- [ ] Implementar Countdown Timer
- [ ] Implementar EMOM
- [ ] Implementar AMRAP
- [ ] Implementar For Time
- [ ] Unificar estado de execução

### Fase 3: Text-Based Builder
- [ ] Implementar parser de texto
- [ ] Criar UI do editor de texto
- [ ] Validação e feedback de erros
- [ ] Preview em tempo real

### Fase 4: Library
- [ ] Estrutura de dados da library
- [ ] UI de listagem
- [ ] CRUD de workouts
- [ ] Busca e filtros
- [ ] Favoritos

### Fase 5: Melhorias UX
- [ ] Preview antes de iniciar
- [ ] Progress indicator global
- [ ] Indicador de próxima fase
- [ ] Export/Import de dados

---

## 20. Considerações Técnicas

### 20.1 Performance
- Usar requestAnimationFrame para updates visuais
- Debounce em inputs de texto
- Lazy loading de workouts na library

### 20.2 Offline
- Todos os dados em localStorage
- Service Worker com cache-first
- Sem dependências externas além de fonts

### 20.3 Mobile
- Touch-friendly (mínimo 44px para touch targets)
- Safe areas para notch/home indicator
- Prevent zoom em inputs

### 20.4 Acessibilidade
- Labels descritivos
- Feedback visual e sonoro
- Cores com contraste adequado

---

*Especificação v2.0 - Janeiro 2025*
