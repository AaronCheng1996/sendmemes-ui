import { createRouter, createWebHistory } from 'vue-router'

import { ADMIN_KEY_SESSION } from '../composables/useConnection'
import ActivityPage from '../views/ActivityPage.vue'
import AlbumsPage from '../views/AlbumsPage.vue'
import ConnectionPage from '../views/ConnectionPage.vue'
import ImagesPage from '../views/ImagesPage.vue'
import LoginPage from '../views/LoginPage.vue'
import SchedulePage from '../views/SchedulePage.vue'

function readLoggedIn(): boolean {
  return Boolean(sessionStorage.getItem(ADMIN_KEY_SESSION)?.trim())
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/albums' },
    { path: '/login', component: LoginPage, meta: { public: true } },
    { path: '/albums', component: AlbumsPage },
    { path: '/images', component: ImagesPage },
    { path: '/schedule', component: SchedulePage },
    { path: '/activity', component: ActivityPage },
    { path: '/connection', component: ConnectionPage },
  ],
})

router.beforeEach((to) => {
  const isPublic = to.meta.public === true
  const ok = readLoggedIn()
  if (isPublic) {
    if (to.path === '/login' && ok) return { path: '/albums' }
    return true
  }
  if (!ok) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router
