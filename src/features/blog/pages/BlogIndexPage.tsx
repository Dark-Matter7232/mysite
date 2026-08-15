import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getAllBlogPosts } from '../utils/blog'
import { formatDate } from '../../../utils/date'
import { blogIndexContent } from '../data/blog-index'

const POSTS_PER_PAGE = 4

function BlogIndexPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const posts = getAllBlogPosts()
  const selectedTag = searchParams.get('tag') ?? 'all'
  const currentPageParam = Number(searchParams.get('page') ?? '1')
  const currentPage = Number.isFinite(currentPageParam) && currentPageParam > 0 ? currentPageParam : 1

  const allTags = Array.from(new Set(posts.flatMap((post) => post.tags))).sort((a, b) =>
    a.localeCompare(b),
  )

  const filteredPosts =
    selectedTag === 'all' ? posts : posts.filter((post) => post.tags.includes(selectedTag))
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * POSTS_PER_PAGE
  const visiblePosts = filteredPosts.slice(startIndex, startIndex + POSTS_PER_PAGE)

  useEffect(() => {
    document.title = `${blogIndexContent.title} | Anurag Rai`
    const desc = blogIndexContent.description
    document.querySelector('meta[name="description"]')?.setAttribute('content', desc)
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', 'https://anuragrai.cv/blog')
  }, [])

  function updateParams(next: { tag?: string; page?: number }) {
    const nextTag = next.tag ?? selectedTag
    const nextPage = next.page ?? safePage
    const params = new URLSearchParams()

    if (nextTag !== 'all') {
      params.set('tag', nextTag)
    }
    if (nextPage > 1) {
      params.set('page', String(nextPage))
    }

    setSearchParams(params, { replace: true })
  }

  return (
    <section className="section reveal">
      <div className="section-head">
        <h1>{blogIndexContent.title}</h1>
        <p>{blogIndexContent.description} {blogIndexContent.sourceNote}</p>
      </div>

      {posts.length === 0 ? (
        <p className="empty-state">{blogIndexContent.emptyPostsLabel}</p>
      ) : (
        <>
          <div className="blog-controls" aria-label={blogIndexContent.controlsAriaLabel}>
            <p>{blogIndexContent.filterLabel}</p>
            <div className="filter-chip-row">
              <button
                type="button"
                className={selectedTag === 'all' ? 'active' : undefined}
                onClick={() => updateParams({ tag: 'all', page: 1 })}
              >
                All
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={selectedTag === tag ? 'active' : undefined}
                  onClick={() => updateParams({ tag, page: 1 })}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {visiblePosts.length === 0 ? (
            <p className="empty-state">{blogIndexContent.emptyFilterLabel}</p>
          ) : (
            <ul className="blog-list" aria-label={blogIndexContent.postsAriaLabel}>
              {visiblePosts.map((post) => (
                <li key={post.slug} className="blog-list-item">
                  <article>
                    <p className="blog-meta">
                      <time dateTime={post.date}>{formatDate(post.date, 'short')}</time>
                      <span>{post.readingTimeMinutes} min read</span>
                    </p>
                    <h2>
                      <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                    </h2>
                    <p>{post.excerpt}</p>
                    {post.tags.length > 0 && (
                      <ul className="tag-row" aria-label={`Tags for ${post.title}`}>
                        {post.tags.map((tag) => (
                          <li key={tag}>
                            <button
                              type="button"
                              onClick={() => updateParams({ tag, page: 1 })}
                            >
                              {tag}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                </li>
              ))}
            </ul>
          )}

          <div className="pagination-row" aria-label={blogIndexContent.paginationAriaLabel}>
            <button
              type="button"
              onClick={() => updateParams({ page: safePage - 1 })}
              disabled={safePage <= 1}
            >
              {blogIndexContent.previousLabel}
            </button>
            <p>
              {blogIndexContent.pageLabel} {safePage} of {totalPages}
            </p>
            <button
              type="button"
              onClick={() => updateParams({ page: safePage + 1 })}
              disabled={safePage >= totalPages}
            >
              {blogIndexContent.nextLabel}
            </button>
          </div>
        </>
      )}
    </section>
  )
}

export default BlogIndexPage
