<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { announcesApi, reservationsApi, reviewsApi, favoritesApi, type Announce, type Review } from '@/services/api'
import { useUserStore } from '@/stores/user'
import { searchAddress, getMapImageUrl, getMapUrl, type GeoLocation } from '@/services/geolocation'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// State
const announce = ref<Announce | null>(null)
const isLoading = ref(true)
const error = ref('')

// Favorite state
const isFavorite = ref(false)
const togglingFavorite = ref(false)

// Share state
const showShareMenu = ref(false)
const linkCopied = ref(false)

// Reviews state
const reviews = ref<Review[]>([])
const reviewsRating = ref<{ average: number; count: number }>({ average: 0, count: 0 })
const showAllReviews = ref(false)

// Review form state
const showReviewForm = ref(false)
const newReviewRating = ref(5)
const newReviewComment = ref('')
const submittingReview = ref(false)
const reviewError = ref('')
const userHasReview = ref(false)

// Reservation form
const checkIn = ref('')
const checkOut = ref('')
const guestCount = ref(1)
const isBooking = ref(false)
const bookingError = ref('')
const bookingSuccess = ref(false)
const isAvailable = ref<boolean | null>(null)
const checkingAvailability = ref(false)

// Location/Map state
const locationCoords = ref<{ lat: number; lon: number } | null>(null)
const isLoadingLocation = ref(false)

// Load announce
onMounted(async () => {
  const id = Number(route.params.id)
  if (!id) {
    error.value = 'Annonce non trouvée'
    isLoading.value = false
    return
  }

  try {
    announce.value = await announcesApi.getById(id)
    
    // Charger les reviews
    const [reviewsData, ratingData] = await Promise.all([
      reviewsApi.getByAnnounceId(id),
      reviewsApi.getAnnounceRating(id)
    ])
    reviews.value = Array.isArray(reviewsData) ? reviewsData : reviewsData.data
    reviewsRating.value = ratingData
    
    // Vérifier si l'utilisateur a déjà posté un avis
    if (userStore.isAuthenticated && userStore.user) {
      userHasReview.value = reviews.value.some(r => r.userId === userStore.user!.id)
    }
    
    // Vérifier si dans les favoris (si connecté)
    if (userStore.isAuthenticated) {
      try {
        const favStatus = await favoritesApi.check(id)
        isFavorite.value = favStatus.isFavorite
      } catch (e) {
        // Ignorer si erreur
      }
    }
    
    // Géocoder l'adresse pour afficher la carte
    loadLocationCoords()
  } catch (e: any) {
    error.value = e.message || 'Erreur lors du chargement de l\'annonce'
  } finally {
    isLoading.value = false
  }
})

// Charger les coordonnées de l'adresse pour la carte
const loadLocationCoords = async () => {
  if (!announce.value) return
  
  // Construire la requête de recherche d'adresse
  const addressParts = []
  if (announce.value.info?.address) addressParts.push(announce.value.info.address)
  if (announce.value.city) addressParts.push(announce.value.city)
  if (announce.value.info?.postalCode) addressParts.push(announce.value.info.postalCode)
  if (announce.value.info?.country) addressParts.push(announce.value.info.country)
  
  const searchQuery = addressParts.join(', ') || announce.value.city || 'France'
  
  if (!searchQuery) return
  
  isLoadingLocation.value = true
  try {
    const results = await searchAddress(searchQuery)
    if (results.length > 0) {
      locationCoords.value = {
        lat: results[0].lat,
        lon: results[0].lon
      }
    }
  } catch (e) {
    console.error('Erreur géolocalisation:', e)
  } finally {
    isLoadingLocation.value = false
  }
}

// Computed pour l'URL de la carte
const mapEmbedUrl = computed(() => {
  if (!locationCoords.value) return null
  return getMapImageUrl(locationCoords.value.lat, locationCoords.value.lon, 15)
})

const mapExternalUrl = computed(() => {
  if (!locationCoords.value) return null
  return getMapUrl(locationCoords.value.lat, locationCoords.value.lon)
})

