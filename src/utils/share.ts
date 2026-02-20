import type { TimerType } from '@/types'

interface SharedWorkoutData {
  n: string // name
  t: TimerType // type
  d?: string // textDefinition
  desc?: string // description
  tags?: string[] // tags
  c?: number // countdown
}

export interface SharedWorkout {
  name: string
  type: TimerType
  textDefinition?: string
  description?: string
  tags?: string[]
  countdown?: number
}

export function encodeWorkout(workout: SharedWorkout): string {
  const data: SharedWorkoutData = {
    n: workout.name,
    t: workout.type,
  }
  if (workout.textDefinition) data.d = workout.textDefinition
  if (workout.description) data.desc = workout.description
  if (workout.tags?.length) data.tags = workout.tags
  if (workout.countdown && workout.countdown > 0) data.c = workout.countdown

  const json = JSON.stringify(data)
  const base64 = btoa(unescape(encodeURIComponent(json)))
  return base64
}

export function decodeWorkout(encoded: string): SharedWorkout | null {
  try {
    const json = decodeURIComponent(escape(atob(encoded)))
    const data: SharedWorkoutData = JSON.parse(json)

    if (!data.n || !data.t) return null

    return {
      name: data.n,
      type: data.t,
      textDefinition: data.d,
      description: data.desc,
      tags: data.tags,
      countdown: data.c,
    }
  } catch {
    return null
  }
}

export function generateShareUrl(workout: SharedWorkout): string {
  const encoded = encodeWorkout(workout)
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  url.searchParams.set('w', encoded)
  return url.toString()
}

export function getSharedWorkoutFromUrl(): SharedWorkout | null {
  const params = new URLSearchParams(window.location.search)
  const encoded = params.get('w')
  if (!encoded) return null
  return decodeWorkout(encoded)
}

export function clearShareParam(): void {
  const url = new URL(window.location.href)
  url.searchParams.delete('w')
  window.history.replaceState({}, '', url.toString())
}

export async function shareWorkout(workout: SharedWorkout): Promise<void> {
  const url = generateShareUrl(workout)

  if (navigator.share) {
    try {
      await navigator.share({
        title: workout.name,
        text: `Check out this workout: ${workout.name}`,
        url,
      })
      return
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
    }
  }

  await navigator.clipboard.writeText(url)
  showCopiedToast()
}

function showCopiedToast(): void {
  const existing = document.getElementById('share-toast')
  if (existing) existing.remove()

  const toast = document.createElement('div')
  toast.id = 'share-toast'
  toast.className = 'share-toast'
  toast.textContent = 'Link copied!'
  document.body.appendChild(toast)

  requestAnimationFrame(() => {
    toast.classList.add('show')
  })

  setTimeout(() => {
    toast.classList.remove('show')
    setTimeout(() => toast.remove(), 300)
  }, 2000)
}
