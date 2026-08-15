import { describe, expect, test } from 'bun:test'
import { getTableOfContents, normalizeHeadingText } from '../src/utils/headings'
import { createSlugger } from '../src/utils/slug'
import { parseHomeDocument } from '../src/features/home/data/home-content'
import { parseFrontmatterDocument } from '../src/utils/frontmatter'

describe('content utilities', () => {
  test('normalizes heading formatting before creating anchor text', () => {
    expect(normalizeHeadingText('  **Build** with [`Bun`](https://bun.sh)  ')).toBe('Build with Bun')
  })

  test('creates stable unique slugs for duplicate headings', () => {
    const slugger = createSlugger()

    expect(slugger.slug('Performance Tips')).toBe('performance-tips')
    expect(slugger.slug('Performance Tips')).toBe('performance-tips-1')
    expect(slugger.slug('')).toBe('section')
  })

  test('extracts only level two and three headings outside code fences', () => {
    const markdown = [
      '# Page title',
      '## First section',
      '```ts',
      '## Not a heading',
      '```',
      '### Nested section',
      '#### Detail',
    ].join('\n')

    expect(getTableOfContents(markdown)).toEqual([
      { level: 2, text: 'First section', id: 'first-section' },
      { level: 3, text: 'Nested section', id: 'nested-section' },
    ])
  })

  test('parses a home section from Markdown without JSX content', () => {
    const document = parseHomeDocument(`---
type: toolkit
title: Toolkit
description: Current setup
---
- Editors | VS Code
- Shells | zsh
`, 'toolkit.md')

    expect(document.toolkitItems).toEqual([
      { label: 'Editors', value: 'VS Code' },
      { label: 'Shells', value: 'zsh' },
    ])
  })

  test('parses shared frontmatter strings and string arrays', () => {
    expect(parseFrontmatterDocument(`---
title: Blog
tags: ["one", "two"]
---
Body`).data).toEqual({
      title: 'Blog',
      tags: ['one', 'two'],
    })
  })

  test('accepts frontmatter-only documents', () => {
    expect(parseFrontmatterDocument(`---
title: Blog
---`).content).toBe('')
  })
})
