import { readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const BLOG_DIR = resolve('src/content/blog')
const SITEMAP_PATH = resolve('public/sitemap.xml')
const SITE_URL = 'https://anuragrai.cv'

function parseFrontmatter(raw: string): { published: boolean; publishAt?: string } {
  const text = raw.replace(/\r\n/g, '\n')
  if (!text.startsWith('---\n')) {
    return { published: true }
  }

  const end = text.indexOf('\n---\n', 4)
  if (end === -1) {
    return { published: true }
  }

  const block = text.slice(4, end)
  const lines = block.split('\n')
  let published = true
  let publishAt: string | undefined

  for (const line of lines) {
    const separator = line.indexOf(':')
    if (separator === -1) {
      continue
    }
    const key = line.slice(0, separator).trim()
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '')

    if (key === 'published') {
      published = value !== 'false'
    }
    if (key === 'publishAt' && value) {
      publishAt = value
    }
  }

  return { published, publishAt }
}

function isVisible(meta: { published: boolean; publishAt?: string }): boolean {
  if (!meta.published) {
    return false
  }
  if (!meta.publishAt) {
    return true
  }
  const publishTime = new Date(meta.publishAt).getTime()
  if (Number.isNaN(publishTime)) {
    return true
  }
  return Date.now() >= publishTime
}

async function main() {
  const entries = await readdir(BLOG_DIR, { withFileTypes: true })
  const posts: string[] = []

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) {
      continue
    }

    const fullPath = resolve(BLOG_DIR, entry.name)
    const raw = await readFile(fullPath, 'utf8')
    const meta = parseFrontmatter(raw)
    if (!isVisible(meta)) {
      continue
    }

    const slug = entry.name.replace(/\.md$/, '')
    posts.push(`${SITE_URL}/blog/${slug}`)
  }

  posts.sort()

  const postUrls = posts
    .map(
      (url) => `  <url>
    <loc>${url}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
    )
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE_URL}/blog</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
${postUrls}
</urlset>
`

  await writeFile(SITEMAP_PATH, xml, 'utf8')
  console.log(`Generated ${SITEMAP_PATH}`)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
})
