import { parseHomeDocument, type HomeDocument, type HomeSectionType } from './home-content'

const homeModules = import.meta.glob('/src/content/home/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

const documents = Object.entries(homeModules).map(([path, raw]) =>
  parseHomeDocument(raw, path),
)

function getSection(type: HomeSectionType): HomeDocument {
  const matches = documents.filter((document) => document.type === type)
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one home '${type}' document, found ${matches.length}`)
  }

  return matches[0]
}

export const homeContent = {
  hero: getSection('hero'),
  focus: getSection('focus'),
  reading: getSection('reading'),
  interests: getSection('interests'),
  roadmap: getSection('roadmap'),
  toolkit: getSection('toolkit'),
  contact: getSection('contact'),
}
