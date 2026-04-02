import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { blogMeta } from '../src/content/blog.meta.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const toAbsolute = (p: string) => path.resolve(__dirname, '..', p)

const template = await fs.readFile(toAbsolute('dist/static/index.html'), 'utf-8')
const { render } = await import(toAbsolute('dist/server/entry-server.js'))

const routesToPrerender = [
  '/',
  '/blog',
  ...Object.keys(blogMeta).map((slug) => `/blog/${slug}`)
]

for (const url of routesToPrerender) {
  const appHtml = render(url)
  const html = template.replace(`<!--app-html-->`, appHtml)

  const filePath = `dist/static${url === '/' ? '/index' : url}.html`
  const resolvedFilePath = toAbsolute(filePath)
  
  await fs.mkdir(path.dirname(resolvedFilePath), { recursive: true })
  await fs.writeFile(resolvedFilePath, html)
  console.log('Pre-rendered:', filePath)
}
