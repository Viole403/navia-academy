import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function groupBy<T>(items: T[], key: keyof T): Map<string, T[]> {
  return items.reduce((map, item) => {
    const k = String(item[key])
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(item)
    return map
  }, new Map<string, T[]>())
}

export function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i)
}

export * from "./voice-map"
export type { VoiceLocale, VoiceGender } from "./voice-map"
