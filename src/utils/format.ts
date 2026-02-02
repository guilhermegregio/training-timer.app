export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function formatTimeMillis(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`
}

export function parseTimeDuration(str: string): number {
  // Format: "1:30" -> 90 seconds
  const colonMatch = str.match(/(\d+):(\d+)/)
  if (colonMatch) {
    return (
      Number.parseInt(colonMatch[1] ?? '0', 10) * 60 + Number.parseInt(colonMatch[2] ?? '0', 10)
    )
  }

  // Format: "1min", "2m", "1 min" -> seconds
  const minMatch = str.match(/(\d+)\s*(m|min)/i)
  if (minMatch) {
    return Number.parseInt(minMatch[1] ?? '0', 10) * 60
  }

  // Format: "30s", "30sec", "30" -> seconds
  const secMatch = str.match(/(\d+)\s*(s|sec)?/i)
  if (secMatch) {
    return Number.parseInt(secMatch[1] ?? '0', 10)
  }

  return 0
}
