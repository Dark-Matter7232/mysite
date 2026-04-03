import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { blogMeta } from '../src/content/blog.meta.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const toAbsolute = (p: string) => path.resolve(__dirname, '..', p)

const template = await fs.readFile(toAbsolute('dist/static/index.html'), 'utf-8')
const { render, getBlogPostBySlug } = await import(toAbsolute('dist/server/entry-server.js'))

const routesToPrerender = [
  '/',
  '/blog',
  ...Object.keys(blogMeta).map((slug) => `/blog/${slug}`)
]

for (const url of routesToPrerender) {
  const appHtml = render(url)
  let html = template.replace(`<!--app-html-->`, appHtml)

  const isPost = url.startsWith('/blog/') && url !== '/blog'
  const slug = isPost ? url.replace('/blog/', '') : null
  const postMeta = slug ? getBlogPostBySlug(slug, true) : null

  if (postMeta) {
    const title = `${postMeta.title} | Anurag Rai`
    const desc = postMeta.excerpt || "A portfolio tracking Anurag Rai's full stack journey from a systems-first mindset."
    const canonical = `https://anuragrai.cv${url}`
    const publishedIso = new Date(postMeta.date).toISOString()

    // Structured Data for Article
    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": postMeta.title,
      "description": desc,
      "datePublished": publishedIso,
      "author": {
        "@type": "Person",
        "name": "Anurag Rai",
        "url": "https://anuragrai.cv/"
      }
    }

    html = html
      .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
      .replace(/content="Anurag Rai's portfolio documenting[^"]*"/, `content="${desc}"`)
      .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${title}" />`)
      .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${desc}" />`)
      .replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${title}" />`)
      .replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${desc}" />`)
      .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${canonical}" />`)
      .replace(/<\/head>/, `<script type="application/ld+json">\n${JSON.stringify(articleSchema)}\n</script>\n</head>`)
  }

  const filePath = `dist/static${url === '/' ? '/index' : url}.html`
  const resolvedFilePath = toAbsolute(filePath)
  
  await fs.mkdir(path.dirname(resolvedFilePath), { recursive: true })
  await fs.writeFile(resolvedFilePath, html)
  console.log('Pre-rendered:', filePath)
}
