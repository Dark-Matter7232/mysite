import { memo, useMemo, useState, useEffect } from 'react'
import type { ReactElement, ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import { createSlugger } from '../lib/slug'
import { normalizeHeadingText } from '../lib/headings'
import remarkGfm from 'remark-gfm'
import { ChevronRight } from 'lucide-react'

type BlogMarkdownProps = {
  content: string
}

type CodeMeta = {
  language: string
  isCollapsible: boolean
  title?: string
  code: string
}

type HeadingRendererProps = {
  children?: ReactNode
}

type ImageRendererProps = {
  src?: string
  alt?: string
  title?: string
}

type LinkRendererProps = {
  href?: string
  children?: ReactNode
}

type FigureNumberMap = Map<string, number>

type CarouselSlide = {
  src: string
  alt: string
  caption?: string
}

function resolveContentUrl(src: string): string {
  if (/^(?:[a-z]+:)?\/\//i.test(src) || src.startsWith('data:')) {
    return src
  }

  if (!src.startsWith('/')) {
    return src
  }

  const base = import.meta.env.BASE_URL ?? '/'
  const normalizedBase = base.endsWith('/') ? base : `${base}/`

  return `${normalizedBase}${src.replace(/^\/+/, '')}`
}

function toCodeText(children: ReactNode): string {
  if (typeof children === 'string') {
    return children
  }

  if (Array.isArray(children)) {
    return children.map((item) => (typeof item === 'string' ? item : '')).join('')
  }

  return ''
}

function extractPlainText(children: ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children)
  }

  if (Array.isArray(children)) {
    return children.map((child) => extractPlainText(child)).join('')
  }

  if (children && typeof children === 'object' && 'props' in children) {
    const element = children as ReactElement<{ children?: ReactNode }>
    return extractPlainText(element.props.children)
  }

  return ''
}