// Toggle favorite
const toggleFavorite = async () => {
  if (!userStore.isAuthenticated) {
    router.push(`/auth?redirect=/anounce/${announce.value?.id}`)
    return
  }
  
  if (!announce.value || togglingFavorite.value) return
  
  togglingFavorite.value = true
  try {
    const result = await favoritesApi.toggle(announce.value.id)
    isFavorite.value = result.isFavorite
  } catch (e: any) {
    console.error('Erreur toggle favorite:', e)
  } finally {
    togglingFavorite.value = false
  }
}

// Submit review
const submitReview = async () => {
  if (!userStore.isAuthenticated) {
    router.push(`/auth?redirect=/anounce/${announce.value?.id}`)
    return
  }
  
  if (!announce.value) return
  
  submittingReview.value = true
  reviewError.value = ''
  
  try {
    const newReview = await reviewsApi.create({
      announceId: announce.value.id,
      rating: newReviewRating.value,
      comment: newReviewComment.value || undefined,
    })
    
    // Ajouter le nouvel avis à la liste
    reviews.value.unshift({
      ...newReview,
      user: { id: userStore.user!.id, username: userStore.user!.username }
    })
    
    // Mettre à jour le rating
    const newCount = reviewsRating.value.count + 1
    const newTotal = reviewsRating.value.average * reviewsRating.value.count + newReviewRating.value
    reviewsRating.value = {
      count: newCount,
      average: Math.round((newTotal / newCount) * 10) / 10
    }
    
    userHasReview.value = true
    showReviewForm.value = false
    newReviewRating.value = 5
    newReviewComment.value = ''
  } catch (e: any) {
    reviewError.value = e.message || 'Erreur lors de la publication de l\'avis'
  } finally {
    submittingReview.value = false
  }
}

// Calculate total price
const totalNights = computed(() => {
  if (!checkIn.value || !checkOut.value) return 0
  const start = new Date(checkIn.value)
  const end = new Date(checkOut.value)
  const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
})

const totalPrice = computed(() => {
  if (!announce.value || totalNights.value === 0) return 0
  return announce.value.price * totalNights.value
})

const serviceFee = computed(() => Math.round(totalPrice.value * 0.12))
const grandTotal = computed(() => totalPrice.value + serviceFee.value)

// Check availability
const checkAvailability = async () => {
  if (!announce.value || !checkIn.value || !checkOut.value) return
  
  checkingAvailability.value = true
  try {
    const result = await reservationsApi.checkAvailability({
      announceId: announce.value.id,
      arriveAt: checkIn.value,
      leaveAt: checkOut.value,
    })
    isAvailable.value = result.available
  } catch (e: any) {
    isAvailable.value = false
  } finally {
    checkingAvailability.value = false
  }
}

