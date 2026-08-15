import { useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BLOG_RETURN_PATH_KEY, getBlogDestination, getBlogReturnPath } from './navigation'

function SiteLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'
  const isBlogIndex = location.pathname === '/blog'
  const isBlogPost = location.pathname.startsWith('/blog/')

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location.pathname])

  useEffect(() => {
    const nav = navigator as Navigator & {
      deviceMemory?: number
      connection?: { saveData?: boolean }
    }
    const lowPower =
      (nav.deviceMemory !== undefined && nav.deviceMemory <= 4) ||
      (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency <= 4) ||
      nav.connection?.saveData === true
    const coarseQuery = window.matchMedia('(pointer: coarse)')
    const narrowQuery = window.matchMedia('(max-width: 860px)')
    const updateAmbientMode = () => {
      const mobile = coarseQuery.matches || narrowQuery.matches
      document.documentElement.classList.toggle('static-ambient', mobile || lowPower)
    }

    updateAmbientMode()
    coarseQuery.addEventListener('change', updateAmbientMode)
    narrowQuery.addEventListener('change', updateAmbientMode)

    return () => {
      coarseQuery.removeEventListener('change', updateAmbientMode)
      narrowQuery.removeEventListener('change', updateAmbientMode)
      document.documentElement.classList.remove('static-ambient')
    }
  }, [])

  function handleHomeClick() {
    const returnPath = getBlogReturnPath(location.pathname)
    if (returnPath) {
      sessionStorage.setItem(BLOG_RETURN_PATH_KEY, returnPath)
    }
  }

  function handleBlogClick(e: React.MouseEvent) {
    if (!isHome) {
      sessionStorage.removeItem(BLOG_RETURN_PATH_KEY)
      return
    }

    const destination = getBlogDestination(
      location.pathname,
      sessionStorage.getItem(BLOG_RETURN_PATH_KEY),
    )
    if (destination === '/blog') {
      return
    }

    e.preventDefault()
    sessionStorage.removeItem(BLOG_RETURN_PATH_KEY)
    navigate(destination)
  }

  return (
    <main className="page-shell">
      <div className="ambient-bg" aria-hidden="true" />

      <header className="section top-nav reveal" aria-label="Primary navigation">
        <p className="eyebrow">anuragrai.cv</p>
        <nav>
          <Link
            to="/"
            className={isHome ? 'active' : undefined}
            onClick={handleHomeClick}
          >
            Home
          </Link>
          <Link
            to="/blog"
            className={isBlogIndex || isBlogPost ? 'active' : undefined}
            onClick={handleBlogClick}
          >
            Blog
          </Link>
        </nav>
      </header>

      <Outlet key={location.pathname} />
    </main>
  )
}

export default SiteLayout
