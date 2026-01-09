<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { announcesApi, favoritesApi, type Announce } from '@/services/api'
import { useUserStore } from '@/stores/user'
import { searchAddress, debounce, type GeoLocation } from '@/services/geolocation'

const router = useRouter()
const userStore = useUserStore()

// State
const searchQuery = ref('')
const checkInDate = ref('')
const checkOutDate = ref('')
const guestCount = ref(1)
const featuredAnnounces = ref<Announce[]>([])
const newAnnounces = ref<Announce[]>([])
const isLoading = ref(true)

// Favorites state
const favoriteIds = ref<Set<number>>(new Set())
const togglingFavorites = ref<Set<number>>(new Set())

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
    citySuggestions.value = results.filter(r => r.city)
  } finally {
    isSearchingCity.value = false
  }
}, 300)

watch(searchQuery, (newQuery) => {
  if (newQuery && newQuery.length >= 2) {
    showCitySuggestions.value = true
    debouncedCitySearch(newQuery)
  } else {
    citySuggestions.value = []
    showCitySuggestions.value = false
  }
})

const selectCity = (location: GeoLocation) => {
  searchQuery.value = location.city
  showCitySuggestions.value = false
  citySuggestions.value = []
}

const hideCitySuggestions = () => {
  window.setTimeout(() => {
    showCitySuggestions.value = false
  }, 200)
}

// Types de logements avec icônes
const propertyTypes = [
  { name: 'Tendances', icon: 'local_fire_department', active: true },
  { name: 'Appartement', icon: 'apartment', type: 'APARTMENT' },
  { name: 'Maison', icon: 'house', type: 'HOUSE' },
  { name: 'Villa', icon: 'villa', type: 'VILLA' },
  { name: 'Studio', icon: 'home_work', type: 'STUDIO' },
  { name: 'Chambre', icon: 'bed', type: 'ROOM' },
]

// Charger les annonces
onMounted(async () => {
  try {
    // Charger les favoris si connecté
    if (userStore.isAuthenticated) {
      try {
        const favs = await favoritesApi.getAll()
        favoriteIds.value = new Set(favs.map(f => f.announceId))
      } catch (e) {
        // Ignorer
      }
    }
    
    const announces = await announcesApi.getAll({ limit: 8 })
    const announceList = Array.isArray(announces) ? announces : announces.data
    featuredAnnounces.value = announceList.slice(0, 4)
    newAnnounces.value = announceList.slice(4, 8)
  } catch (error) {
    console.error('Erreur lors du chargement des annonces:', error)
  } finally {
    isLoading.value = false
  }
})

// Toggle favorite
const toggleFavorite = async (announceId: number, event: Event) => {
  event.stopPropagation()
  
  if (!userStore.isAuthenticated) {
    router.push(`/auth?redirect=/`)
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
    favoriteIds.value = new Set(favoriteIds.value)
  } catch (e) {
    console.error('Erreur toggle favorite:', e)
  } finally {
    togglingFavorites.value.delete(announceId)
  }
}

// Rechercher
const handleSearch = () => {
  const params = new URLSearchParams()
  if (searchQuery.value) params.append('city', searchQuery.value)
  router.push(`/research?${params.toString()}`)
}

// Aller vers les détails d'une annonce
const goToAnnounce = (id: number) => {
  router.push(`/anounce/${id}`)
}

// Formater le prix
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price)
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

// Obtenir une image placeholder selon le type
const getPlaceholderImage = (type: string, index: number) => {
  const images = {
    APARTMENT: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600',
    ],
    HOUSE: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600',
    ],
    VILLA: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600',
      'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=600',
    ],
    STUDIO: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600',
    ],
    ROOM: [
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600',
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600',
    ],
    OTHER: [
      'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=600',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600',
    ],
  }
  const typeImages = images[type as keyof typeof images] || images.OTHER
  return typeImages[index % typeImages.length]
}

