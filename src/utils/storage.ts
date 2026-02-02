export function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch {
    return defaultValue
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error('Failed to save to localStorage:', e)
  }
}

export function removeStorageItem(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch (e) {
    console.error('Failed to remove from localStorage:', e)
  }
}

export function clearStorage(): void {
  try {
    localStorage.clear()
  } catch (e) {
    console.error('Failed to clear localStorage:', e)
  }
}
