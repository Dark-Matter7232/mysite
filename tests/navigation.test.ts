import { describe, expect, test } from 'bun:test'
import {
  getBlogDestination,
  getBlogReturnPath,
} from '../src/components/layout/navigation'

describe('blog navigation', () => {
  test('remembers only an opened blog post', () => {
    expect(getBlogReturnPath('/blog/my-post')).toBe('/blog/my-post')
    expect(getBlogReturnPath('/blog')).toBeNull()
    expect(getBlogReturnPath('/')).toBeNull()
  })

  test('returns to the opened post once after going home', () => {
    const openedPost = getBlogReturnPath('/blog/my-post')

    expect(getBlogDestination('/', openedPost)).toBe('/blog/my-post')
    expect(getBlogDestination('/blog/my-post', null)).toBe('/blog')
  })

  test('opens the blog index when there is no return post', () => {
    expect(getBlogDestination('/', null)).toBe('/blog')
    expect(getBlogDestination('/blog', '/blog/my-post')).toBe('/blog')
    expect(getBlogDestination('/', '/external-site')).toBe('/blog')
  })
})
