<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { announcesApi, favoritesApi, type Announce, type AnnounceFilters } from '@/services/api'
import { useUserStore } from '@/stores/user'
import { searchAddress, debounce, type GeoLocation } from '@/services/geolocation'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// State
const announces = ref<Announce[]>([])
const isLoading = ref(true)
const totalCount = ref(0)
const currentPage = ref(1)
const totalPages = ref(1)
const showFilters = ref(false)

// Favorites state
const favoriteIds = ref<Set<number>>(new Set())
const togglingFavorites = ref<Set<number>>(new Set())

// Filters - DOIT être déclaré avant les watchers qui l'utilisent
const filters = ref<AnnounceFilters>({
  city: '',
  type: '',
  minPrice: undefined,
  maxPrice: undefined,
  capacity: undefined,
  limit: 12,
  page: 1,
})

// Géolocalisation pour recherche de ville
const citySuggestions = ref<GeoLocation[]>([])
const showCitySuggestions = ref(false)
const isSearchingCity = ref(false)

const debouncedCitySearch = debounce(async (query: string) => {
  if (query.length < 2) {
    citySuggestions.value = []
    return
  }
  isSearchingCity.value = true
  try {
    const results = await searchAddress(query)
    // Filtrer pour n'avoir que des résultats avec une ville
    citySuggestions.value = results.filter(r => r.city)
  } finally {
    isSearchingCity.value = false
  }
}, 300)

// Surveiller le champ ville
watch(() => filters.value.city, (newCity) => {
  if (newCity && newCity.length >= 2) {
    showCitySuggestions.value = true
    debouncedCitySearch(newCity)
  } else {
    citySuggestions.value = []
    showCitySuggestions.value = false
  }
})

const selectCity = (location: GeoLocation) => {
  filters.value.city = location.city
  showCitySuggestions.value = false
  citySuggestions.value = []
}

const hideCitySuggestions = () => {
  window.setTimeout(() => {
    showCitySuggestions.value = false
  }, 200)
}

// Property types
const propertyTypes = [
  { value: '', label: 'Tous les types' },
  { value: 'APARTMENT', label: 'Appartement' },
  { value: 'HOUSE', label: 'Maison' },
  { value: 'VILLA', label: 'Villa' },
  { value: 'STUDIO', label: 'Studio' },
  { value: 'ROOM', label: 'Chambre' },
  { value: 'OTHER', label: 'Autre' },
]

// Load announces with filters
const loadAnnounces = async () => {
  isLoading.value = true
  try {
    const result = await announcesApi.getAll(filters.value)
    if (Array.isArray(result)) {
      announces.value = result
      totalCount.value = result.length
      totalPages.value = 1
    } else {
      announces.value = result.data
      totalCount.value = result.meta.total
      totalPages.value = result.meta.totalPages
      currentPage.value = result.meta.page
    }
  } catch (error) {
    console.error('Erreur lors du chargement des annonces:', error)
    announces.value = []
  } finally {
    isLoading.value = false
  }
}

// Initialize from URL params
onMounted(async () => {
  if (route.query.city) filters.value.city = route.query.city as string
  if (route.query.type) filters.value.type = route.query.type as string
  if (route.query.minPrice) filters.value.minPrice = Number(route.query.minPrice)
  if (route.query.maxPrice) filters.value.maxPrice = Number(route.query.maxPrice)
  if (route.query.capacity) filters.value.capacity = Number(route.query.capacity)
  
  // Charger les favoris si connecté
  if (userStore.isAuthenticated) {
    try {
      const favs = await favoritesApi.getAll()
      favoriteIds.value = new Set(favs.map(f => f.announceId))
    } catch (e) {
      // Ignorer
    }
  }
  
  loadAnnounces()
})

