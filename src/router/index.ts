import { createRouter, createWebHistory } from 'vue-router'

import { ADMIN_KEY_SESSION } from '../composables/useConnection'
import ActivityPage from '../views/ActivityPage.vue'
import AlbumsPage from '../views/AlbumsPage.vue'
import ImagesPage from '../views/ImagesPage.vue'
import LoginPage from '../views/LoginPage.vue'
import LogsPage from '../views/LogsPage.vue'
import OverviewPage from '../views/OverviewPage.vue'
import SchedulePage from '../views/SchedulePage.vue'
import SettingsPage from '../views/SettingsPage.vue'

function readLoggedIn(): boolean {
  return Boolean(sessionStorage.getItem(ADMIN_KEY_SESSION)?.trim())
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: OverviewPage },
    { path: '/login', component: LoginPage, meta: { public: true } },
    { path: '/albums', component: AlbumsPage },
    { path: '/images', component: ImagesPage },
    { path: '/schedule', component: SchedulePage },
    { path: '/activity', component: ActivityPage },
    { path: '/logs', component: LogsPage },
    { path: '/settings', component: SettingsPage },
    // The pages were called System log and Connection until v1.9; keep the old
    // paths working so a bookmark does not land on a blank router miss.
    { path: '/system-log', redirect: '/logs' },
    { path: '/connection', redirect: '/settings' },
  ],
})

router.beforeEach((to) => {
  const isPublic = to.meta.public === true
  const ok = readLoggedIn()
  if (isPublic) {
    if (to.path === '/login' && ok) return { path: '/' }
    return true
  }
  if (!ok) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router
