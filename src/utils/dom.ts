export function $(selector: string): HTMLElement | null {
  return document.querySelector(selector)
}

export function $$(selector: string): NodeListOf<HTMLElement> {
  return document.querySelectorAll(selector)
}

export function $id(id: string): HTMLElement | null {
  return document.getElementById(id)
}

export function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

export function addClass(el: HTMLElement | null, className: string): void {
  el?.classList.add(className)
}

export function removeClass(el: HTMLElement | null, className: string): void {
  el?.classList.remove(className)
}

export function toggleClass(el: HTMLElement | null, className: string, force?: boolean): void {
  el?.classList.toggle(className, force)
}

export function hasClass(el: HTMLElement | null, className: string): boolean {
  return el?.classList.contains(className) ?? false
}

export function setHtml(el: HTMLElement | null, html: string): void {
  if (el) {
    el.innerHTML = html
  }
}

export function setText(el: HTMLElement | null, text: string): void {
  if (el) {
    el.textContent = text
  }
}

export function show(el: HTMLElement | null): void {
  if (el) {
    el.style.display = ''
  }
}

export function hide(el: HTMLElement | null): void {
  if (el) {
    el.style.display = 'none'
  }
}

export function getInputValue(id: string): string {
  const el = $id(id) as HTMLInputElement | null
  return el?.value ?? ''
}

export function getInputNumber(id: string, defaultValue = 0): number {
  const el = $id(id) as HTMLInputElement | null
  return Number.parseInt(el?.value ?? '', 10) || defaultValue
}

export function setInputValue(id: string, value: string | number): void {
  const el = $id(id) as HTMLInputElement | null
  if (el) {
    el.value = String(value)
  }
}