// Toggle favorite
const toggleFavorite = async (announceId: number, event: Event) => {
  event.stopPropagation()
  
  if (!userStore.isAuthenticated) {
    router.push(`/auth?redirect=/research`)
    return
  }
  
  if (togglingFavorites.value.has(announceId)) return
  
  togglingFavorites.value.add(announceId)
  try {
    const result = await favoritesApi.toggle(announceId)
    if (result.isFavorite) {
      favoriteIds.value.add(announceId)
    } else {
      favoriteIds.value.delete(announceId)
    }
    // Force reactivity
    favoriteIds.value = new Set(favoriteIds.value)
  } catch (e) {
    console.error('Erreur toggle favorite:', e)
  } finally {
    togglingFavorites.value.delete(announceId)
  }
}

// Apply filters
const applyFilters = () => {
  filters.value.page = 1
  // Update URL
  const query: Record<string, string> = {}
  if (filters.value.city) query.city = filters.value.city
  if (filters.value.type) query.type = filters.value.type
  if (filters.value.minPrice) query.minPrice = String(filters.value.minPrice)
  if (filters.value.maxPrice) query.maxPrice = String(filters.value.maxPrice)
  if (filters.value.capacity) query.capacity = String(filters.value.capacity)
  router.replace({ query })
  loadAnnounces()
  showFilters.value = false
}

// Reset filters
const resetFilters = () => {
  filters.value = {
    city: '',
    type: '',
    minPrice: undefined,
    maxPrice: undefined,
    capacity: undefined,
    limit: 12,
    page: 1,
  }
  router.replace({ query: {} })
  loadAnnounces()
  showFilters.value = false
}

// Pagination
const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    filters.value.page = page
    loadAnnounces()
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const prevPage = () => {
  if (currentPage.value > 1) {
    goToPage(currentPage.value - 1)
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    goToPage(currentPage.value + 1)
  }
}

// Générer les numéros de page à afficher
const visiblePages = computed(() => {
  const pages: (number | string)[] = []
  const total = totalPages.value
  const current = currentPage.value
  
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (current > 3) pages.push('...')
    
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)
    
    for (let i = start; i <= end; i++) pages.push(i)
    
    if (current < total - 2) pages.push('...')
    pages.push(total)
  }
  
  return pages
})

// Navigate to announce detail
const goToAnnounce = (id: number) => {
  router.push(`/anounce/${id}`)
}

// Helper functions
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price)
}

const translateType = (type: string) => {
  const translations: Record<string, string> = {
    APARTMENT: 'Appartement',
    HOUSE: 'Maison',
    VILLA: 'Villa',
    STUDIO: 'Studio',
    ROOM: 'Chambre',
    OTHER: 'Autre',
  }
  return translations[type] || type
}

// Générer les étoiles pour une note
const getStars = (rating: number | null | undefined) => {
  if (!rating) return []
  const stars = []
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating - fullStars >= 0.5
  
  for (let i = 0; i < fullStars; i++) stars.push('full')
  if (hasHalfStar) stars.push('half')
  while (stars.length < 5) stars.push('empty')
  
  return stars
}

