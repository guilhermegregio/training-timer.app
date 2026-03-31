# Training Timer - Custom Workout Syntax Reference

Use this reference to generate custom workouts for https://training-timer.app. The app parses plain text into timed workout phases and supports sharing via URL.

## Time Formats

| Format | Example | Result |
|--------|---------|--------|
| Seconds | `30` or `30s` | 30 seconds |
| Minutes | `2m` or `2min` | 2 minutes |
| MM:SS | `1:30` | 1 minute 30 seconds |

## Phase Types

Each line with a duration becomes a phase. Add a keyword to set the type:

```
30s work       # Work phase (green)
10s rest       # Rest phase (blue)
2min warmup    # Warmup phase (orange) - only inside warmup block
2min cooldown  # Cooldown phase (purple) - only inside cooldown block
```

A bare duration like `30s` defaults to **work**.

## Block Context

Set the context for subsequent phases:

```
warmup
2min              # This becomes a warmup phase
1min              # This too

---               # Section separator - resets context

cooldown
2min              # This becomes a cooldown phase
```

Use `---` (3+ dashes) to reset context and separate sections.

## Repeats

```
5x
30s work
10s rest
end
```

This creates 5 rounds of 30s work + 10s rest. The `end` (or `endrepeat`) closes the repeat block. `---` also closes repeats.

## Named Protocols

### Tabata

```
tabata
20s work
10s rest
```

Equivalent to `8x` by default. Override rounds: `tabata 6x`.

### EMOM (Every Minute On the Minute)

```
emom
10x
40s work
```

10 rounds of 40s work within each minute (remaining time is rest).

### AMRAP (As Many Rounds As Possible)

```
amrap 12min
- Burpees (10x)
- Box Jumps (15x)
- Kettlebell Swings (20x|@24kg)
```

### For Time

```
fortime 10min
- Thrusters (21x|@43kg)
- Pull-ups (21x)
- Thrusters (15x|@43kg)
- Pull-ups (15x)
- Thrusters (9x|@43kg)
- Pull-ups (9x)
```

## Exercises

Define exercises with `-` or `*` prefix. Metadata goes in parentheses, separated by `|`:

```
- Exercise Name (reps|@weight_unit|percentage|pse_value)
```

| Property | Format | Example |
|----------|--------|---------|
| Reps | `Nx` | `12x` |
| Weight | `@N` or `@Nkg` or `@Nlbs` | `@50kg` |
| Percentage | `N%` | `75%` |
| PSE (effort) | `pseN` | `pse8` |

Examples:
```
- Back Squat (5x|@100kg|80%|pse7)
- Push-ups (20x)
- Deadlift (3x|@140kg)
```

Exercises are expanded into individual phases for tracking in AMRAP, For Time, and wait-based workouts.

## Metronome

Add metronome to any phase with bracket syntax:

```
30s work [120 bpm]          # 120 BPM during work
30s work [140 bpm work]     # Only during work phases
10s rest [80 bpm rest]      # Only during rest phases
30s work [100 bpm always]   # During all phases
```

## Milliseconds Display

```
ms=on     # Show milliseconds on timer display
ms=off    # Hide milliseconds
```

## Comments

```
# This is a comment - shown as section label in the UI
```

## Wait (Manual Advance)

```
wait          # Pauses until user taps to continue
wait work     # Wait typed as work
wait rest     # Wait typed as rest
```

## Stopwatch

```
stopwatch           # Unlimited timer, user stops manually
stopwatch [100 bpm] # With metronome
```

## Standalone Rest

```
1min rest     # Rest between blocks/sections
```

---

## Complete Workout Examples

### Tabata Classic

```
tabata
20s work
10s rest
```

### CrossFit-Style WOD

```
warmup
3min
---
fortime 15min
- Thrusters (21x|@43kg)
- Pull-ups (21x)
- Thrusters (15x|@43kg)
- Pull-ups (15x)
- Thrusters (9x|@43kg)
- Pull-ups (9x)
---
cooldown
3min
```

