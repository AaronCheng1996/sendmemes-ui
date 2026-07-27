const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
  ['second', 1],
]

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

function toDate(input: string | Date): Date {
  return input instanceof Date ? input : new Date(input)
}

/** "3 hours ago" / "in 3 hours" style relative time, past or future. */
export function formatRelative(input: string | Date): string {
  const d = toDate(input)
  if (Number.isNaN(d.getTime())) return typeof input === 'string' ? input : ''

  const diffSeconds = (d.getTime() - Date.now()) / 1000
  for (const [unit, secondsInUnit] of RELATIVE_UNITS) {
    if (Math.abs(diffSeconds) >= secondsInUnit) {
      return rtf.format(Math.round(diffSeconds / secondsInUnit), unit)
    }
  }
  return rtf.format(0, 'second')
}

/** Locale-formatted absolute timestamp, used alongside formatRelative. */
export function formatAbsolute(input: string | Date): string {
  const d = toDate(input)
  return Number.isNaN(d.getTime()) ? String(input) : d.toLocaleString()
}
