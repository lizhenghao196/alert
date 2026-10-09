import { STORAGE_KEY, type Selection } from './types'

export function loadSelection(): Selection | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Partial<Selection> | null
    if (
      !data ||
      typeof data.teamName !== 'string' ||
      typeof data.systemId !== 'string' ||
      typeof data.frequency !== 'number'
    ) {
      return null
    }
    return { teamName: data.teamName, systemId: data.systemId, frequency: data.frequency }
  } catch {
    return null
  }
}

export function saveSelection(value: Selection): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    /* ignore quota / disabled */
  }
}