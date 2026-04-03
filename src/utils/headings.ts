import { createSlugger } from './slug'

export type HeadingItem = {
  id: string
  text: string
  level: number
}

export function normalizeHeadingText(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function extractHeadings(markdown: string): HeadingItem[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const slugger = createSlugger()
  const headings: HeadingItem[] = []
  let inFence = false

  for (const line of lines) {
    const fence = line.match(/^```/)
    if (fence) {
      inFence = !inFence
      continue
    }

    if (inFence) {
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/)
    if (!heading) {
      continue
    }

    const level = heading[1].length
    const rawText = heading[2] ?? ''
    const text = normalizeHeadingText(rawText)

    if (!text) {
      continue
    }

    headings.push({
      level,
      text,
      id: slugger.slug(text),
    })
  }

  return headings
}

export function getTableOfContents(markdown: string): HeadingItem[] {
  return extractHeadings(markdown).filter((item) => item.level === 2 || item.level === 3)
}
