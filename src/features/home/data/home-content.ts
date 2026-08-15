export type HomeSectionType =
  | 'hero'
  | 'focus'
  | 'reading'
  | 'interests'
  | 'roadmap'
  | 'toolkit'
  | 'contact'

export type HomeLink = {
  label: string
  href: string
}

export type HomeReadingItem = {
  title: string
  author: string
  summary: string
}

export type HomeToolkitItem = {
  label: string
  value: string
}

export type HomeDocument = {
  type: HomeSectionType
  title: string
  description: string
  eyebrow?: string
  seoTitle?: string
  seoDescription?: string
  lede?: string
  badges?: string[]
  items?: string[]
  readingItems?: HomeReadingItem[]
  toolkitItems?: HomeToolkitItem[]
  links?: HomeLink[]
}

function requiredString(frontmatter: FrontmatterData, key: string, source: string): string {
  const value = frontmatter[key]
  if (typeof value !== 'string' || !value) {
    throw new Error(`${source} requires a non-empty '${key}' field`)
  }

  return value
}

function listItems(body: string): string[] {
  const items: string[] = []

  for (const line of body.split('\n')) {
    const trimmed = line.trim()
    const match = trimmed.match(/^(?:[-*]|\d+[.)])\s+(.+)$/)

    if (match) {
      items.push(match[1].trim())
      continue
    }

    if (trimmed && items.length > 0) {
      items[items.length - 1] = `${items[items.length - 1]} ${trimmed}`
    }
  }

  return items
}

function delimitedItems(body: string, expectedParts: number, source: string): string[][] {
  return listItems(body).map((item) => {
    const parts = item.split('|').map((part) => part.trim())
    if (parts.length !== expectedParts || parts.some((part) => !part)) {
      throw new Error(`${source} items must contain ${expectedParts} non-empty pipe-separated fields`)
    }

    return parts
  })
}

function parseLinks(body: string, source: string): HomeLink[] {
  return listItems(body).map((item) => {
    const match = item.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (!match) {
      throw new Error(`${source} links must use Markdown syntax: [label](href)`)
    }

    return { label: match[1], href: match[2] }
  })
}

export function parseHomeDocument(raw: string, source = 'home content'): HomeDocument {
  const { data: frontmatter, content: body } = parseFrontmatterDocument(raw)
  const type = requiredString(frontmatter, 'type', source) as HomeSectionType
  const validTypes: HomeSectionType[] = [
    'hero',
    'focus',
    'reading',
    'interests',
    'roadmap',
    'toolkit',
    'contact',
  ]

  if (!validTypes.includes(type)) {
    throw new Error(`${source} has unsupported type '${type}'`)
  }

  const document: HomeDocument = {
    type,
    title: requiredString(frontmatter, 'title', source),
    description: requiredString(frontmatter, 'description', source),
  }

  if (typeof frontmatter.eyebrow === 'string') document.eyebrow = frontmatter.eyebrow
  if (typeof frontmatter.seoTitle === 'string') document.seoTitle = frontmatter.seoTitle
  if (typeof frontmatter.seoDescription === 'string') document.seoDescription = frontmatter.seoDescription

  if (type === 'hero') {
    document.lede = body
    document.badges = frontmatter.badges instanceof Array ? frontmatter.badges : []
  }

  if (type === 'focus' || type === 'interests' || type === 'roadmap') {
    document.items = listItems(body)
  }

  if (type === 'reading') {
    document.readingItems = delimitedItems(body, 3, source).map(([title, author, summary]) => ({
      title,
      author,
      summary,
    }))
  }

  if (type === 'toolkit') {
    document.toolkitItems = delimitedItems(body, 2, source).map(([label, value]) => ({ label, value }))
  }

  if (type === 'contact') {
    document.links = parseLinks(body, source)
  }

  return document
}
import {
  parseFrontmatterDocument,
  type FrontmatterData,
} from '../../../utils/frontmatter'
