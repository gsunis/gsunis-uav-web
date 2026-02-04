import constantRoutes from '@/router/constant-router'
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory('/'),
  routes: constantRoutes,
  scrollBehavior: () => ({ left: 0, top: 0 })
})

export function resetRouter() {
  router.getRoutes().forEach((route) => {
    const { name } = route
    if (
      typeof name === 'string' &&
      ![
        'Login',
        'Airway',
        '404'
      ].includes(name)
    ) {
      router.hasRoute(name) && router.removeRoute(name)
    }
  })
}

export default router