// Traduire le type
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
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
    <!-- Hero Search Section (Mobile) -->
    <section class="md:hidden">
      <h1 class="text-3xl font-bold mb-6">
        Trouvez votre prochain <span class="text-primary">séjour</span>
      </h1>
      <div class="bg-white p-4 rounded-2xl shadow-lg border border-gray-100">
        <div class="relative">
          <div class="flex items-center bg-gray-50 rounded-xl px-4 py-3 mb-3">
            <span class="material-icons-round text-primary mr-3">search</span>
            <input 
              v-model="searchQuery"
              type="text" 
              class="bg-transparent border-none w-full focus:ring-0 text-sm p-0" 
              placeholder="Où souhaitez-vous aller ?"
              @focus="showCitySuggestions = citySuggestions.length > 0"
              @blur="hideCitySuggestions"
            />
            <svg v-if="isSearchingCity" class="animate-spin h-4 w-4 text-primary ml-2" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <!-- Suggestions dropdown mobile -->
          <div 
            v-if="showCitySuggestions && citySuggestions.length > 0"
            class="absolute left-0 right-0 top-14 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50"
          >
            <button
              v-for="suggestion in citySuggestions"
              :key="suggestion.placeId"
              @mousedown.prevent="selectCity(suggestion)"
              class="w-full px-4 py-3 text-left hover:bg-primary/10 border-b border-gray-100 last:border-0 flex items-center gap-3"
            >
              <span class="material-icons-round text-primary text-base">location_on</span>
              <div>
                <span class="font-medium text-gray-900">{{ suggestion.city }}</span>
                <span class="text-sm text-gray-500 ml-1">{{ suggestion.postalCode }}</span>
              </div>
            </button>
          </div>
        </div>
        <div class="flex gap-3 mb-4">
          <div class="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-500 flex items-center justify-between">
            <span>Dates</span>
            <span class="material-icons-round text-base">calendar_today</span>
          </div>
          <div class="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-500 flex items-center justify-between">
            <span>{{ guestCount }} voyageur(s)</span>
            <span class="material-icons-round text-base">group</span>
          </div>
        </div>
        <button 
          @click="handleSearch"
          class="w-full bg-primary text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition-opacity shadow-md"
        >
          Rechercher
        </button>
      </div>
    </section>

    <!-- Desktop Search Bar (déjà dans la nav, on ajoute une section héro) -->
    <section class="hidden md:block text-center py-12">
      <h1 class="text-4xl lg:text-5xl font-bold mb-4 text-gray-900">
        Trouvez votre prochain <span class="text-primary font-extrabold">séjour idéal</span>
      </h1>
      <p class="text-gray-700 text-lg mb-8 max-w-2xl mx-auto">
        Découvrez des logements uniques pour vos vacances, voyages d'affaires ou escapades en France et dans le monde.
      </p>
      
      <!-- Search Box -->
      <div class="max-w-3xl mx-auto bg-white border-2 border-gray-200 rounded-full shadow-lg hover:shadow-xl transition-shadow px-4 py-3">
        <div class="flex items-center divide-x divide-gray-300">
          <div class="flex-1 px-4 relative">
            <label class="text-xs font-bold text-gray-800 block text-left">Destination</label>
            <input 
              v-model="searchQuery"
              type="text" 
              class="w-full text-sm bg-transparent border-none p-0 focus:ring-0 text-gray-800 placeholder-gray-500" 
              placeholder="Paris, Lyon, Marseille..."
              @focus="showCitySuggestions = citySuggestions.length > 0"
              @blur="hideCitySuggestions"
            />
            <!-- Suggestions dropdown -->
            <div 
              v-if="showCitySuggestions && citySuggestions.length > 0"
              class="absolute left-0 right-0 top-full mt-4 bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 overflow-y-auto z-50"
            >
              <button
                v-for="suggestion in citySuggestions"
                :key="suggestion.placeId"
                @mousedown.prevent="selectCity(suggestion)"
                class="w-full px-4 py-3 text-left hover:bg-primary/10 border-b border-gray-100 last:border-0 flex items-center gap-3 transition-colors"
              >
                <span class="material-icons-round text-primary text-base">location_on</span>
                <div class="min-w-0">
                  <span class="font-medium text-gray-900">{{ suggestion.city }}</span>
                  <span class="text-sm text-gray-500 ml-1">{{ suggestion.postalCode }}, {{ suggestion.country }}</span>
                </div>
              </button>
            </div>
            <!-- Loading indicator -->
            <div v-if="isSearchingCity" class="absolute right-0 top-1/2 -translate-y-1/2">
              <svg class="animate-spin h-4 w-4 text-primary" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          </div>
          <div class="flex-1 px-4">
            <label class="text-xs font-bold text-gray-800 block text-left">Arrivée</label>
            <input 
              v-model="checkInDate"
              type="date" 
              class="w-full text-sm bg-transparent border-none p-0 focus:ring-0 text-gray-800"
            />
          </div>
          <div class="flex-1 px-4">
            <label class="text-xs font-bold text-gray-800 block text-left">Départ</label>
            <input 
              v-model="checkOutDate"
              type="date" 
              class="w-full text-sm bg-transparent border-none p-0 focus:ring-0 text-gray-800"
            />
          </div>
          <div class="px-4">
            <button 
              @click="handleSearch"
              class="bg-primary text-white p-3 rounded-full hover:bg-opacity-90 transition-colors"
            >
              <span class="material-icons-round text-xl">search</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Categories -->
    <section class="flex items-center gap-8 overflow-x-auto hide-scrollbar pb-4 pt-2 border-b border-gray-100">
      <div 
        v-for="(type, index) in propertyTypes" 
        :key="index"
        @click="type.type ? router.push(`/research?type=${type.type}`) : null"
        :class="[
          'flex flex-col items-center gap-2 min-w-[64px] group cursor-pointer transition-opacity',
          type.active ? '' : 'opacity-60 hover:opacity-100'
        ]"
      >
        <div :class="[
          'p-3 rounded-full transition-colors',
          type.active ? 'bg-primary/10 text-primary' : 'bg-transparent text-gray-600 group-hover:bg-gray-100'
        ]">
          <span class="material-icons-round text-2xl">{{ type.icon }}</span>
        </div>
        <span :class="[
          'text-xs font-medium',
          type.active ? 'font-semibold text-primary' : 'text-gray-700'
        ]">{{ type.name }}</span>
        <div :class="[
          'h-0.5 w-8 rounded-full mt-1',
          type.active ? 'bg-primary' : 'bg-transparent group-hover:bg-gray-300'
        ]"></div>
      </div>
    </section>

    <!-- Featured Announces -->
    <section>
      <div class="flex justify-between items-end mb-6">
        <h2 class="text-2xl font-bold text-gray-900">Explorer les meilleures annonces</h2>
        <RouterLink to="/research" class="text-primary text-sm font-semibold hover:underline">
          Voir tout
        </RouterLink>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div v-for="i in 4" :key="i" class="animate-pulse">
          <div class="aspect-[4/3] bg-gray-200 rounded-2xl mb-3"></div>
          <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div class="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>

      <!-- Announces Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div 
          v-for="(announce, index) in featuredAnnounces" 
          :key="announce.id"
          @click="goToAnnounce(announce.id)"
          class="group cursor-pointer"
        >
          <div class="relative aspect-[4/3] rounded-2xl overflow-hidden mb-3">
            <img 
              :src="announce.pictures?.[0]?.url || getPlaceholderImage(announce.type, index)" 
              :alt="announce.title"
              class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
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
            <div class="flex justify-between items-start">
              <h3 class="font-bold text-lg text-gray-900 group-hover:text-primary transition-colors truncate">
                {{ announce.title }}
              </h3>
            </div>
            <p class="text-sm text-gray-600 mb-1">{{ announce.city || 'France' }} · {{ translateType(announce.type) }}</p>
            <div class="flex items-center gap-1">
              <span class="font-bold text-primary">{{ formatPrice(announce.price) }}</span>
              <span class="text-sm text-gray-600">/ nuit</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!isLoading && featuredAnnounces.length === 0" class="text-center py-12">
        <span class="material-icons-round text-6xl text-gray-300 mb-4">home_work</span>
        <h3 class="text-xl font-semibold text-gray-700 mb-2">Aucune annonce disponible</h3>
        <p class="text-gray-500">Revenez bientôt pour découvrir de nouvelles annonces !</p>
      </div>
    </section>

    <!-- New Announces -->
    <section v-if="newAnnounces.length > 0">
      <div class="flex justify-between items-end mb-6">
        <h2 class="text-2xl font-bold text-gray-900">Nouveautés sur ETNAir</h2>
        <RouterLink to="/research" class="text-primary text-sm font-semibold hover:underline">
          Voir tout
        </RouterLink>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div 
          v-for="(announce, index) in newAnnounces" 
          :key="announce.id"
          @click="goToAnnounce(announce.id)"
          class="flex bg-white rounded-2xl p-3 shadow-sm hover:shadow-md transition-shadow border border-gray-100 cursor-pointer group"
        >
          <div class="w-1/3 aspect-square rounded-xl overflow-hidden relative">
            <img 
              :src="announce.pictures?.[0]?.url || getPlaceholderImage(announce.type, index + 4)" 
              :alt="announce.title"
              class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div class="absolute top-2 left-2 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
              NOUVEAU
            </div>
          </div>
          <div class="w-2/3 pl-4 flex flex-col justify-center">
            <div class="flex justify-between items-start">
              <h3 class="font-bold text-lg text-gray-900 mb-1 truncate">{{ announce.title }}</h3>
              <button 
                @click="toggleFavorite(announce.id, $event)"
                :disabled="togglingFavorites.has(announce.id)"
                :class="[
                  'transition-colors',
                  favoriteIds.has(announce.id) ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                ]"
              >
                <span class="material-icons-round text-xl">{{ favoriteIds.has(announce.id) ? 'favorite' : 'favorite_border' }}</span>
              </button>
            </div>
            <p class="text-sm text-gray-600 mb-3">{{ announce.city || 'France' }}</p>
            <div class="flex items-center justify-between mt-auto">
              <div class="flex items-center gap-1">
                <span class="font-bold text-primary text-lg">{{ formatPrice(announce.price) }}</span>
                <span class="text-xs text-gray-600">/ nuit</span>
              </div>
              <div class="flex items-center text-orange-400 gap-1 text-xs font-bold bg-orange-400/10 px-2 py-1 rounded">
                <span class="material-icons-round text-sm">local_fire_department</span>
                Hot
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="bg-gradient-to-r from-primary/20 to-teal-500/20 rounded-3xl p-8 md:p-12 text-center">
      <div class="max-w-2xl mx-auto">
        <span class="material-icons-round text-primary text-5xl mb-4">home_work</span>
        <h2 class="text-2xl md:text-3xl font-bold mb-4 text-gray-900">Vous avez un logement à proposer ?</h2>
        <p class="text-gray-700 mb-6">
          Rejoignez notre communauté d'hôtes et gagnez de l'argent en louant votre bien. 
          C'est simple, sécurisé et gratuit.
        </p>
        <RouterLink 
          to="/anounces/create"
          class="inline-flex items-center gap-2 bg-primary text-white font-semibold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity shadow-lg"
        >
          <span class="material-icons-round">add</span>
          Publier une annonce
        </RouterLink>
      </div>
    </section>
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

input[type="date"]::-webkit-calendar-picker-indicator {
  opacity: 0.5;
}
</style>
