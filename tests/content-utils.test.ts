import { describe, expect, test } from 'bun:test'
import { getTableOfContents, normalizeHeadingText } from '../src/utils/headings'
import { createSlugger } from '../src/utils/slug'

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
})
