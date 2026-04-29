import { createRouter, createWebHistory } from 'vue-router'

import AlbumsPage from '../views/AlbumsPage.vue'
import ImagesPage from '../views/ImagesPage.vue'
import SchedulePage from '../views/SchedulePage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/albums' },
    { path: '/albums', component: AlbumsPage },
    { path: '/images', component: ImagesPage },
    { path: '/schedule', component: SchedulePage },
  ],
})

export default router