function parseTitleLine(code: string): { title?: string; code: string } {
  const lines = code.split('\n')
  const firstLine = lines[0]?.trim() ?? ''
  const titleMatch = firstLine.match(/^(?:\/\/|#|--)\s*@title:\s*(.+)$/)

  if (!titleMatch) {
    return { code }
  }

  return {
    title: titleMatch[1]?.trim(),
    code: lines.slice(1).join('\n').trimStart(),
  }
}

function extractCodeMeta(children: ReactNode): CodeMeta | null {
  if (!children) {
    return null
  }

  const firstChild = Array.isArray(children) ? children[0] : children
  if (!firstChild || typeof firstChild === 'string' || typeof firstChild === 'number') {
    return null
  }

  if (!('props' in firstChild)) {
    return null
  }

  const codeElement = firstChild as ReactElement<{ className?: string; children?: ReactNode }>
  if (codeElement.type !== 'code') {
    return null
  }

  const className = codeElement.props.className ?? ''
  const rawLanguage = className.replace('language-', '')
  const rawCode = toCodeText(codeElement.props.children).replace(/\n$/, '')

  const isCollapsible = rawLanguage === 'collapse' || rawLanguage.startsWith('collapse-')
  const language = isCollapsible ? rawLanguage.replace(/^collapse-?/, '') : rawLanguage
  const titleData = parseTitleLine(rawCode)

  return {
    language,
    isCollapsible,
    title: titleData.title,
    code: titleData.code,
  }
}

function highlightCode(code: string, language: string): string {
  function escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
  }

  const commandShell = language === 'bash' || language === 'sh' || language === 'zsh'
  const keywordSet = new Set([
    'const',
    'let',
    'var',
    'function',
    'return',
    'if',
    'else',
    'for',
    'while',
    'switch',
    'case',
    'break',
    'continue',
    'class',
    'import',
    'export',
    'from',
    'try',
    'catch',
    'finally',
    'new',
    'await',
    'async',
    'def',
    'fn',
    'struct',
    'enum',
    'impl',
  ])

  const tokenPattern =
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/.*$|#.*$|\b[a-zA-Z_]\w*\b|\b\d+(?:\.\d+)?\b)/gm

  return code
    .split('\n')
    .map((line) => {
      if (commandShell && line.trimStart().startsWith('$')) {
        return `<span class="tok-command">${escapeHtml(line)}</span>`
      }

      let result = ''
      let lastIndex = 0
      tokenPattern.lastIndex = 0

      for (const match of line.matchAll(tokenPattern)) {
        const matched = match[0]
        const index = match.index ?? 0

        result += escapeHtml(line.slice(lastIndex, index))

        if (
          matched.startsWith('"') ||
          matched.startsWith("'") ||
          matched.startsWith('`')
        ) {
          result += `<span class="tok-string">${escapeHtml(matched)}</span>`
        } else if (matched.startsWith('//') || matched.startsWith('#')) {
          result += `<span class="tok-comment">${escapeHtml(matched)}</span>`
        } else if (keywordSet.has(matched)) {
          result += `<span class="tok-keyword">${escapeHtml(matched)}</span>`
        } else if (/^\d+(?:\.\d+)?$/.test(matched)) {
          result += `<span class="tok-number">${escapeHtml(matched)}</span>`
        } else {
          result += escapeHtml(matched)
        }

        lastIndex = index + matched.length
      }

      result += escapeHtml(line.slice(lastIndex))
      return result
    })
    .join('\n')
}

function parseCarouselSlides(code: string): CarouselSlide[] {
  const slides: CarouselSlide[] = []

  for (const rawLine of code.split('\n')) {
    const line = rawLine.trim()
    if (!line) {
      continue
    }

    const [rawSrc = '', rawAlt = '', rawCaption = ''] = line.split('|').map((part) => part.trim())
    if (!rawSrc) {
      continue
    }

    slides.push({
      src: resolveContentUrl(rawSrc),
      alt: rawAlt || 'Carousel image',
      caption: rawCaption || undefined,
    })
  }

  return slides
}

function ImageCarousel({ title, slides }: { title?: string; slides: CarouselSlide[] }) {
  const [activeIndex, setActiveIndex] = useState(0)

  if (slides.length === 0) {
    return null
  }

  const activeSlide = slides[activeIndex]

  function showPrevious() {
    setActiveIndex((current) => (current - 1 + slides.length) % slides.length)
  }

  function showNext() {
    setActiveIndex((current) => (current + 1) % slides.length)
  }

  return (
    <figure className="blog-carousel">
      <div className="blog-carousel-frame">
        {slides.map((slide, index) => (
          <img
            key={`${slide.src}-${index}`}
            src={slide.src}
            alt={slide.alt}
            loading={index === 0 ? "eager" : "lazy"}
            className={index === activeIndex ? 'active' : ''}
          />
        ))}
      </div>
      <div className="blog-carousel-controls">
        <div className="blog-carousel-copy">
          {title ? <p className="blog-carousel-title">{title}</p> : null}
          {activeSlide.caption ? <p className="blog-carousel-caption">{activeSlide.caption}</p> : null}
        </div>
        <div className="blog-carousel-nav" aria-label="Carousel navigation">
          <button type="button" onClick={showPrevious} aria-label="Previous image">
            Prev
          </button>
          <span>
            {activeIndex + 1} / {slides.length}
          </span>
          <button type="button" onClick={showNext} aria-label="Next image">
            Next
          </button>
        </div>
      </div>
      <div className="blog-carousel-dots" aria-label="Choose carousel slide">
        {slides.map((slide, index) => (
          <button
            key={`${slide.src}-${index}`}
            type="button"
            className={index === activeIndex ? 'active' : undefined}
            onClick={() => setActiveIndex(index)}
            aria-label={`Show image ${index + 1}`}
            aria-pressed={index === activeIndex}
          />
        ))}
      </div>
    </figure>
  )
}

function CodeBlock({ meta, theme }: { meta: CodeMeta; theme: 'cool' | 'warm' }) {
  const [copied, setCopied] = useState(false)
  const highlighted = useMemo(() => highlightCode(meta.code, meta.language), [meta.code, meta.language])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!meta.isCollapsible) return
    const handler = ((e: CustomEvent) => setIsOpen(e.detail)) as EventListener
    window.addEventListener('toggle-all-code', handler)
    return () => window.removeEventListener('toggle-all-code', handler)
  }, [meta.isCollapsible])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(meta.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  const codeBlock = (
    <div className={`code-shell code-theme-${theme}`}>
      {meta.title && !meta.isCollapsible ? (
        <div className="code-block-title">{meta.title}</div>
      ) : null}
      <button type="button" className="code-copy-btn" onClick={handleCopy}>
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre>
        <code
          className={meta.language ? `language-${meta.language}` : undefined}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </pre>
    </div>
  )

  if (!meta.isCollapsible) {
    return codeBlock
  }

  return (
    <div className="code-collapse">
      <button 
        type="button"
        className="code-collapse-summary" 
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span>{meta.title ?? `Show ${meta.language || 'code'} block`}</span>
        <ChevronRight 
          size={16} 
          style={{ 
            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', 
            transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            marginLeft: 'auto',
            color: 'inherit'
          }} 
        />
      </button>
      <div className={`animated-collapse ${isOpen ? 'open' : ''}`}>
        <div className="animated-collapse-inner">
          {codeBlock}
        </div>
      </div>
    </div>
  )
}

