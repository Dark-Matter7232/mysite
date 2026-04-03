import SiteLayout from './components/layout/SiteLayout'
import './App.css'
import BlogIndexPage from './features/blog/pages/BlogIndexPage'
import BlogPostPage from './features/blog/pages/BlogPostPage'
import HomePage from './features/home/pages/HomePage'
import { Navigate, Route, Routes } from 'react-router-dom'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="blog" element={<BlogIndexPage />} />
        <Route path="blog/:slug" element={<BlogPostPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
