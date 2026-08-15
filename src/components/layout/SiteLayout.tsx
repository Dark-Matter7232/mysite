import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

const BLOG_RETURN_PATH_KEY = 'blogReturnPath'

function SiteLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'
  const isBlogIndex = location.pathname === '/blog'
  const isBlogPost = location.pathname.startsWith('/blog/')

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
