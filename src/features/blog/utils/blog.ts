export type BlogPost = {
  slug: string
  title: string
  date: string
  excerpt: string
  tags: string[]
  published: boolean
  publishAt?: string
  updatedAt?: string
  content: string
  readingTimeMinutes: number
  wordCount: number
}

type Frontmatter = {
  title?: string
  date?: string
  excerpt?: string
  tags?: string[]
  published?: boolean
  publishAt?: string
}

type BlogMetaMap = Record<string, { updatedAt?: string }>

const markdownModules = import.meta.glob('/src/content/blog/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

const blogMetaModule = import.meta.glob('/src/content/blog.meta.ts', {
  eager: true,
  import: 'blogMeta',
}) as Record<string, BlogMetaMap>

const blogMeta = Object.values(blogMetaModule)[0] ?? {}

function coerceFrontmatterValue(value: string): string | boolean | string[] {
  const trimmed = value.trim()

  if (trimmed === 'true') {
    return true
  }

  if (trimmed === 'false') {
    return false
  }

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const body = trimmed.slice(1, -1).trim()
    if (!body) {
      return []
    }

    return body
      .split(',')
      .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean)
  }

  return trimmed.replace(/^['"]|['"]$/g, '')
}

function parseFrontmatter(rawFrontmatter: string): Frontmatter {
  const frontmatter: Frontmatter = {}
  const lines = rawFrontmatter.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      continue
    }

    const separatorIndex = trimmed.indexOf(':')
    if (separatorIndex === -1) {
      continue
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim()

    if (!value) {
      continue
    }

    const parsedValue = coerceFrontmatterValue(value)

    if (key === 'title' && typeof parsedValue === 'string') {
      frontmatter.title = parsedValue
    }

    if (key === 'date' && typeof parsedValue === 'string') {
      frontmatter.date = parsedValue
    }

    if (key === 'excerpt' && typeof parsedValue === 'string') {
      frontmatter.excerpt = parsedValue
    }

    if (key === 'tags') {
      if (Array.isArray(parsedValue)) {
        frontmatter.tags = parsedValue
      } else if (typeof parsedValue === 'string') {
        frontmatter.tags = parsedValue
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      }
    }

    if (key === 'published' && typeof parsedValue === 'boolean') {
      frontmatter.published = parsedValue
    }

    if (key === 'publishAt' && typeof parsedValue === 'string') {
      frontmatter.publishAt = parsedValue
    }
  }

  return frontmatter
}

function splitFrontmatter(rawMarkdown: string): {
  frontmatter: Frontmatter
  content: string
} {
  const normalized = rawMarkdown.replace(/\r\n/g, '\n').trim()

  if (!normalized.startsWith('---\n')) {
    return {
      frontmatter: {},
      content: normalized,
    }
  }

  const delimiter = '\n---\n'
  const end = normalized.indexOf(delimiter, 4)

  if (end === -1) {
    return {
      frontmatter: {},
      content: normalized,
    }
  }

  const frontmatterBlock = normalized.slice(4, end)
  const content = normalized.slice(end + delimiter.length).trim()

  return {
    frontmatter: parseFrontmatter(frontmatterBlock),
    content,
  }
}

function getSlugFromPath(path: string): string {
  const fileName = path.split('/').pop() ?? ''
  return fileName.replace(/\.md$/, '')
}

function countReadingTimeMinutes(content: string): number {
  const words = countWords(content)
  return Math.max(1, Math.ceil(words / 200))
}

function countWords(content: string): number {
  return content.split(/\s+/).filter(Boolean).length
}

function getExcerpt(content: string): string {
  const firstParagraph = content.split('\n\n').find((segment) => segment.trim()) ?? ''
  const cleaned = firstParagraph
    .replace(/[#>*`\-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (cleaned.length <= 170) {
    return cleaned
  }

  return `${cleaned.slice(0, 167)}...`
}

function sortByDateDesc(a: BlogPost, b: BlogPost): number {
  return new Date(b.date).getTime() - new Date(a.date).getTime()
}

function isPostVisible(post: BlogPost): boolean {
  if (!post.published) {
    return false
  }

  if (!post.publishAt) {
    return true
  }

  const publishTimestamp = new Date(post.publishAt).getTime()
  if (Number.isNaN(publishTimestamp)) {
    return true
  }

  return Date.now() >= publishTimestamp
}

const blogPosts: BlogPost[] = Object.entries(markdownModules)
  .map(([path, rawMarkdown]) => {
    const slug = getSlugFromPath(path)
    const { frontmatter, content } = splitFrontmatter(rawMarkdown)
    const wordCount = countWords(content)

    return {
      slug,
      title: frontmatter.title ?? slug,
      date: frontmatter.date ?? '1970-01-01',
      excerpt: frontmatter.excerpt ?? getExcerpt(content),
      tags: frontmatter.tags ?? [],
      published: frontmatter.published ?? true,
      publishAt: frontmatter.publishAt,
      updatedAt: blogMeta[slug]?.updatedAt,
      content,
      readingTimeMinutes: countReadingTimeMinutes(content),
      wordCount,
    }
  })
  .sort(sortByDateDesc)

export function getAllBlogPosts(): BlogPost[] {
  return blogPosts.filter(isPostVisible)
}

export function getBlogPostBySlug(slug: string, includeDrafts = false): BlogPost | undefined {
  return blogPosts.find((post) => {
    if (post.slug !== slug) {
      return false
    }

    return includeDrafts ? true : isPostVisible(post)
  })
}

export function getRelatedBlogPosts(post: BlogPost, limit = 3): BlogPost[] {
  const tagSet = new Set(post.tags.map((tag) => tag.toLowerCase()))

  return getAllBlogPosts()
    .filter((candidate) => candidate.slug !== post.slug)
    .map((candidate) => {
      let score = 0
      for (const tag of candidate.tags) {
        if (tagSet.has(tag.toLowerCase())) {
          score += 1
        }
      }

      return { candidate, score }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score
      }

      return new Date(b.candidate.date).getTime() - new Date(a.candidate.date).getTime()
    })
    .slice(0, limit)
    .map((entry) => entry.candidate)
}

export function getPrevNextPosts(slug: string): {
  previous?: BlogPost
  next?: BlogPost
} {
  const visible = getAllBlogPosts()
  const index = visible.findIndex((item) => item.slug === slug)
  if (index === -1) {
    return {}
  }

  return {
    previous: visible[index + 1],
    next: visible[index - 1],
  }
}
