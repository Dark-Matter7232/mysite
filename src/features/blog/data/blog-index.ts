import {
  parseFrontmatterDocument,
  type FrontmatterData,
} from '../../../utils/frontmatter'

export type BlogIndexContent = {
  title: string
  description: string
  sourceNote: string
  filterLabel: string
  emptyPostsLabel: string
  emptyFilterLabel: string
  postsAriaLabel: string
  controlsAriaLabel: string
  paginationAriaLabel: string
  previousLabel: string
  nextLabel: string
  pageLabel: string
}

function requiredString(data: FrontmatterData, key: string): string {
  const value = data[key]
  if (typeof value !== 'string' || !value) {
    throw new Error(`Blog index content requires a non-empty '${key}' field`)
  }

  return value
}

function parseBlogIndexContent(raw: string): BlogIndexContent {
  const { data } = parseFrontmatterDocument(raw)

  return {
    title: requiredString(data, 'title'),
    description: requiredString(data, 'description'),
    sourceNote: requiredString(data, 'sourceNote'),
    filterLabel: requiredString(data, 'filterLabel'),
    emptyPostsLabel: requiredString(data, 'emptyPostsLabel'),
    emptyFilterLabel: requiredString(data, 'emptyFilterLabel'),
    postsAriaLabel: requiredString(data, 'postsAriaLabel'),
    controlsAriaLabel: requiredString(data, 'controlsAriaLabel'),
    paginationAriaLabel: requiredString(data, 'paginationAriaLabel'),
    previousLabel: requiredString(data, 'previousLabel'),
    nextLabel: requiredString(data, 'nextLabel'),
    pageLabel: requiredString(data, 'pageLabel'),
  }
}

const modules = import.meta.glob('/src/content/blog/index.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

const source = Object.values(modules)[0]
if (!source) {
  throw new Error('Missing src/content/blog/index.md')
}

export const blogIndexContent = parseBlogIndexContent(source)
