export function formatDate(date: string, format: 'short' | 'long' = 'long'): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: format,
    day: 'numeric',
  })
}

export function isSameCalendarDate(a: string, b: string): boolean {
  const dateA = new Date(a)
  const dateB = new Date(b)

  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  )
}