### EMOM Strength

```
warmup
3min
---
# Power Cleans
emom
10x
- Power Clean (3x|@70kg|75%)
---
1min rest
---
# Front Squats
emom
8x
- Front Squat (2x|@80kg|80%)
---
cooldown
2min
```

### Interval Training

```
warmup
5min
---
6x
40s work
20s rest
---
2min rest
---
6x
30s work
30s rest
---
cooldown
3min
```

### AMRAP with Exercises

```
warmup
2min
---
amrap 20min
- Wall Balls (20x|@9kg)
- Box Jumps (15x)
- Kettlebell Swings (10x|@24kg)
- Burpees (5x)
---
cooldown
3min
```

### Complex Multi-Block

```
warmup
3min
---
# Block 1 - Strength
emom
5x
- Deadlift (3x|@120kg|85%)
---
2min rest
---
# Block 2 - Conditioning
4x
45s work [140 bpm]
15s rest
---
1min rest
---
# Block 3 - Finisher
amrap 5min
- Burpees (10x)
- Double Unders (30x)
---
cooldown
3min
```

---

## Generating Share Links

Share links encode the workout as base64 in the URL parameter `w`.

### URL Format

```
https://training-timer.app/?w=<BASE64_ENCODED_DATA>
```

### Data Structure (JSON before encoding)

```json
{
  "n": "Workout Name",
  "t": "custom",
  "d": "the workout text\nwith newlines",
  "desc": "Optional description",
  "tags": ["strength", "hiit"]
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `n` | Yes | Workout name |
| `t` | Yes | Always `"custom"` for text workouts |
| `d` | Yes* | The workout text definition (the syntax above) |
| `desc` | No | Description shown to user |
| `tags` | No | Array of tags for categorization |
| `c` | No | Countdown timer in seconds (for non-custom types) |

### Encoding Algorithm

```
1. Build JSON object with abbreviated keys
2. JSON.stringify()
3. encodeURIComponent()
4. unescape()
5. btoa() → base64 string
6. Append as ?w= parameter
```

### JavaScript/TypeScript Example

```javascript
function generateShareLink(name, workoutText, description, tags) {
  const data = { n: name, t: "custom", d: workoutText };
  if (description) data.desc = description;
  if (tags?.length) data.tags = tags;

  const json = JSON.stringify(data);
  const encoded = btoa(unescape(encodeURIComponent(json)));
  return `https://training-timer.app/?w=${encoded}`;
}
```

### Python Example

```python
import json, base64

def generate_share_link(name: str, workout_text: str, description: str = None, tags: list = None) -> str:
    data = {"n": name, "t": "custom", "d": workout_text}
    if description:
        data["desc"] = description
    if tags:
        data["tags"] = tags

    json_str = json.dumps(data, ensure_ascii=False)
    encoded = base64.b64encode(json_str.encode("utf-8")).decode("ascii")
    return f"https://training-timer.app/?w={encoded}"
```

### Quick Test

To verify a generated link works:
1. Open the link in a browser
2. The app should show an import dialog with the workout name
3. Click "Save to Library" to add it
4. Click "Start" to run it directly

---

## Tips for AI Workout Generation

1. **Always use `---` between sections** (warmup, main workout, cooldown) for clean separation
2. **Use comments (`#`)** to label sections - they appear in the UI as section headers
3. **Include warmup and cooldown** when generating complete workouts
4. **Use exercises with metadata** for strength workouts - reps, weight, and percentage are displayed during the workout
5. **Set type to `"custom"`** and put the workout text in the `d` field when generating share links
6. **Use `\n` for newlines** in the JSON `d` field when building share links programmatically
7. **Keep workout names short** - they appear in the library list and share previews
8. **Tag workouts** for easy filtering: common tags include `strength`, `hiit`, `cardio`, `emom`, `amrap`, `crossfit`, `bodyweight`, `kettlebell`
