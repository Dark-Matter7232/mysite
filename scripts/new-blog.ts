import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

type CliOptions = {
  title: string
  slug?: string
  excerpt?: string
  tags?: string
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {}

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    const next = argv[i + 1]

    if (arg === '--title' && next) {
      options.title = next
      i += 1
      continue
    }

    if (arg === '--slug' && next) {
      options.slug = next
      i += 1
      continue
    }

    if (arg === '--excerpt' && next) {
      options.excerpt = next
      i += 1
      continue
    }

    if (arg === '--tags' && next) {
      options.tags = next
      i += 1
      continue
    }
  }

  if (!options.title) {
    throw new Error(
      'Missing --title. Usage: bun run blog:new --title "Post title" [--slug my-slug] [--excerpt "Summary"] [--tags "tag1,tag2"]',
    )
  }

  return options as CliOptions
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const date = new Date().toISOString().slice(0, 10)
  const slug = options.slug ? slugify(options.slug) : slugify(options.title)

  if (!slug) {
    throw new Error('Could not derive a valid slug. Provide --slug with letters/numbers.')
  }

  const templatePath = resolve('scripts/templates/blog-post.md')
  const targetPath = resolve(`src/content/blog/${slug}.md`)

  if (existsSync(targetPath)) {
    throw new Error(`Post already exists: ${targetPath}`)
  }

  const rawTemplate = await readFile(templatePath, 'utf8')
  const filled = rawTemplate
    .replaceAll('{{TITLE}}', options.title)
    .replaceAll('{{DATE}}', date)
    .replaceAll('{{EXCERPT}}', options.excerpt ?? 'Write a one-line summary of this post.')
    .replaceAll('{{TAGS}}', options.tags ?? 'engineering, notes')

  await mkdir(dirname(targetPath), { recursive: true })
  await writeFile(targetPath, filled, 'utf8')

  console.log(`Created ${targetPath}`)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
})