const getPlaceholderImage = (type: string, index: number) => {
  const images = {
    APARTMENT: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600'],
    HOUSE: ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600'],
    VILLA: ['https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600', 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=600'],
    STUDIO: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600', 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600'],
    ROOM: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600'],
    OTHER: ['https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=600', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600'],
  }
  const typeImages = images[type as keyof typeof images] || images.OTHER
  return typeImages[index % typeImages.length]
}

// Active filters count
const activeFiltersCount = computed(() => {
  let count = 0
  if (filters.value.city) count++
  if (filters.value.type) count++
  if (filters.value.minPrice) count++
  if (filters.value.maxPrice) count++
  if (filters.value.capacity) count++
  return count
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div class="flex-1">
          <h1 class="text-2xl font-bold text-gray-900 mb-1">
            {{ totalCount }} logement{{ totalCount > 1 ? 's' : '' }} 
            <span v-if="filters.city">à {{ filters.city }}</span>
            <span v-else>disponibles</span>
          </h1>
          <p class="text-sm text-gray-500">Comparez les prix, avis et équipements.</p>
        </div>

        <!-- Filter Buttons -->
        <div class="flex items-center gap-3 overflow-x-auto hide-scrollbar pb-2 md:pb-0">
          <button 
            @click="showFilters = !showFilters"
            :class="[
              'flex items-center gap-2 px-4 py-2.5 border-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap shadow-sm',
              activeFiltersCount > 0 
                ? 'bg-primary text-white border-primary shadow-primary/30' 
                : 'bg-white border-gray-300 text-gray-700 hover:border-primary hover:text-primary'
            ]"
          >
            <span class="material-icons-round text-lg">tune</span>
            Filtres
            <span v-if="activeFiltersCount > 0" class="bg-white text-primary text-xs font-bold px-1.5 py-0.5 rounded-full">
              {{ activeFiltersCount }}
            </span>
          </button>
          <div class="h-8 w-[1px] bg-gray-300 mx-1"></div>
          <button 
            v-for="type in propertyTypes.slice(1, 5)" 
            :key="type.value"
            @click="filters.type = type.value; applyFilters()"
            :class="[
              'px-4 py-2 border-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap shadow-sm',
              filters.type === type.value 
                ? 'bg-primary text-white border-primary shadow-primary/30' 
                : 'bg-white border-gray-300 text-gray-700 hover:border-primary hover:text-primary'
            ]"
          >
            {{ type.label }}
          </button>
        </div>
      </div>

      <!-- Filters Panel -->
      <div 
        v-if="showFilters" 
        class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8"
      >
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-lg font-bold">Filtres</h3>
          <button @click="resetFilters" class="text-sm text-primary hover:underline">
            Réinitialiser
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <!-- City avec autocomplétion -->
          <div class="relative">
            <label class="block text-sm font-medium text-gray-700 mb-2">Ville</label>
            <div class="relative">
              <input 
                v-model="filters.city"
                type="text"
                placeholder="Paris, Lyon..."
                @focus="showCitySuggestions = citySuggestions.length > 0"
                @blur="setTimeout(() => showCitySuggestions = false, 200)"
                class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <span v-if="isSearchingCity" class="absolute right-3 top-1/2 -translate-y-1/2">
                <svg class="animate-spin h-4 w-4 text-primary" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </span>
            </div>
            <!-- Suggestions -->
            <div 
              v-if="showCitySuggestions && citySuggestions.length > 0"
              class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto"
            >
              <button
                v-for="suggestion in citySuggestions"
                :key="suggestion.placeId"
                @mousedown.prevent="selectCity(suggestion)"
                class="w-full px-4 py-2.5 text-left hover:bg-primary/10 border-b border-gray-100 last:border-0 flex items-center gap-2 transition-colors"
              >
                <span class="material-icons-round text-primary text-base">location_on</span>
                <div class="min-w-0">
                  <span class="font-medium text-gray-900">{{ suggestion.city }}</span>
                  <span class="text-sm text-gray-500 ml-1">{{ suggestion.postalCode }}</span>
                </div>
              </button>
            </div>
          </div>

          <!-- Type -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Type de logement</label>
            <select 
              v-model="filters.type"
              class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option v-for="type in propertyTypes" :key="type.value" :value="type.value">
                {{ type.label }}
              </option>
            </select>
          </div>

          <!-- Price Range -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Prix min (€/nuit)</label>
            <input 
              v-model.number="filters.minPrice"
              type="number"
              placeholder="0"
              min="0"
              class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Prix max (€/nuit)</label>
            <input 
              v-model.number="filters.maxPrice"
              type="number"
              placeholder="1000"
              min="0"
              class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <!-- Capacity -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Capacité minimum</label>
            <input 
              v-model.number="filters.capacity"
              type="number"
              placeholder="1"
              min="1"
              class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <button 
            @click="showFilters = false"
            class="px-6 py-2.5 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button 
            @click="applyFilters"
            class="px-6 py-2.5 bg-primary text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Appliquer les filtres
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        <div v-for="i in 8" :key="i" class="animate-pulse">
          <div class="aspect-[4/3] bg-gray-200 rounded-2xl mb-3"></div>
          <div class="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div class="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div class="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>

      <!-- Announces Grid -->
      <div v-else-if="announces.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        <div 
          v-for="(announce, index) in announces" 
          :key="announce.id"
          @click="goToAnnounce(announce.id)"
          class="group cursor-pointer"
        >
          <div class="relative aspect-[4/3] rounded-2xl overflow-hidden mb-3 bg-gray-200">
            <img 
              :src="announce.pictures?.[0]?.url || getPlaceholderImage(announce.type, index)" 
              :alt="announce.title"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <button 
              @click="toggleFavorite(announce.id, $event)"
              :disabled="togglingFavorites.has(announce.id)"
              :class="[
                'absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm transition-all',
                favoriteIds.has(announce.id) 
                  ? 'bg-white/90 text-red-500' 
                  : 'bg-black/10 hover:bg-white/90 text-white hover:text-red-500'
              ]"
            >
              <span class="material-icons-round text-xl">{{ favoriteIds.has(announce.id) ? 'favorite' : 'favorite_border' }}</span>
            </button>
            <div v-if="announce.reviewCount && announce.reviewCount > 0" class="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-1 shadow-sm">
              <span class="material-icons-round text-yellow-400 text-sm">star</span>
              <span class="text-xs font-bold text-gray-900">{{ announce.averageRating?.toFixed(1) }}</span>
            </div>
            <div v-else class="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-1 shadow-sm">
              <span class="text-xs text-gray-500">Nouveau</span>
            </div>
          </div>
          <div>
            <h3 class="font-bold text-lg text-gray-900 group-hover:text-primary transition-colors truncate">
              {{ announce.title }}
            </h3>
          </div>
          <p class="text-gray-500 text-sm mt-0.5">
            {{ translateType(announce.type) }} · {{ announce.info?.capacity || '?' }} voyageurs
          </p>
          <p class="text-gray-500 text-sm mt-0.5">{{ announce.city || 'France' }}</p>
          <div class="flex items-baseline gap-1 mt-2">
            <span class="font-bold text-gray-900">{{ formatPrice(announce.price) }}</span>
            <span class="text-gray-500 text-sm">/ nuit</span>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-16">
        <span class="material-icons-round text-6xl text-gray-300 mb-4">search_off</span>
        <h3 class="text-xl font-semibold text-gray-700 mb-2">Aucun résultat</h3>
        <p class="text-gray-500 mb-6">Essayez de modifier vos filtres pour trouver plus de logements.</p>
        <button 
          @click="resetFilters"
          class="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          Réinitialiser les filtres
        </button>
      </div>

      <!-- Pagination -->
      <div v-if="!isLoading && announces.length > 0 && totalPages > 1" class="mt-12 flex flex-col items-center gap-4">
        <p class="text-sm text-gray-700 font-medium">
          Page {{ currentPage }} sur {{ totalPages }} • {{ totalCount }} logements au total
        </p>
        <nav class="flex items-center gap-2">
          <!-- Bouton précédent -->
          <button 
            @click="prevPage"
            :disabled="currentPage === 1"
            :class="[
              'flex items-center justify-center w-10 h-10 rounded-lg font-medium transition-all',
              currentPage === 1 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-primary hover:text-primary'
            ]"
          >
            <span class="material-icons-round">chevron_left</span>
          </button>
          
          <!-- Numéros de page -->
          <template v-for="(page, index) in visiblePages" :key="index">
            <span v-if="page === '...'" class="px-2 text-gray-500">...</span>
            <button 
              v-else
              @click="goToPage(page as number)"
              :class="[
                'flex items-center justify-center w-10 h-10 rounded-lg font-semibold transition-all',
                currentPage === page 
                  ? 'bg-primary text-white shadow-md' 
                  : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-primary hover:text-primary'
              ]"
            >
              {{ page }}
            </button>
          </template>
          
          <!-- Bouton suivant -->
          <button 
            @click="nextPage"
            :disabled="currentPage === totalPages"
            :class="[
              'flex items-center justify-center w-10 h-10 rounded-lg font-medium transition-all',
              currentPage === totalPages 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-primary hover:text-primary'
            ]"
          >
            <span class="material-icons-round">chevron_right</span>
          </button>
        </nav>
      </div>
    </main>
  </div>
</template>

<style scoped>
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

input:focus, select:focus {
  outline: none;
}
</style>