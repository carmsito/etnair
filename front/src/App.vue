<script setup lang="ts">
import { RouterLink, RouterView, useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { onMounted, onUnmounted, ref, computed } from 'vue'

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()
const showUserMenu = ref(false)

// Pages qui ont leur propre layout (sans header/footer global)
const fullLayoutRoutes = ['/anounces/create']
const isFullLayout = computed(() => fullLayoutRoutes.includes(route.path))

onMounted(async () => {
  await userStore.checkAuth()
  // Fermer le menu quand on clique ailleurs
  document.addEventListener('click', closeMenuOnClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenuOnClickOutside)
})

const closeMenuOnClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.user-menu-container')) {
    showUserMenu.value = false
  }
}

const handleLogout = async () => {
  await userStore.logOut()
  showUserMenu.value = false
  router.push('/auth')
}

const toggleUserMenu = (event: MouseEvent) => {
  event.stopPropagation()
  showUserMenu.value = !showUserMenu.value
}

const navigateTo = (path: string) => {
  showUserMenu.value = false
  router.push(path)
}
</script>

<template>
  <!-- Navigation (caché sur les pages full layout) -->
  <nav v-if="!isFullLayout" class="sticky top-0 z-50 bg-gradient-to-r from-white via-emerald-50/50 to-teal-50/50 backdrop-blur-md border-b border-emerald-100">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-20">
        <!-- Logo -->
        <RouterLink to="/" class="flex items-center gap-2 cursor-pointer">
          <div class="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
            E
          </div>
          <span class="text-xl font-bold tracking-tight text-primary">ETNAir</span>
        </RouterLink>

        <!-- Navigation Links (Desktop) -->
        <div class="hidden md:flex items-center gap-6">
          <RouterLink 
            to="/" 
            class="text-sm font-medium text-gray-600 hover:text-primary transition-colors px-3 py-2 rounded-full hover:bg-primary/5"
          >
            Accueil
          </RouterLink>
          <RouterLink 
            to="/research" 
            class="text-sm font-medium text-gray-600 hover:text-primary transition-colors px-3 py-2 rounded-full hover:bg-primary/5"
          >
            Rechercher
          </RouterLink>
          <template v-if="userStore.isAuthenticated">
            <RouterLink 
              to="/reservations" 
              class="text-sm font-medium text-gray-600 hover:text-primary transition-colors px-3 py-2 rounded-full hover:bg-primary/5"
            >
              Mes réservations
            </RouterLink>
            <RouterLink 
              to="/anounces" 
              class="text-sm font-medium text-gray-600 hover:text-primary transition-colors px-3 py-2 rounded-full hover:bg-primary/5"
            >
              Mes annonces
            </RouterLink>
          </template>
        </div>

        <!-- Right Side -->
        <div class="flex items-center gap-4">
          <template v-if="userStore.isAuthenticated">
            <RouterLink 
              to="/anounces" 
              class="hidden lg:block text-sm font-medium hover:bg-gray-100 px-4 py-2 rounded-full transition-colors text-gray-700"
            >
              Publier une annonce
            </RouterLink>
          </template>
          
          <!-- User Menu -->
          <div class="relative user-menu-container">
            <button 
              @click="toggleUserMenu"
              class="flex items-center gap-2 border border-gray-200 rounded-full p-1 pl-3 hover:shadow-md cursor-pointer bg-white transition-all"
            >
              <span class="material-icons-round text-gray-500">menu</span>
              <div class="bg-gray-500 rounded-full w-8 h-8 overflow-hidden text-white flex items-center justify-center">
                <span class="material-icons-round text-lg">person</span>
              </div>
            </button>

            <!-- Dropdown Menu -->
            <div 
              v-if="showUserMenu" 
              class="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50"
            >
              <template v-if="userStore.isAuthenticated">
                <div class="px-4 py-2 border-b border-gray-100">
                  <p class="font-semibold text-gray-900">{{ userStore.username }}</p>
                  <p class="text-sm text-gray-500">{{ userStore.email }}</p>
                  <span 
                    v-if="userStore.user?.role === 'ADMIN'" 
                    class="inline-block mt-1 px-2 py-0.5 text-xs font-semibold bg-purple-100 text-purple-700 rounded-full"
                  >
                    Admin
                  </span>
                </div>
                <div 
                  @click="navigateTo('/user')"
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Mon profil
                </div>
                <div 
                  @click="navigateTo('/reservations')"
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Mes réservations
                </div>
                <div 
                  @click="navigateTo('/anounces')"
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Mes annonces
                </div>
                <template v-if="userStore.user?.role === 'ADMIN'">
                  <hr class="my-2 border-gray-100">
                  <div 
                    @click="navigateTo('/admin/users')"
                    class="flex items-center gap-2 px-4 py-2 text-sm text-purple-700 hover:bg-purple-50 cursor-pointer"
                  >
                    <span class="material-icons text-sm">admin_panel_settings</span>
                    Administration
                  </div>
                </template>
                <hr class="my-2 border-gray-100">
                <div 
                  @click="handleLogout"
                  class="block px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                >
                  Se déconnecter
                </div>
              </template>
              <template v-else>
                <div 
                  @click="navigateTo('/auth')"
                  class="block px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 cursor-pointer"
                >
                  Connexion
                </div>
                <div 
                  @click="navigateTo('/auth?mode=register')"
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Inscription
                </div>
                <hr class="my-2 border-gray-100">
                <div 
                  @click="navigateTo('/research')"
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Explorer les annonces
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </nav>

  <!-- Main Content -->
  <main :class="['min-h-screen', isFullLayout ? '' : 'bg-gray-50']">
    <RouterView />
  </main>

  <!-- Footer (caché sur les pages full layout) -->
  <footer v-if="!isFullLayout" class="bg-gray-100 border-t border-gray-200 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
        <div>© 2026 ETNAir, Inc.</div>
        <div class="flex gap-6">
          <a href="#" class="hover:underline hover:text-primary">Confidentialité</a>
          <a href="#" class="hover:underline hover:text-primary">Conditions</a>
          <a href="#" class="hover:underline hover:text-primary">Plan du site</a>
        </div>
      </div>
    </div>
  </footer>

  <!-- Mobile Bottom Navigation (caché sur les pages full layout) -->
  <div v-if="!isFullLayout" class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
    <div class="flex justify-around py-3 text-xs font-medium text-gray-500">
      <RouterLink to="/research" class="flex flex-col items-center gap-1 hover:text-primary">
        <span class="material-icons-round">search</span>
        Explorer
      </RouterLink>
      <RouterLink 
        v-if="userStore.isAuthenticated" 
        to="/reservations" 
        class="flex flex-col items-center gap-1 hover:text-primary"
      >
        <span class="material-icons-round">flight</span>
        Réservations
      </RouterLink>
      <RouterLink 
        v-if="userStore.isAuthenticated" 
        to="/anounces" 
        class="flex flex-col items-center gap-1 hover:text-primary"
      >
        <span class="material-icons-round">home_work</span>
        Annonces
      </RouterLink>
      <RouterLink 
        :to="userStore.isAuthenticated ? '/user' : '/auth'" 
        class="flex flex-col items-center gap-1 hover:text-primary"
      >
        <span class="material-icons-round">account_circle</span>
        {{ userStore.isAuthenticated ? 'Profil' : 'Connexion' }}
      </RouterLink>
    </div>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/icon?family=Material+Icons+Round');

:root {
  --primary: #00D692;
  --primary-dark: #00b87a;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.text-primary {
  color: var(--primary);
}

.bg-primary {
  background-color: var(--primary);
}

.bg-primary\/5 {
  background-color: rgba(0, 214, 146, 0.05);
}

.hover\:text-primary:hover {
  color: var(--primary);
}

.border-primary {
  border-color: var(--primary);
}

/* Hide scrollbar but keep functionality */
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Padding bottom for mobile nav */
@media (max-width: 768px) {
  main {
    padding-bottom: 80px;
  }
}
</style>
