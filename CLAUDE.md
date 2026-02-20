# Workout Timer App

## Estrutura do Projeto

```
training-timer.app/
├── src/
│   ├── index.html              # Entry point HTML
│   ├── main.ts                 # Entry point TypeScript
│   ├── vite-env.d.ts           # Vite types
│   ├── styles/
│   │   ├── main.css            # CSS principal
│   │   └── variables.css       # CSS variables
│   ├── managers/
│   │   ├── index.ts            # Re-exports
│   │   ├── audio.ts            # AudioManager
│   │   ├── speech.ts           # SpeechManager
│   │   ├── wakelock.ts         # WakeLockManager
│   │   ├── history.ts          # HistoryManager
│   │   ├── settings.ts         # SettingsManager
│   │   └── library.ts          # LibraryManager
│   ├── timers/
│   │   ├── index.ts            # Timer exports
│   │   ├── types.ts            # Timer types
│   │   ├── builder.ts          # Phase builder
│   │   ├── configs.ts          # Timer configurations
│   │   ├── runner.ts           # Timer execution
│   │   └── metronome.ts        # Metronome logic
│   ├── parser/
│   │   ├── index.ts            # Custom workout parser
│   │   └── presets.ts          # Workout presets
│   ├── ui/
│   │   ├── index.ts            # UI exports
│   │   ├── screens.ts          # Screen management
│   │   ├── navigation.ts       # Tab navigation
│   │   ├── library.ts          # Library UI
│   │   ├── settings.ts         # Settings UI
│   │   └── modals.ts           # Modal handling
│   ├── utils/
│   │   ├── index.ts            # Utils exports
│   │   ├── format.ts           # Time formatting
│   │   ├── dom.ts              # DOM helpers
│   │   └── storage.ts          # localStorage wrapper
│   └── types/
│       ├── index.ts            # Type exports
│       ├── workout.ts          # Workout interfaces
│       ├── phase.ts            # Phase types
│       └── settings.ts         # Settings types
├── public/
│   └── icons/
│       └── icon.svg            # App icon
├── tests/
│   ├── managers/
│   │   └── audio.test.ts
│   ├── parser/
│   │   └── parser.test.ts
│   └── utils/
│       └── format.test.ts
├── dist/                       # Build output
├── package.json
├── tsconfig.json
├── vite.config.ts
├── biome.json
└── wrangler.toml
```

## Stack Tecnológico

- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Vitest** - Testes unitários
- **Biome** - Lint e formatação
- **vite-plugin-pwa** - Service Worker automático
- **Cloudflare Pages** - Deploy (wrangler)
- **pnpm** - Gerenciador de pacotes

## Gerenciador de Pacotes

**IMPORTANTE: Sempre usar `pnpm` em vez de `npm` para instalar dependências e rodar scripts.**

```bash
pnpm install     # Instalar dependências
pnpm add <pkg>   # Adicionar dependência
pnpm remove <pkg> # Remover dependência
```

## Scripts

```bash
pnpm run dev      # Vite dev server
pnpm run build    # Build de produção
pnpm run preview  # Preview do build
pnpm run test     # Vitest
pnpm run lint     # Biome lint
pnpm run format   # Biome format
pnpm run check    # Biome check (lint + format)
pnpm run deploy   # wrangler pages deploy
```

## Managers (Singletons)

| Manager | Arquivo | Responsabilidade |
|---------|---------|------------------|
| `audioManager` | `managers/audio.ts` | Sons via Web Audio API |
| `speechManager` | `managers/speech.ts` | Text-to-speech |
| `wakeLockManager` | `managers/wakelock.ts` | Mantém tela ligada |
| `historyManager` | `managers/history.ts` | Histórico (localStorage) |
| `settingsManager` | `managers/settings.ts` | Configurações (localStorage) |
| `libraryManager` | `managers/library.ts` | Biblioteca (localStorage) |

## Tipos de Timer

Configurados em `timers/configs.ts`:

| Tipo | Descrição |
|------|-----------|
| `stopwatch` | Cronômetro progressivo |
| `countdown` | Timer simples regressivo |
| `intervals` | Work/Rest com rounds (HIIT) |
| `emom` | Every Minute On the Minute |
| `amrap` | As Many Rounds As Possible |
| `fortime` | For Time com cap |
| `custom` | Workout definido por texto |

## Fluxo de Execução

1. `openTimer(type)` - Abre tela de configuração
2. `startTimerFromConfig()` - Valida e inicia timer
3. `startTimer(config)` - Cria estado e inicia execução
4. `buildPhases(config)` - Gera array de fases
5. `runTimer()` - Loop principal com `setInterval`
6. `updateTimerDisplay()` - Atualiza UI
7. `nextPhase()` - Avança para próxima fase
8. `completeWorkout()` - Finaliza e salva histórico

## Custom Workout Parser

Função `parseCustomWorkout(text)` em `parser/index.ts`:

### Sintaxe Suportada

```
# Comentário (ignorado)
warmup / cooldown     # Define tipo das fases seguintes
10x                   # Repete próximas fases 10 vezes
tabata 8x             # Alias para repetição
30s work              # Fase work de 30 segundos
10s rest              # Fase rest de 10 segundos
1min / 1m / 60        # Formatos de tempo
1:30                  # Formato minutos:segundos
emom / emom 1         # Label de seção (ignorado)
fortime 10min         # Fase work com duração
amrap 12min           # Fase work com duração
1min rest             # Rest solto entre blocos
end / endrepeat       # Fecha bloco de repetição
```

### Presets

Definidos em `parser/presets.ts`: tabata, emom, fortime, amrap, complex

## Tipos TypeScript

### Phase Types (`types/phase.ts`)

```typescript
type PhaseType = 'work' | 'rest' | 'warmup' | 'cooldown' | 'prepare' | 'countdown' | 'stopwatch'

interface Phase {
  type: PhaseType
  duration: number
  label?: string
  round?: number
}
```

### Timer Types (`types/workout.ts`)

```typescript
type TimerType = 'stopwatch' | 'countdown' | 'intervals' | 'emom' | 'amrap' | 'fortime' | 'custom'

interface TimerConfig {
  type: TimerType
  metronome?: MetronomeSettings
  // + campos específicos por tipo
}
```

## CSS Variables

Definidas em `styles/variables.css`:

```css
--phase-work: #00ff88;
--phase-rest: #00d4ff;
--phase-warmup: #ff9f43;
--phase-cooldown: #a855f7;
--phase-prepare: #ffd93d;
```

## Funções Utilitárias

Em `utils/format.ts`:
- `formatTime(seconds)` - "MM:SS"
- `formatTimeMillis(seconds)` - "MM:SS.ms"
- `parseTimeDuration(str)` - Extrai segundos de string

Em `utils/dom.ts`:
- `$id(id)` - document.getElementById
- `$(selector)` - querySelector
- `escapeHtml(text)` - Sanitiza HTML

## LocalStorage Keys

- `workout_settings` - Configurações
- `workout_library` - Treinos salvos
- `workout_history` - Histórico

## PWA

- Service Worker gerado automaticamente por `vite-plugin-pwa`
- Manifest gerado em `vite.config.ts`
- Cache de Google Fonts configurado

## Deploy

```bash
pnpm run deploy  # Build + deploy para Cloudflare Pages
```

Configuração em `wrangler.toml`.

## Testes

```bash
pnpm test        # Modo watch
pnpm run test:run # Rodar uma vez
```

Testes em `tests/` usando Vitest.
