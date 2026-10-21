import { Home } from './pages/Home'
import { NotFound } from './pages/NotFound'

function currentPath(): string {
  if (typeof window === 'undefined') return '/'
  const path = window.location.pathname.replace(/\/+$/, '')
  return path === '' ? '/' : path
}

export default function App() {
  const path = currentPath()
  const isHome = path === '/' || path === '/index.html'

  return isHome ? <Home /> : <NotFound />
}
