const constantRoutes: any = [
  {
    path: '/',
    name: 'Login',
    component: () => import('@/views/Login/Login.vue')
  },
  {
    path: '/airway',
    name: 'Airway',
    component: () => import('@/layouts/BaseLayout.vue'),
    children: [
      {
        path: '/airway/index',
        name: 'AirwayIndex',
        component: () => import('@/views/Airway/index.vue'),
        meta: {
          id: 101,
          close: true,
          hidden: false,
          title: 'airway',
          keepAlive: true,
          icon: 'icon-menu'
        }
      }
    ]
  },
  {
    path: '/404',
    name: '404',
    component: () => import('@/views/404.vue')
  },
  {
    path: '/:pathMatch(.*)',
    component: () => import('@/views/404.vue')
  }
]

export default constantRoutes
