export type FrontmatterValue = string | string[]
export type FrontmatterData = Record<string, FrontmatterValue>

function parseValue(value: string): FrontmatterValue {
  const trimmed = value.trim()

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const parsed = JSON.parse(trimmed) as unknown
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
      throw new Error(`Expected a string array, received: ${trimmed}`)
    }

    return parsed
  }

  return trimmed.replace(/^['"]|['"]$/g, '')
}

export function parseFrontmatterDocument(raw: string): {
  data: FrontmatterData
  content: string
} {
  const normalized = raw.replace(/\r\n/g, '\n').trim()

  if (!normalized.startsWith('---\n')) {
    return { data: {}, content: normalized }
  }

  const delimiter = '\n---\n'
  const end = normalized.indexOf(delimiter, 4)
  if (end === -1) {
    throw new Error('Frontmatter is missing its closing delimiter')
  }

  const data: FrontmatterData = {}
  for (const line of normalized.slice(4, end).split('\n')) {
    const separator = line.indexOf(':')
    if (separator === -1) {
      throw new Error(`Invalid frontmatter line: ${line}`)
    }

    const key = line.slice(0, separator).trim()
    const value = line.slice(separator + 1).trim()
    if (!key || !value) {
      throw new Error(`Invalid frontmatter line: ${line}`)
    }

    data[key] = parseValue(value)
  }

  return {
    data,
    content: normalized.slice(end + delimiter.length).trim(),
  }
}
