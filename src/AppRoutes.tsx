import SiteLayout from './components/SiteLayout'
import './App.css'
import BlogIndexPage from './pages/BlogIndexPage'
import BlogPostPage from './pages/BlogPostPage'
import HomePage from './pages/HomePage'
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