// Make reservation
const makeReservation = async () => {
  if (!userStore.isAuthenticated) {
    router.push(`/auth?redirect=/anounce/${announce.value?.id}`)
    return
  }

  if (!announce.value || !checkIn.value || !checkOut.value) {
    bookingError.value = 'Veuillez sélectionner vos dates'
    return
  }

  if (isAvailable.value === false) {
    bookingError.value = 'Ces dates ne sont pas disponibles'
    return
  }

  isBooking.value = true
  bookingError.value = ''

  try {
    await reservationsApi.create({
      announceId: announce.value.id,
      arriveAt: new Date(checkIn.value).toISOString(),
      leaveAt: new Date(checkOut.value).toISOString(),
      guestCount: guestCount.value,
      title: `Séjour - ${announce.value.title}`,
    })
    bookingSuccess.value = true
    setTimeout(() => {
      router.push('/reservations')
    }, 2000)
  } catch (e: any) {
    bookingError.value = e.message || 'Erreur lors de la réservation'
  } finally {
    isBooking.value = false
  }
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

const getPlaceholderImage = (type: string, index: number) => {
  const images = {
    APARTMENT: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'],
    HOUSE: ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800'],
    VILLA: ['https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800', 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800'],
    STUDIO: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800'],
    ROOM: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800'],
    OTHER: ['https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'],
  }
  const typeImages = images[type as keyof typeof images] || images.OTHER
  return typeImages[index % typeImages.length]
}

// Parse amenities
const amenities = computed(() => {
  if (!announce.value?.info?.amenities) return []
  try {
    return JSON.parse(announce.value.info.amenities)
  } catch {
    return announce.value.info.amenities.split(',').map((a: string) => a.trim())
  }
})

// Amenity icons
const getAmenityIcon = (amenity: string) => {
  const icons: Record<string, string> = {
    'wifi': 'wifi',
    'WiFi': 'wifi',
    'parking': 'local_parking',
    'Parking': 'local_parking',
    'piscine': 'pool',
    'Pool': 'pool',
    'climatisation': 'ac_unit',
    'Climatisation': 'ac_unit',
    'cuisine': 'kitchen',
    'Cuisine': 'kitchen',
    'tv': 'tv',
    'TV': 'tv',
  }
  const lowerAmenity = amenity.toLowerCase()
  for (const [key, icon] of Object.entries(icons)) {
    if (lowerAmenity.includes(key.toLowerCase())) return icon
  }
  return 'check_circle'
}

// Reviews helpers
const displayedReviews = computed(() => {
  return showAllReviews.value ? reviews.value : reviews.value.slice(0, 6)
})

const formatReviewDate = (date: string) => {
  return new Date(date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

const renderStars = (rating: number) => {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating)
}

// Share functions
const getShareUrl = () => {
  return window.location.href
}

const getShareText = () => {
  if (!announce.value) return ''
  return `Découvrez "${announce.value.title}" sur ETNAir - ${announce.value.city || 'France'}`
}

const shareOnWhatsApp = () => {
  const url = encodeURIComponent(getShareUrl())
  const text = encodeURIComponent(getShareText())
  window.open(`https://wa.me/?text=${text}%20${url}`, '_blank')
  showShareMenu.value = false
}

const shareOnFacebook = () => {
  const url = encodeURIComponent(getShareUrl())
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank')
  showShareMenu.value = false
}

const shareOnTwitter = () => {
  const url = encodeURIComponent(getShareUrl())
  const text = encodeURIComponent(getShareText())
  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank')
  showShareMenu.value = false
}

const shareOnLinkedIn = () => {
  const url = encodeURIComponent(getShareUrl())
  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank')
  showShareMenu.value = false
}

const shareByEmail = () => {
  const url = getShareUrl()
  const subject = encodeURIComponent(`Découvrez cette annonce sur ETNAir`)
  const body = encodeURIComponent(`${getShareText()}\n\n${url}`)
  window.location.href = `mailto:?subject=${subject}&body=${body}`
  showShareMenu.value = false
}

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(getShareUrl())
    linkCopied.value = true
    setTimeout(() => {
      linkCopied.value = false
    }, 2000)
  } catch (err) {
    console.error('Erreur lors de la copie:', err)
  }
}

const closeShareMenu = () => {
  showShareMenu.value = false
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Loading -->
    <div v-if="isLoading" class="max-w-7xl mx-auto px-4 py-8">
      <div class="animate-pulse">
        <div class="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div class="h-4 bg-gray-200 rounded w-1/3 mb-8"></div>
        <div class="grid grid-cols-4 grid-rows-2 gap-3 h-[500px]">
          <div class="col-span-2 row-span-2 bg-gray-200 rounded-2xl"></div>
          <div class="bg-gray-200 rounded-xl"></div>
          <div class="bg-gray-200 rounded-xl"></div>
          <div class="bg-gray-200 rounded-xl"></div>
          <div class="bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="max-w-7xl mx-auto px-4 py-16 text-center">
      <span class="material-icons-round text-6xl text-gray-300 mb-4">error_outline</span>
      <h2 class="text-2xl font-bold text-gray-700 mb-2">{{ error }}</h2>
      <RouterLink to="/research" class="text-primary hover:underline">
        Retour aux annonces
      </RouterLink>
    </div>

    <!-- Content -->
    <main v-else-if="announce" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">{{ announce.title }}</h1>
        <div class="flex flex-wrap items-center justify-between text-sm text-gray-500 gap-4">
          <div class="flex items-center gap-4">
            <span v-if="reviewsRating.count > 0" class="flex items-center gap-1 font-medium text-gray-900">
              <span class="material-icons-round text-primary text-base">star</span>
              {{ reviewsRating.average.toFixed(2) }} · <span class="underline cursor-pointer">{{ reviewsRating.count }} avis</span>
            </span>
            <span v-else class="text-gray-500">Nouveau</span>
            <span>·</span>
            <span class="underline cursor-pointer font-medium hover:text-primary">
              {{ announce.city || 'France' }}
            </span>
          </div>
          <div class="flex gap-4">
            <!-- Share Button with Dropdown -->
            <div class="relative">
              <button 
                @click="showShareMenu = !showShareMenu"
                class="flex items-center gap-2 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
              >
                <span class="material-icons-round text-base">ios_share</span> Partager
              </button>
              
              <!-- Share Menu Dropdown -->
              <div 
                v-if="showShareMenu" 
                class="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50"
              >
                <div class="px-4 py-2 border-b border-gray-100">
                  <p class="font-semibold text-gray-900 text-sm">Partager cette annonce</p>
                </div>
                
                <!-- Copy Link -->
                <button 
                  @click="copyLink"
                  class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <span class="material-icons-round text-gray-600">{{ linkCopied ? 'check' : 'link' }}</span>
                  <span class="text-sm text-gray-700">{{ linkCopied ? 'Lien copié !' : 'Copier le lien' }}</span>
                </button>
                
                <hr class="my-1 border-gray-100">
                
                <!-- WhatsApp -->
                <button 
                  @click="shareOnWhatsApp"
                  class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <span class="text-sm text-gray-700">WhatsApp</span>
                </button>
                
                <!-- Facebook -->
                <button 
                  @click="shareOnFacebook"
                  class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span class="text-sm text-gray-700">Facebook</span>
                </button>
                
                <!-- Twitter/X -->
                <button 
                  @click="shareOnTwitter"
                  class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <svg class="w-5 h-5 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  <span class="text-sm text-gray-700">X (Twitter)</span>
                </button>
                
                <!-- LinkedIn -->
                <button 
                  @click="shareOnLinkedIn"
                  class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <svg class="w-5 h-5 text-blue-700" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  <span class="text-sm text-gray-700">LinkedIn</span>
                </button>
                
                <!-- Email -->
                <button 
                  @click="shareByEmail"
                  class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <span class="material-icons-round text-gray-600">email</span>
                  <span class="text-sm text-gray-700">Email</span>
                </button>
              </div>
              
              <!-- Click outside to close -->
              <div 
                v-if="showShareMenu" 
                @click="closeShareMenu"
                class="fixed inset-0 z-40"
              ></div>
            </div>
            
            <button 
              @click="toggleFavorite"
              :disabled="togglingFavorite"
              :class="[
                'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                isFavorite ? 'bg-red-50 text-red-600' : 'hover:bg-gray-100'
              ]"
            >
              <span class="material-icons-round text-base">{{ isFavorite ? 'favorite' : 'favorite_border' }}</span>
              {{ isFavorite ? 'Sauvegardé' : 'Sauvegarder' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Image Gallery -->
      <div class="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-3 h-[400px] md:h-[500px] mb-10 rounded-2xl overflow-hidden">
        <div class="col-span-2 row-span-2 relative cursor-pointer hover:opacity-95 transition-opacity">
          <img 
            :src="announce.pictures?.[0]?.url || getPlaceholderImage(announce.type, 0)" 
            :alt="announce.title"
            class="w-full h-full object-cover"
          />
        </div>
        <div 
          v-for="i in 4" 
          :key="i" 
          class="hidden md:block cursor-pointer hover:opacity-95 transition-opacity"
        >
          <img 
            :src="announce.pictures?.[i]?.url || getPlaceholderImage(announce.type, i)" 
            :alt="`${announce.title} - ${i + 1}`"
            class="w-full h-full object-cover"
          />
        </div>
      </div>

      <!-- Main Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-12 relative">
        <!-- Left Column - Details -->
        <div class="lg:col-span-2 space-y-8">
          <!-- Host Info -->
          <div class="flex justify-between items-start pb-8 border-b border-gray-200">
            <div>
              <h2 class="text-2xl font-semibold mb-1 text-gray-900">
                {{ translateType(announce.type) }} proposé par {{ announce.user?.username || 'Hôte' }}
              </h2>
              <p class="text-gray-700">
                {{ announce.info?.capacity || '?' }} voyageurs · 
                {{ announce.info?.bedrooms || '?' }} chambre(s) · 
                {{ announce.info?.bathrooms || '?' }} salle(s) de bain
              </p>
            </div>
            <div class="bg-gray-200 rounded-full w-14 h-14 flex items-center justify-center">
              <span class="material-icons-round text-gray-500 text-2xl">person</span>
            </div>
          </div>

          <!-- Description -->
          <div class="pb-8 border-b border-gray-200">
            <h2 class="text-xl font-semibold mb-4 text-gray-900">À propos de ce logement</h2>
            <p class="text-gray-800 leading-relaxed">
              {{ announce.description || announce.info?.content || 'Aucune description disponible pour ce logement.' }}
            </p>
          </div>

          <!-- Amenities -->
          <div v-if="amenities.length > 0" class="pb-8 border-b border-gray-200">
            <h2 class="text-xl font-semibold mb-6 text-gray-900">Équipements</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                v-for="(amenity, index) in amenities.slice(0, 8)" 
                :key="index"
                class="flex items-center gap-3 text-gray-800"
              >
                <span class="material-icons-round text-gray-700">{{ getAmenityIcon(amenity) }}</span>
                <span>{{ amenity }}</span>
              </div>
            </div>
          </div>

          <!-- Rules -->
          <div v-if="announce.info?.rules" class="pb-8 border-b border-gray-200">
            <h2 class="text-xl font-semibold mb-4 text-gray-900">Règlement intérieur</h2>
            <p class="text-gray-800">{{ announce.info.rules }}</p>
          </div>

          <!-- Location avec carte OpenStreetMap -->
          <div class="pb-8 border-b border-gray-200">
            <h2 class="text-xl font-semibold mb-4 text-gray-900">Emplacement</h2>
            
            <!-- Carte OpenStreetMap -->
            <div class="relative rounded-xl overflow-hidden h-80 bg-gray-100">
              <!-- Chargement -->
              <div v-if="isLoadingLocation" class="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div class="text-center">
                  <svg class="animate-spin h-8 w-8 text-primary mx-auto mb-2" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p class="text-sm text-gray-500">Chargement de la carte...</p>
                </div>
              </div>
              
              <!-- Carte iframe -->
              <iframe 
                v-else-if="mapEmbedUrl"
                :src="mapEmbedUrl"
                class="w-full h-full border-0"
                loading="lazy"
                referrerpolicy="no-referrer-when-downgrade"
                allowfullscreen
              ></iframe>
              
              <!-- Fallback si pas de coordonnées -->
              <div v-else class="absolute inset-0 flex items-center justify-center">
                <div class="text-center">
                  <span class="material-icons-round text-primary text-4xl mb-2">location_on</span>
                  <p class="font-medium text-gray-900">{{ announce.city || 'France' }}</p>
                  <p class="text-sm text-gray-500">{{ announce.info?.address || '' }}</p>
                  <p class="text-sm text-gray-500">{{ announce.info?.postalCode || '' }} {{ announce.info?.country || '' }}</p>
                </div>
              </div>
            </div>
            
            <!-- Informations d'adresse et lien externe -->
            <div class="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p class="font-medium text-gray-900">{{ announce.city || 'France' }}</p>
                <p class="text-sm text-gray-500">
                  {{ announce.info?.address ? announce.info.address + ', ' : '' }}{{ announce.info?.postalCode || '' }} {{ announce.info?.country || '' }}
                </p>
              </div>
              <a 
                v-if="mapExternalUrl"
                :href="mapExternalUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
              >
                <span class="material-icons-round text-base">open_in_new</span>
                Voir sur OpenStreetMap
              </a>
            </div>
          </div>

          <!-- Reviews Section -->
          <div v-if="reviews.length > 0" class="pt-4">
            <div class="flex items-center gap-2 mb-6">
              <span class="material-icons-round text-yellow-500">star</span>
              <h2 class="text-xl font-semibold text-gray-900">
                {{ reviewsRating.average.toFixed(2) }} · {{ reviewsRating.count }} avis
              </h2>
            </div>
            
            <!-- Reviews Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div 
                v-for="review in displayedReviews" 
                :key="review.id"
                class="space-y-3"
              >
                <!-- Review Header -->
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <span class="material-icons-round text-gray-400">person</span>
                  </div>
                  <div>
                    <p class="font-semibold text-gray-900">{{ review.user?.username || 'Utilisateur' }}</p>
                    <p class="text-sm text-gray-500">{{ formatReviewDate(review.createdAt) }}</p>
                  </div>
                </div>
                
                <!-- Rating -->
                <div class="text-emerald-500 text-sm tracking-wider">
                  {{ renderStars(review.rating) }}
                </div>
                
                <!-- Comment -->
                <p class="text-gray-800 line-clamp-4">
                  {{ review.comment || 'Aucun commentaire.' }}
                </p>
              </div>
            </div>
            
            <!-- Show All Button -->
            <button 
              v-if="reviews.length > 6 && !showAllReviews"
              @click="showAllReviews = true"
              class="mt-8 px-6 py-3 border-2 border-gray-800 text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Afficher les {{ reviewsRating.count }} avis
            </button>
          </div>
          
          <!-- No Reviews -->
          <div v-else class="pt-4 text-center py-8">
            <span class="material-icons-round text-gray-300 text-5xl mb-2">rate_review</span>
            <p class="text-gray-500">Aucun avis pour le moment</p>
          </div>
          
          <!-- Write Review Section -->
          <div class="pt-6 border-t border-gray-200 mt-6">
            <!-- Button to show form -->
            <div v-if="!showReviewForm && !userHasReview">
              <button 
                @click="userStore.isAuthenticated ? showReviewForm = true : router.push(`/auth?redirect=/anounce/${announce.id}`)"
                class="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
              >
                <span class="material-icons-round">edit</span>
                Écrire un avis
              </button>
            </div>
            
            <!-- Already reviewed message -->
            <div v-else-if="userHasReview && !showReviewForm" class="flex items-center gap-2 text-emerald-600">
              <span class="material-icons-round">check_circle</span>
              <span class="font-medium">Vous avez déjà publié un avis</span>
            </div>
            
            <!-- Review Form -->
            <div v-if="showReviewForm" class="bg-gray-50 rounded-xl p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Votre avis</h3>
              
              <!-- Rating Selection -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">Note</label>
                <div class="flex gap-2">
                  <button 
                    v-for="star in 5" 
                    :key="star"
                    @click="newReviewRating = star"
                    class="text-3xl transition-colors focus:outline-none"
                    :class="star <= newReviewRating ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'"
                  >
                    ★
                  </button>
                </div>
              </div>
              
              <!-- Comment -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">Commentaire (optionnel)</label>
                <textarea 
                  v-model="newReviewComment"
                  rows="4"
                  placeholder="Partagez votre expérience..."
                  class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 resize-none"
                ></textarea>
              </div>
              
              <!-- Error -->
              <div v-if="reviewError" class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {{ reviewError }}
              </div>
              
              <!-- Buttons -->
              <div class="flex gap-3">
                <button 
                  @click="showReviewForm = false; reviewError = ''"
                  class="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-100 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  @click="submitReview"
                  :disabled="submittingReview"
                  class="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span v-if="submittingReview">Publication...</span>
                  <span v-else>Publier</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column - Booking Card -->
        <div class="lg:col-span-1">
          <div class="sticky top-28 bg-white border border-gray-200 rounded-2xl shadow-xl p-6">
            <!-- Success Message -->
            <div v-if="bookingSuccess" class="text-center py-8">
              <span class="material-icons-round text-primary text-5xl mb-4">check_circle</span>
              <h3 class="text-xl font-bold text-gray-900 mb-2">Réservation confirmée !</h3>
              <p class="text-gray-500">Redirection vers vos réservations...</p>
            </div>

            <template v-else>
              <!-- Price -->
              <div class="flex justify-between items-end mb-6">
                <div>
                  <span class="text-2xl font-bold text-gray-900">{{ formatPrice(announce.price) }}</span>
                  <span class="text-gray-500 text-sm"> / nuit</span>
                </div>
                <div class="flex items-center gap-1 text-sm text-gray-500">
                  <span class="material-icons-round text-primary text-sm">star</span>
                  <span v-if="reviewsRating.count > 0" class="font-semibold text-gray-900">{{ reviewsRating.average.toFixed(2) }}</span>
                  <span v-if="reviewsRating.count > 0" class="underline hover:text-primary cursor-pointer">{{ reviewsRating.count }} avis</span>
                  <span v-else class="text-gray-500">Nouveau</span>
                </div>
              </div>

              <!-- Date Selection -->
              <div class="border border-gray-300 rounded-xl mb-4 overflow-hidden">
                <div class="grid grid-cols-2 border-b border-gray-300">
                  <div class="p-3 border-r border-gray-300">
                    <div class="text-[10px] uppercase font-bold text-gray-900 tracking-wider">Arrivée</div>
                    <input 
                      v-model="checkIn"
                      type="date"
                      @change="checkAvailability"
                      class="w-full text-sm text-gray-600 border-none p-0 focus:ring-0"
                    />
                  </div>
                  <div class="p-3">
                    <div class="text-[10px] uppercase font-bold text-gray-900 tracking-wider">Départ</div>
                    <input 
                      v-model="checkOut"
                      type="date"
                      @change="checkAvailability"
                      class="w-full text-sm text-gray-600 border-none p-0 focus:ring-0"
                    />
                  </div>
                </div>
                <div class="p-3 flex justify-between items-center">
                  <div>
                    <div class="text-[10px] uppercase font-bold text-gray-900 tracking-wider">Voyageurs</div>
                    <div class="text-sm text-gray-600">{{ guestCount }} voyageur(s)</div>
                  </div>
                  <div class="flex items-center gap-3">
                    <button 
                      @click="guestCount = Math.max(1, guestCount - 1)"
                      class="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-primary transition-colors"
                    >
                      <span class="material-icons-round text-sm">remove</span>
                    </button>
                    <span class="font-semibold w-4 text-center">{{ guestCount }}</span>
                    <button 
                      @click="guestCount = Math.min(announce.info?.capacity || 10, guestCount + 1)"
                      class="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-primary transition-colors"
                    >
                      <span class="material-icons-round text-sm">add</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Availability Status -->
              <div v-if="checkingAvailability" class="text-center text-gray-500 text-sm mb-4">
                Vérification de la disponibilité...
              </div>
              <div v-else-if="isAvailable === true" class="flex items-center gap-2 text-green-600 text-sm mb-4">
                <span class="material-icons-round text-base">check_circle</span>
                Dates disponibles
              </div>
              <div v-else-if="isAvailable === false" class="flex items-center gap-2 text-red-600 text-sm mb-4">
                <span class="material-icons-round text-base">cancel</span>
                Ces dates ne sont pas disponibles
              </div>

              <!-- Error -->
              <div v-if="bookingError" class="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded-lg">
                {{ bookingError }}
              </div>

              <!-- Reserve Button -->
              <button 
                @click="makeReservation"
                :disabled="isBooking || isAvailable === false"
                class="w-full bg-primary hover:opacity-90 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span v-if="isBooking" class="flex items-center justify-center gap-2">
                  <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Réservation...
                </span>
                <span v-else>{{ userStore.isAuthenticated ? 'Réserver' : 'Se connecter pour réserver' }}</span>
              </button>

              <p class="text-center text-xs text-gray-500 mt-4 mb-6">
                Aucun montant ne sera débité pour le moment
              </p>

              <!-- Price Breakdown -->
              <div v-if="totalNights > 0" class="space-y-3 text-sm text-gray-500">
                <div class="flex justify-between">
                  <span class="underline cursor-pointer">{{ formatPrice(announce.price) }} x {{ totalNights }} nuit(s)</span>
                  <span class="text-gray-900">{{ formatPrice(totalPrice) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="underline cursor-pointer">Frais de service ETNAir</span>
                  <span class="text-gray-900">{{ formatPrice(serviceFee) }}</span>
                </div>
                <hr class="my-4 border-gray-200"/>
                <div class="flex justify-between font-bold text-lg text-gray-900">
                  <span>Total</span>
                  <span>{{ formatPrice(grandTotal) }}</span>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
input[type="date"]::-webkit-calendar-picker-indicator {
  opacity: 0.5;
}

input:focus {
  outline: none;
}
</style>