export type Slugger = {
  slug: (text: string) => string
}

function normalizeSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[`~!@#$%^&*()+=<>?,./:;"'|\\[\]{}]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function createSlugger(): Slugger {
  const seen = new Map<string, number>()

  return {
    slug(text: string): string {
      const base = normalizeSlug(text) || 'section'
      const count = seen.get(base) ?? 0
      seen.set(base, count + 1)

      if (count === 0) {
        return base
      }

      return `${base}-${count}`
    },
  }
}
