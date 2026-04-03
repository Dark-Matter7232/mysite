import { ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import BlogMarkdown from '../components/BlogMarkdown'
import { getBlogPostBySlug, getPrevNextPosts, getRelatedBlogPosts } from '../lib/blog'

type TocItem = {
  id: string
  text: string
  level: 2 | 3
}

type TocGroup = {
  heading: TocItem
  children: TocItem[]
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function isSameCalendarDate(a: string, b: string): boolean {
  const dateA = new Date(a)
  const dateB = new Date(b)

  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  )
}

function groupTocItems(items: TocItem[]): TocGroup[] {
  const groups: TocGroup[] = []

  for (const item of items) {
    if (item.level === 2 || groups.length === 0) {
      groups.push({
        heading: item,
        children: [],
      })
      continue
    }

    groups.at(-1)?.children.push(item)
  }

  return groups
}

function TocGroup({ group, activeChevron, setActiveChevron, scrollToHeading }: any) {
  const [isOpen, setIsOpen] = useState(false)

  if (group.children.length === 0) {
    return (
      <li>
        <a
          href={`#${group.heading.id}`}
          onClick={(e) => {
            e.preventDefault()
            scrollToHeading(group.heading.id)
          }}
        >
          {group.heading.text}
        </a>
      </li>
    )
  }

  return (
    <li>
      <div className="toc-details">
        <div 
          className="toc-summary"
          onClick={() => {
            setActiveChevron({ id: group.heading.id, startY: window.scrollY })
            setIsOpen(!isOpen)
          }}
        >
          <a
            href={`#${group.heading.id}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              scrollToHeading(group.heading.id);
            }}
          >
            {group.heading.text}
          </a>
          <span 
            className={`toc-toggle ${activeChevron?.id === group.heading.id || isOpen ? 'active' : ''}`}
            aria-expanded={isOpen}
          >
            <ChevronRight 
              className="toc-icon" 
              size={16} 
              style={{ 
                transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', 
                transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' 
              }} 
            />
          </span>
        </div>
        <div className={`animated-collapse ${isOpen ? 'open' : ''}`}>
          <div className="animated-collapse-inner">
            <ul>
              {group.children.map((item: any) => (
                <li key={item.id} className="toc-sub">
                  <a
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault()
                      scrollToHeading(item.id)
                    }}
                  >
                    {item.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </li>
  )
}

function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const wantsPreview = searchParams.get('preview') === '1'
  const isLocalHost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '::1')
  const allowDraftPreview = wantsPreview && isLocalHost
  const post = slug ? getBlogPostBySlug(slug, allowDraftPreview) : undefined
  const [readingProgress, setReadingProgress] = useState(0)
  const [tocItems, setTocItems] = useState<TocItem[]>([])
  const [codeState, setCodeState] = useState<'expanded' | 'collapsed' | null>(null)
  const [activeChevron, setActiveChevron] = useState<{ id: string, startY: number } | null>(null)

  const relatedPosts = useMemo(() => (post ? getRelatedBlogPosts(post, 3) : []), [post])
  const prevNext = useMemo(() => (post ? getPrevNextPosts(post.slug) : {}), [post])
  const tocGroups = useMemo(() => groupTocItems(tocItems), [tocItems])

  function scrollToHeading(id: string) {
    const target = document.getElementById(id)

    if (!target) {
      return
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.history.replaceState(null, '', `#${id}`)
  }

  useEffect(() => {
    function updateProgress() {
      const scrollTop = window.scrollY
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      if (maxScroll <= 0) {
        setReadingProgress(0)
        return
      }

      const next = Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100))
      setReadingProgress(next)
    }

    updateProgress()
    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress)
    return () => {
      window.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', updateProgress)
    }
  }, [post?.slug])

  function setAllCodeBlocks(open: boolean) {
    const event = new CustomEvent('toggle-all-code', { detail: open })
    window.dispatchEvent(event)
    setCodeState(open ? 'expanded' : 'collapsed')
  }

  useEffect(() => {
    if (!activeChevron) return

    function handleScroll() {
      // Common mobile/web UI guide suggests ~80px distance is enough
      // to determine a deliberate scroll vs an accidental jitter after tap.
      if (Math.abs(window.scrollY - activeChevron!.startY) > 80) {
        setActiveChevron(null)
      }
    }

    // Passive listener for smooth scrolling performance
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [activeChevron])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const headingElements = Array.from(
        document.querySelectorAll<HTMLElement>('.blog-prose h2[id], .blog-prose h3[id]'),
      )

      const next = headingElements
        .map((element) => {
          const level = Number(element.tagName.slice(1))
          if (level !== 2 && level !== 3) {
            return null
          }

          return {
            id: element.id,
            text: (element.textContent ?? '').replace(/^#\s*/, '').trim(),
            level,
          } as TocItem
        })
        .filter((item): item is TocItem => Boolean(item && item.id && item.text))

      setTocItems(next)
    })

    return () => cancelAnimationFrame(frame)
  }, [post])

  if (!post) {
    return (
      <section className="section reveal">
        <div className="section-head">
          <h1>Post Not Found</h1>
          <p>This blog post does not exist or is not published.</p>
        </div>
        <Link className="ghost-link" to="/blog">
          Back to blog index
        </Link>
      </section>
    )
  }
  const currentUrl = `https://anuragrai.cv/blog/${post.slug}`

  useEffect(() => {
    document.title = `${post.title} | Anurag Rai`
    document.querySelector('meta[name="description"]')?.setAttribute('content', post.excerpt)
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', currentUrl)
  }, [post, currentUrl])
  return (
    <article className="section reveal blog-post-shell readable-section">
      <div
        className="reading-progress"
        role="progressbar"
        aria-label="Reading progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(readingProgress)}
      >
        <span style={{ width: `${readingProgress}%` }} />
      </div>

      <p className="blog-back-link">
        <Link to="/blog">Back to all posts</Link>
      </p>

      <header className="blog-post-header">
        <h1>{post.title}</h1>
        <p className="blog-meta">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span>{post.readingTimeMinutes} min read</span>
          <span>{post.wordCount} words</span>
          {post.updatedAt && !isSameCalendarDate(post.updatedAt, post.date) && (
            <span>
              Updated {formatDate(post.updatedAt)}
            </span>
          )}
        </p>
        {post.tags.length > 0 && (
          <ul className="tag-row" aria-label={`Tags for ${post.title}`}>
            {post.tags.map((tag) => (
              <li key={tag}>
                <Link to={`/blog?tag=${encodeURIComponent(tag)}`}>{tag}</Link>
              </li>
            ))}
          </ul>
        )}

      </header>

      {tocGroups.length > 1 && (
        <aside className="blog-toc" aria-label="Table of contents">
          <p>Contents</p>
          <div className="toc-actions">
            <button 
              type="button" 
              className={codeState === 'expanded' ? 'active' : ''}
              onClick={() => setAllCodeBlocks(true)}
            >
              Expand all code
            </button>
            <button 
              type="button" 
              className={codeState === 'collapsed' ? 'active' : ''}
              onClick={() => setAllCodeBlocks(false)}
            >
              Collapse all code
            </button>
          </div>
          <ol>
            {tocGroups.map((group) => (
              <TocGroup 
                key={group.heading.id} 
                group={group} 
                activeChevron={activeChevron} 
                setActiveChevron={setActiveChevron} 
                scrollToHeading={scrollToHeading} 
              />
            ))}
          </ol>
        </aside>
      )}

      <div className="blog-prose">
        <BlogMarkdown content={post.content} />
      </div>

      {relatedPosts.length > 0 && (
        <section className="related-posts" aria-label="Related posts">
          <h2>Related Posts</h2>
          <ul>
            {relatedPosts.map((related) => (
              <li key={related.slug}>
                <Link to={`/blog/${related.slug}`}>{related.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(prevNext.previous || prevNext.next) && (
        <nav className="post-nav" aria-label="Post navigation">
          <div>
            {prevNext.previous && (
              <Link className="post-nav-btn" to={`/blog/${prevNext.previous.slug}`}>
                Previous Post
              </Link>
            )}
          </div>
          <div>
            {prevNext.next && (
              <Link className="post-nav-btn" to={`/blog/${prevNext.next.slug}`}>
                Next Post
              </Link>
            )}
          </div>
        </nav>
      )}
    </article>
  )
}

export default BlogPostPage
