import { HomePage } from './pages/HomePage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'
import { TripPage } from './pages/TripPage.tsx'
import { matchRoute, useLocation } from './lib/router.ts'

export default function App() {
  const url = useLocation()
  const route = matchRoute(url.pathname)

  switch (route.name) {
    case 'home':
      return <HomePage />
    case 'trip':
      return <TripPage key={route.slug} slug={route.slug} />
    default:
      return <NotFoundPage />
  }
}
