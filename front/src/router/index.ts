import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

// #####################################################################################################################
//        Creation of the router to manage navigation between different views of the application on lazy loading
// #####################################################################################################################

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/landing',
      name: 'landing',
      component: () => import('@/views/LandingView.vue'),
    },
    {
      path: '/auth',
      name: 'auth',
      component: () => import('@/views/AuthView.vue'),
    },
    {
      path: '/research',
      name: 'research',
      component: () => import('@/views/ResearchView.vue'),
    },
    {
      path: '/anounces',
      name: 'anounces',
      component: () => import('@/views/AnouncesView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/anounces/create',
      name: 'create-anounce',
      component: () => import('@/views/CreateAnnounceView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/anounce/:id',
      name: 'anounce-details',
      component: () => import('@/views/AnounceDetailsView.vue'),
    },
    {
      path: '/reservations',
      name: 'reservations',
      component: () => import('@/views/ReservationsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/user',
      name: 'user',
      component: () => import('@/views/UserView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: () => import('@/views/AdminUsersView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    }
  ],
})

// Navigation guard pour les routes protégées
router.beforeEach(async (to, from, next) => {
  const { useUserStore } = await import('@/stores/user')
  const userStore = useUserStore()
  
  // Vérifier l'authentification au premier chargement
  if (!userStore.isAuthenticated) {
    await userStore.checkAuth()
  }
  
  if (to.meta.requiresAuth && !userStore.isAuthenticated) {
    next({ name: 'auth', query: { redirect: to.fullPath } })
  } else if (to.meta.requiresAdmin && userStore.user?.role !== 'ADMIN') {
    // Rediriger si l'utilisateur n'est pas admin
    next({ name: 'home' })
  } else {
    next()
  }
})

export default router
