import { readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

type Frontmatter = {
  title?: string
  date?: string
  excerpt?: string
  tags?: string[]
  published?: boolean
  publishAt?: string
}

type RssItem = {
  slug: string
  title: string
  date: string
  excerpt: string
  content: string
  published: boolean
  publishAt?: string
}

const BLOG_DIR = resolve('src/content/blog')
const RSS_PATH = resolve('public/rss.xml')
const SITE_URL = 'https://anuragrai.cv'

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function parseValue(value: string): string | boolean | string[] {
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

function parseFrontmatter(raw: string): Frontmatter {
  const frontmatter: Frontmatter = {}
  const lines = raw.split('\n')

  for (const line of lines) {
    const separator = line.indexOf(':')
    if (separator === -1) {
      continue
    }

    const key = line.slice(0, separator).trim()
    const value = line.slice(separator + 1).trim()
    if (!value) {
      continue
    }

    const parsed = parseValue(value)
    if (key === 'title' && typeof parsed === 'string') {
      frontmatter.title = parsed
    }
    if (key === 'date' && typeof parsed === 'string') {
      frontmatter.date = parsed
    }
    if (key === 'excerpt' && typeof parsed === 'string') {
      frontmatter.excerpt = parsed
    }
    if (key === 'tags' && Array.isArray(parsed)) {
      frontmatter.tags = parsed
    }
    if (key === 'published' && typeof parsed === 'boolean') {
      frontmatter.published = parsed
    }
    if (key === 'publishAt' && typeof parsed === 'string') {
      frontmatter.publishAt = parsed
    }
  }

  return frontmatter
}

function splitFrontmatter(markdown: string): { frontmatter: Frontmatter; content: string } {
  const normalized = markdown.replace(/\r\n/g, '\n').trim()
  if (!normalized.startsWith('---\n')) {
    return { frontmatter: {}, content: normalized }
  }

  const end = normalized.indexOf('\n---\n', 4)
  if (end === -1) {
    return { frontmatter: {}, content: normalized }
  }

  return {
    frontmatter: parseFrontmatter(normalized.slice(4, end)),
    content: normalized.slice(end + 5).trim(),
  }
}

function getExcerpt(content: string): string {
  const paragraph = content.split('\n\n').find((segment) => segment.trim()) ?? ''
  return paragraph.replace(/\s+/g, ' ').replace(/[#>*`]/g, '').trim().slice(0, 180)
}

function isVisible(item: RssItem): boolean {
  if (!item.published) {
    return false
  }
  if (!item.publishAt) {
    return true
  }
  const timestamp = new Date(item.publishAt).getTime()
  if (Number.isNaN(timestamp)) {
    return true
  }
  return Date.now() >= timestamp
}

async function main() {
  const entries = await readdir(BLOG_DIR, { withFileTypes: true })
  const markdownFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
  const posts: RssItem[] = []

  for (const file of markdownFiles) {
    const fullPath = resolve(BLOG_DIR, file.name)
    const slug = file.name.replace(/\.md$/, '')
    const raw = await readFile(fullPath, 'utf8')
    const { frontmatter, content } = splitFrontmatter(raw)

    posts.push({
      slug,
      title: frontmatter.title ?? slug,
      date: frontmatter.date ?? '1970-01-01',
      excerpt: frontmatter.excerpt ?? getExcerpt(content),
      content,
      published: frontmatter.published ?? true,
      publishAt: frontmatter.publishAt,
    })
  }

  const visiblePosts = posts
    .filter(isVisible)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const itemsXml = visiblePosts
    .map((post) => {
      const link = `${SITE_URL}/blog/${post.slug}`
      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <guid>${link}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <description>${escapeXml(post.excerpt)}</description>
    </item>`
    })
    .join('\n')

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Anurag Rai Blog</title>
    <link>${SITE_URL}/blog</link>
    <description>Technical notes on systems, full stack engineering, and performance work.</description>
    <language>en-us</language>${itemsXml}
  </channel>
</rss>
`

  await writeFile(RSS_PATH, rss, 'utf8')
  console.log(`Generated ${RSS_PATH}`)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
})
