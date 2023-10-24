import createRouter, { Route } from 'router5'
import { useRoute } from 'react-router5'
import browserPlugin from 'router5-plugin-browser'

import Home from './pages/Home'
import Session from './pages/Session'
import Account from './pages/Account'
import New from './pages/New'

import { FilestoreContextProvider } from './contexts/filestore'
import Files from './pages/Files'

// extend the base router5 route to add metadata and self rendering
export interface IApplicationRoute extends Route {
  render: () => JSX.Element,
  meta: Record<string, any>,
}

export const NOT_FOUND_ROUTE: IApplicationRoute = {
  name: 'notfound',
  path: '/notfound',
  meta: {
    title: 'Page Not Found',
  },
  render: () => <div>Page Not Found</div>,
}

const routes: IApplicationRoute[] = [{
  name: 'home',
  path: '/',
  meta: {
    title: 'Home',
  },
  render: () => (
    <Home />
  ),
}, {
  name: 'files',
  path: '/files',
  meta: {
    title: 'Files',
  },
  render: () => (
    <FilestoreContextProvider>
      <Files />
    </FilestoreContextProvider>
  ),
}, {
  name: 'new',
  path: '/new',
  meta: {
    title: 'New Session',
  },
  render: () => (
      <New />
  ),
}, {
  name: 'session',
  path: '/session/:session_id',
  meta: {
    title: 'Session',
  },
  render: () => (
      <Session />
  ),
}, {
  name: 'account',
  path: '/account',
  meta: {
    title: 'Account',
  },
  render: () => <Account />,
}, NOT_FOUND_ROUTE]

export const router = createRouter(routes, {
  defaultRoute: 'notfound',
  queryParamsMode: 'loose',
})

router.usePlugin(browserPlugin())
router.start()

export function useApplicationRoute(): IApplicationRoute {
  const { route } = useRoute()
  const fullRoute = routes.find(r => r.name == route?.name) || NOT_FOUND_ROUTE
  return fullRoute
}

export function RenderPage() {
  const route = useApplicationRoute()
  return route.render()
}

export default router