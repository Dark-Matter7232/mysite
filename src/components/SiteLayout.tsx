import { Outlet, useLocation, useNavigate } from 'react-router-dom'

const BLOG_RETURN_PATH_KEY = 'blogReturnPath'

function SiteLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'
  const isBlogIndex = location.pathname === '/blog'
  const isBlogPost = location.pathname.startsWith('/blog/')

  function handleHomeClick(e: React.MouseEvent) {
    if (isBlogPost) {
      sessionStorage.setItem(BLOG_RETURN_PATH_KEY, location.pathname)
    }

    e.preventDefault()
    navigate('/')
  }

  function handleBlogClick(e: React.MouseEvent) {
    e.preventDefault()
    if (isBlogPost) {
      sessionStorage.removeItem(BLOG_RETURN_PATH_KEY)
      navigate('/blog')
      return
    }

    const returnPath = sessionStorage.getItem(BLOG_RETURN_PATH_KEY)
    if (isHome && returnPath) {
      sessionStorage.removeItem(BLOG_RETURN_PATH_KEY)
      navigate(returnPath)
      return
    }

    navigate('/blog')
  }

  return (
    <main className="page-shell">
      <div className="ambient-bg" aria-hidden="true" />

      <header className="section top-nav reveal" aria-label="Primary navigation">
        <p className="eyebrow">anuragrai.cv</p>
        <nav>
          <a
            href="/"
            className={isHome ? 'active' : undefined}
            onClick={handleHomeClick}
          >
            Home
          </a>
          <a
            href="/blog"
            className={isBlogIndex || isBlogPost ? 'active' : undefined}
            onClick={handleBlogClick}
          >
            Blog
          </a>
        </nav>
      </header>

      <Outlet key={location.pathname} />
    </main>
  )
}

export default SiteLayout