function MarkdownPre({ children, theme }: { children?: ReactNode; theme: 'cool' | 'warm' }) {
  const meta = extractCodeMeta(children)

  if (!meta) {
    return <pre>{children}</pre>
  }

  if (meta.language === 'carousel') {
    return <ImageCarousel title={meta.title} slides={parseCarouselSlides(meta.code)} />
  }

  return <CodeBlock meta={meta} theme={theme} />
}

function getCalloutLabel(text: string): string | null {
  const match = text.match(/^\s*\[!(NOTE|TIP|WARNING|INFO)\]\s*/i)
  if (!match) {
    return null
  }

  return match[1].toUpperCase()
}

function buildFigureNumberMap(markdown: string): FigureNumberMap {
  const map: FigureNumberMap = new Map()
  const regex = /!\[([^\]]*)\]\((\S+)(?:\s+"([^"]+)")?\)/g
  let index = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(markdown)) !== null) {
    const alt = (match[1] ?? '').trim()
    const src = (match[2] ?? '').trim()
    const title = (match[3] ?? '').trim()
    if (!title || !src) {
      continue
    }

    index += 1
    map.set(`${src}||${alt}||${title}`, index)
  }

  return map
}

function BlogMarkdown({ content }: BlogMarkdownProps) {
  const headingSlugger = createSlugger()
  const figureNumbers = useMemo(() => buildFigureNumberMap(content), [content])

  function renderHeading(level: 2 | 3 | 4 | 5 | 6, props: HeadingRendererProps) {
    const rawText = extractPlainText(props.children).trim()
    const normalizedText = normalizeHeadingText(rawText)
    const id = headingSlugger.slug(normalizedText || rawText)

    const HeadingTag = `h${level}` as const

    return (
      <HeadingTag id={id} className={`blog-heading blog-heading-level-${level}`}>
        <a href={`#${id}`} className="blog-heading-link" aria-label={`Link to ${rawText}`}>
          #
        </a>
        {props.children}
      </HeadingTag>
    )
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h2: (props) => renderHeading(2, props),
        h3: (props) => renderHeading(3, props),
        h4: (props) => renderHeading(4, props),
        h5: (props) => renderHeading(5, props),
        h6: (props) => renderHeading(6, props),
        pre: ({ children }) => <MarkdownPre children={children} theme="cool" />,
        a: ({ href, children }: LinkRendererProps) => {
          const link = href ?? '#'
          const isExternal = /^https?:\/\//i.test(link)
          if (!isExternal) {
            return <a href={link}>{children}</a>
          }

          return (
            <a href={link} target="_blank" rel="noreferrer noopener">
              {children} <span className="ext-link-icon" aria-hidden="true">↗</span>
            </a>
          )
        },
        blockquote: ({ children }) => {
          const text = extractPlainText(children)
          const label = getCalloutLabel(text)

          if (!label) {
            return <blockquote>{children}</blockquote>
          }

          const cleaned = text.replace(/^\s*\[!(NOTE|TIP|WARNING|INFO)\]\s*/i, '').trim()
          return (
            <aside className={`callout callout-${label.toLowerCase()}`}>
              <p className="callout-label">{label}</p>
              <p>{cleaned}</p>
            </aside>
          )
        },
        img: ({ src, alt, title }: ImageRendererProps) => {
          if (!src) {
            return null
          }

          const resolvedSrc = resolveContentUrl(src)
          const normalizedAlt = (alt ?? '').trim()
          const caption = title?.trim()
          const key = `${src.trim()}||${normalizedAlt}||${caption ?? ''}`
          const number = caption ? figureNumbers.get(key) : undefined

          if (!caption) {
            return <img src={resolvedSrc} alt={alt ?? ''} loading="lazy" />
          }

          return (
            <figure>
              <img src={resolvedSrc} alt={alt ?? ''} loading="lazy" />
              <figcaption>
                Figure {number ?? '?'}: {caption}
              </figcaption>
            </figure>
          )
        },
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

export default memo(BlogMarkdown)
