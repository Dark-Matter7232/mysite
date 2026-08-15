export const BLOG_RETURN_PATH_KEY = 'blogReturnPath'

export function getBlogReturnPath(pathname: string): string | null {
  return pathname.startsWith('/blog/') ? pathname : null
}

export function getBlogDestination(pathname: string, returnPath: string | null): string {
  if (pathname === '/' && returnPath?.startsWith('/blog/')) {
    return returnPath
  }

  return '/blog'
}
