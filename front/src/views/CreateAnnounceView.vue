<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { announcesApi, type CreateAnnounceData } from '@/services/api'
import { useUserStore } from '@/stores/user'
import { searchAddress, debounce, type GeoLocation } from '@/services/geolocation'

const router = useRouter()
const userStore = useUserStore()

// Form data
const step = ref(1)
const propertyType = ref<'APARTMENT' | 'HOUSE' | 'VILLA' | 'STUDIO' | 'ROOM' | 'OTHER'>('APARTMENT')
const title = ref('')
const description = ref('')
const price = ref<number>(0)
const city = ref('')
const address = ref('')
const postalCode = ref('')
const country = ref('France')
const capacity = ref(4)
const bedrooms = ref(2)
const bathrooms = ref(1)
const amenities = ref<string[]>(['WiFi', 'Cuisine équipée'])
const rules = ref<string[]>(['Non-fumeur', 'Pas de fêtes'])
const isSubmitting = ref(false)
const error = ref('')

// Géolocalisation
const addressQuery = ref('')
const addressSuggestions = ref<GeoLocation[]>([])
const showAddressSuggestions = ref(false)
const isSearchingAddress = ref(false)
const selectedLocation = ref<GeoLocation | null>(null)
const latitude = ref<number | null>(null)
const longitude = ref<number | null>(null)

// Recherche d'adresse avec debounce
const debouncedSearch = debounce(async (query: string) => {
  if (query.length < 3) {
    addressSuggestions.value = []
    return
  }
  isSearchingAddress.value = true
  try {
    const results = await searchAddress(query)
    addressSuggestions.value = results
  } finally {
    isSearchingAddress.value = false
  }
}, 300)

// Surveiller les changements de la recherche d'adresse
watch(addressQuery, (newQuery) => {
  if (newQuery !== selectedLocation.value?.displayName) {
    showAddressSuggestions.value = true
    debouncedSearch(newQuery)
  }
})

// Cacher les suggestions avec un délai (pour permettre le clic)
const hideAddressSuggestions = () => {
  window.setTimeout(() => {
    showAddressSuggestions.value = false
  }, 200)
}

// Sélectionner une adresse suggérée
const selectAddress = (location: GeoLocation) => {
  selectedLocation.value = location
  addressQuery.value = location.displayName
  address.value = location.address
  city.value = location.city
  postalCode.value = location.postalCode
  country.value = location.country
  latitude.value = location.lat
  longitude.value = location.lon
  showAddressSuggestions.value = false
  addressSuggestions.value = []
}

// Amenities options
const amenitiesOptions = [
  { id: 'wifi', label: 'WiFi', icon: 'wifi' },
  { id: 'tv', label: 'TV', icon: 'tv' },
  { id: 'kitchen', label: 'Cuisine équipée', icon: 'countertops' },
  { id: 'washer', label: 'Lave-linge', icon: 'local_laundry_service' },
  { id: 'parking', label: 'Parking gratuit', icon: 'directions_car' },
  { id: 'ac', label: 'Climatisation', icon: 'ac_unit' },
]

// Rules options
const rulesOptions = [
  { id: 'no_smoking', label: 'Non-fumeur' },
  { id: 'no_pets', label: 'Pas d\'animaux' },
  { id: 'no_parties', label: 'Pas de fêtes' },
  { id: 'quiet_hours', label: 'Heures calmes (22h-8h)' },
]

// Toggle amenity
const toggleAmenity = (amenity: string) => {
  const index = amenities.value.indexOf(amenity)
  if (index > -1) {
    amenities.value.splice(index, 1)
  } else {
    amenities.value.push(amenity)
  }
}

// Toggle rule
const toggleRule = (rule: string) => {
  const index = rules.value.indexOf(rule)
  if (index > -1) {
    rules.value.splice(index, 1)
  } else {
    rules.value.push(rule)
  }
}

// Counter helpers
const increment = (field: 'capacity' | 'bedrooms' | 'bathrooms') => {
  if (field === 'capacity' && capacity.value < 20) capacity.value++
  if (field === 'bedrooms' && bedrooms.value < 10) bedrooms.value++
  if (field === 'bathrooms' && bathrooms.value < 10) bathrooms.value++
}

const decrement = (field: 'capacity' | 'bedrooms' | 'bathrooms') => {
  if (field === 'capacity' && capacity.value > 1) capacity.value--
  if (field === 'bedrooms' && bedrooms.value > 0) bedrooms.value--
  if (field === 'bathrooms' && bathrooms.value > 0) bathrooms.value--
}

// Validation
const isStep1Valid = computed(() => {
  return propertyType.value && address.value && city.value && country.value
})

const isStep2Valid = computed(() => {
  return amenities.value.length > 0
})

const isStep3Valid = computed(() => {
  return title.value.trim() && price.value > 0
})

// Navigation
const nextStep = () => {
  if (step.value === 1 && !isStep1Valid.value) {
    error.value = 'Veuillez remplir tous les champs requis'
    return
  }
  if (step.value === 2 && !isStep2Valid.value) {
    error.value = 'Veuillez sélectionner au moins un équipement'
    return
  }
  if (step.value < 3) {
    step.value++
    error.value = ''
  }
}

const prevStep = () => {
  if (step.value > 1) {
    step.value--
    error.value = ''
  }
}

// Submit
const submitListing = async () => {
  if (!isStep3Valid.value) {
    error.value = 'Veuillez remplir le titre et le prix'
    return
  }

  isSubmitting.value = true
  error.value = ''

  try {
    const data: CreateAnnounceData = {
      title: title.value,
      description: description.value || undefined,
      type: propertyType.value,
      price: price.value,
      city: city.value,
      info: {
        address: address.value,
        postalCode: postalCode.value,
        country: country.value,
        capacity: capacity.value,
        bedrooms: bedrooms.value,
        bathrooms: bathrooms.value,
        amenities: JSON.stringify(amenities.value),
        rules: rules.value.join(', '),
      },
    }

    const announce = await announcesApi.create(data)
    router.push(`/anounce/${announce.id}`)
  } catch (e: any) {
    error.value = e.message || 'Erreur lors de la création de l\'annonce'
  } finally {
    isSubmitting.value = false
  }
}

const saveAndExit = () => {
  router.push('/anounces')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 px-6 lg:px-10 py-3 sticky top-0 z-50">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <RouterLink to="/" class="flex items-center gap-3">
            <div class="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg flex items-center justify-center">
              <span class="text-white text-xl font-bold">E</span>
            </div>
            <h2 class="text-xl font-bold text-gray-900">ETNAir</h2>
          </RouterLink>
        </div>
        <div class="flex items-center gap-4">
          <button 
            @click="saveAndExit"
            class="px-6 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Sauvegarder & Quitter
          </button>
          <div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <span class="material-icons text-gray-500">person</span>
          </div>
        </div>
      </div>
    </header>

    <div class="flex flex-1 relative">
      <!-- Sidebar -->
      <aside class="hidden lg:flex w-80 flex-col bg-white border-r border-gray-200 sticky top-[65px] h-[calc(100vh-65px-72px)]">
        <div class="p-6 flex flex-col h-full justify-between overflow-y-auto">
          <div class="flex flex-col gap-6">
            <div>
              <h1 class="text-lg font-bold text-gray-900">Votre Annonce</h1>
              <p class="text-sm text-gray-500">Création d'une nouvelle propriété</p>
            </div>
            <nav class="flex flex-col gap-2">
              <!-- Step 1 -->
              <div 
                :class="[
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer',
                  step === 1 ? 'bg-emerald-50 border-l-4 border-emerald-500' : 'text-gray-500 hover:bg-gray-50'
                ]"
                @click="step = 1"
              >
                <span :class="['material-icons', step === 1 ? 'text-emerald-500' : '']">house</span>
                <div>
                  <p :class="['text-sm font-bold', step === 1 ? 'text-gray-900' : '']">Détails de la propriété</p>
                  <p :class="['text-xs font-medium', step === 1 ? 'text-emerald-600' : 'text-gray-400']">Étape 1</p>
                </div>
              </div>
              <!-- Step 2 -->
              <div 
                :class="[
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer',
                  step === 2 ? 'bg-emerald-50 border-l-4 border-emerald-500' : 'text-gray-500 hover:bg-gray-50'
                ]"
                @click="step = 2"
              >
                <span :class="['material-icons', step === 2 ? 'text-emerald-500' : '']">list_alt</span>
                <div>
                  <p :class="['text-sm font-bold', step === 2 ? 'text-gray-900' : '']">Équipements & Règles</p>
                  <p :class="['text-xs font-medium', step === 2 ? 'text-emerald-600' : 'text-gray-400']">Étape 2</p>
                </div>
              </div>
              <!-- Step 3 -->
              <div 
                :class="[
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer',
                  step === 3 ? 'bg-emerald-50 border-l-4 border-emerald-500' : 'text-gray-500 hover:bg-gray-50'
                ]"
                @click="step = 3"
              >
                <span :class="['material-icons', step === 3 ? 'text-emerald-500' : '']">payments</span>
                <div>
                  <p :class="['text-sm font-bold', step === 3 ? 'text-gray-900' : '']">Prix & Description</p>
                  <p :class="['text-xs font-medium', step === 3 ? 'text-emerald-600' : 'text-gray-400']">Étape 3</p>
                </div>
              </div>
            </nav>
          </div>
          <div class="bg-emerald-50 p-4 rounded-xl flex items-start gap-3 mt-6 flex-shrink-0">
            <span class="material-icons text-emerald-600">lightbulb</span>
            <div>
              <p class="text-xs font-bold text-gray-900 mb-1">Astuce</p>
              <p class="text-xs text-gray-600">Des photos de qualité augmentent les réservations jusqu'à 20%.</p>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 py-8 px-4 sm:px-8 lg:px-12">
        <div class="max-w-3xl mx-auto space-y-12 pb-24">
          <!-- Header -->
          <div>
            <h1 class="text-4xl font-black text-gray-900 mb-2">Créer une Annonce</h1>
            <p class="text-lg text-gray-600">Suivez les étapes ci-dessous pour configurer votre propriété.</p>
          </div>

          <!-- Error Message -->
          <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <span class="material-icons">error</span>
            {{ error }}
          </div>

          <!-- STEP 1: Property Details -->
          <div v-if="step === 1" class="space-y-8">
            <div class="flex items-center gap-4 border-b border-gray-200 pb-4">
              <div class="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white font-bold text-lg">1</div>
              <div>
                <h2 class="text-2xl font-bold text-gray-900">Détails de la Propriété</h2>
                <p class="text-sm text-gray-600">Les informations fondamentales de votre logement.</p>
              </div>
            </div>

            <!-- Property Type -->
            <section class="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
              <h3 class="text-xl font-bold mb-6 text-gray-900">Quel type de logement ?</h3>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                <label 
                  v-for="type in ['APARTMENT', 'HOUSE', 'VILLA', 'STUDIO', 'ROOM', 'OTHER']" 
                  :key="type"
                  class="cursor-pointer"
                >
                  <input 
                    v-model="propertyType" 
                    :value="type" 
                    type="radio" 
                    class="peer sr-only"
                  />
                  <div class="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-gray-300 p-4 h-32 transition-all hover:border-emerald-500 peer-checked:border-emerald-500 peer-checked:bg-emerald-50">
                    <span class="material-icons text-3xl text-gray-500 peer-checked:text-emerald-500">
                      {{ type === 'APARTMENT' ? 'apartment' : type === 'HOUSE' ? 'house' : type === 'VILLA' ? 'cottage' : type === 'STUDIO' ? 'home_work' : type === 'ROOM' ? 'bed' : 'hotel' }}
                    </span>
                    <span class="text-sm font-bold text-gray-700">
                      {{ type === 'APARTMENT' ? 'Appartement' : type === 'HOUSE' ? 'Maison' : type === 'VILLA' ? 'Villa' : type === 'STUDIO' ? 'Studio' : type === 'ROOM' ? 'Chambre' : 'Autre' }}
                    </span>
                  </div>
                </label>
              </div>
            </section>

            <!-- Location -->
            <section class="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
              <h3 class="text-xl font-bold mb-2 text-gray-900">Où se situe votre logement ?</h3>
              <p class="text-gray-600 mb-6 text-sm">Votre adresse n'est partagée qu'après réservation.</p>
              <div class="space-y-4">
                <!-- Recherche d'adresse avec autocomplétion -->
                <div class="relative">
                  <label class="block text-sm font-semibold text-gray-900 mb-2">
                    <span class="material-icons text-emerald-500 text-sm align-middle mr-1">search</span>
                    Rechercher une adresse
                  </label>
                  <div class="relative">
                    <input 
                      v-model="addressQuery"
                      type="text" 
                      placeholder="Tapez une adresse pour la rechercher..."
                      @focus="showAddressSuggestions = addressSuggestions.length > 0"
                      @blur="hideAddressSuggestions"
                      class="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    <span v-if="isSearchingAddress" class="absolute right-3 top-1/2 -translate-y-1/2">
                      <svg class="animate-spin h-5 w-5 text-emerald-500" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </span>
                  </div>
                  
                  <!-- Suggestions dropdown -->
                  <div 
                    v-if="showAddressSuggestions && addressSuggestions.length > 0"
                    class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
                  >
                    <button
                      v-for="suggestion in addressSuggestions"
                      :key="suggestion.placeId"
                      @mousedown.prevent="selectAddress(suggestion)"
                      class="w-full px-4 py-3 text-left hover:bg-emerald-50 border-b border-gray-100 last:border-0 flex items-start gap-3 transition-colors"
                    >
                      <span class="material-icons text-emerald-500 mt-0.5 flex-shrink-0">location_on</span>
                      <div class="min-w-0">
                        <p class="font-medium text-gray-900 truncate">
                          {{ suggestion.address || suggestion.city }}
                        </p>
                        <p class="text-sm text-gray-500 truncate">
                          {{ suggestion.postalCode }} {{ suggestion.city }}, {{ suggestion.country }}
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                <!-- Adresse sélectionnée (si disponible) -->
                <div v-if="selectedLocation" class="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div class="flex items-center gap-2 text-emerald-700 mb-2">
                    <span class="material-icons text-base">check_circle</span>
                    <span class="font-semibold text-sm">Adresse sélectionnée</span>
                  </div>
                  <p class="text-gray-900 font-medium">{{ address }}</p>
                  <p class="text-gray-600 text-sm">{{ postalCode }} {{ city }}, {{ country }}</p>
                </div>

                <!-- Champs manuels (pré-remplis par l'autocomplétion) -->
                <div class="pt-4 border-t border-gray-200">
                  <p class="text-xs text-gray-500 mb-4">Ou remplissez manuellement :</p>
                  <div class="space-y-4">
                    <div>
                      <label class="block text-sm font-semibold text-gray-900 mb-2">Adresse</label>
                      <input 
                        v-model="address"
                        type="text" 
                        placeholder="ex: 123 Rue de la Paix"
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label class="block text-sm font-semibold text-gray-900 mb-2">Ville</label>
                        <input 
                          v-model="city"
                          type="text" 
                          placeholder="ex: Paris"
                          class="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label class="block text-sm font-semibold text-gray-900 mb-2">Code Postal</label>
                        <input 
                          v-model="postalCode"
                          type="text" 
                          placeholder="ex: 75001"
                          class="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label class="block text-sm font-semibold text-gray-900 mb-2">Pays</label>
                      <select 
                        v-model="country"
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option>France</option>
                        <option>Belgique</option>
                        <option>Suisse</option>
                        <option>Canada</option>
                        <option>États-Unis</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- Basics -->
            <section class="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
              <h3 class="text-xl font-bold mb-6 text-gray-900">Informations de base</h3>
              <div class="divide-y divide-gray-200">
                <div class="flex items-center justify-between py-6 first:pt-0">
                  <div>
                    <p class="font-bold text-gray-900">Voyageurs</p>
                    <p class="text-sm text-gray-600">Capacité maximale</p>
                  </div>
                  <div class="flex items-center gap-4">
                    <button 
                      @click="decrement('capacity')"
                      class="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-gray-900 transition-colors"
                    >
                      <span class="material-icons text-lg">remove</span>
                    </button>
                    <span class="font-bold w-6 text-center text-gray-900">{{ capacity }}</span>
                    <button 
                      @click="increment('capacity')"
                      class="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-gray-900 transition-colors"
                    >
                      <span class="material-icons text-lg">add</span>
                    </button>
                  </div>
                </div>
                <div class="flex items-center justify-between py-6">
                  <p class="font-bold text-gray-900">Chambres</p>
                  <div class="flex items-center gap-4">
                    <button 
                      @click="decrement('bedrooms')"
                      class="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-gray-900 transition-colors"
                    >
                      <span class="material-icons text-lg">remove</span>
                    </button>
                    <span class="font-bold w-6 text-center text-gray-900">{{ bedrooms }}</span>
                    <button 
                      @click="increment('bedrooms')"
                      class="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-gray-900 transition-colors"
                    >
                      <span class="material-icons text-lg">add</span>
                    </button>
                  </div>
                </div>
                <div class="flex items-center justify-between py-6">
                  <p class="font-bold text-gray-900">Salles de bain</p>
                  <div class="flex items-center gap-4">
                    <button 
                      @click="decrement('bathrooms')"
                      class="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-gray-900 transition-colors"
                    >
                      <span class="material-icons text-lg">remove</span>
                    </button>
                    <span class="font-bold w-6 text-center text-gray-900">{{ bathrooms }}</span>
                    <button 
                      @click="increment('bathrooms')"
                      class="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-gray-900 transition-colors"
                    >
                      <span class="material-icons text-lg">add</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <!-- STEP 2: Amenities & Rules -->
          <div v-if="step === 2" class="space-y-8">
            <div class="flex items-center gap-4 border-b border-gray-200 pb-4">
              <div class="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white font-bold text-lg">2</div>
              <div>
                <h2 class="text-2xl font-bold text-gray-900">Équipements & Règles</h2>
                <p class="text-sm text-gray-600">Ce que vous offrez et attendez.</p>
              </div>
            </div>

            <!-- Amenities -->
            <section class="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
              <h3 class="text-xl font-bold mb-6 text-gray-900">Qu'offre votre logement ?</h3>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <label 
                  v-for="amenity in amenitiesOptions" 
                  :key="amenity.id"
                  class="cursor-pointer"
                >
                  <input 
                    :checked="amenities.includes(amenity.label)"
                    @change="toggleAmenity(amenity.label)"
                    type="checkbox" 
                    class="peer sr-only"
                  />
                  <div class="flex flex-col gap-3 p-4 rounded-xl border border-gray-300 hover:border-gray-400 peer-checked:border-emerald-500 peer-checked:bg-emerald-50 transition-all h-full">
                    <span class="material-icons text-2xl text-gray-900">{{ amenity.icon }}</span>
                    <span class="text-sm font-medium text-gray-900">{{ amenity.label }}</span>
                  </div>
                </label>
              </div>
            </section>

            <!-- Rules -->
            <section class="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
              <h3 class="text-xl font-bold mb-6 text-gray-900">Règlement</h3>
              <div class="space-y-4">
                <label 
                  v-for="rule in rulesOptions" 
                  :key="rule.id"
                  class="flex items-center gap-3 cursor-pointer"
                >
                  <input 
                    :checked="rules.includes(rule.label)"
                    @change="toggleRule(rule.label)"
                    type="checkbox"
                    class="w-5 h-5 text-emerald-500 rounded border-gray-300 focus:ring-emerald-500"
                  />
                  <span class="text-gray-900">{{ rule.label }}</span>
                </label>
              </div>
            </section>
          </div>

          <!-- STEP 3: Pricing & Description -->
          <div v-if="step === 3" class="space-y-8">
            <div class="flex items-center gap-4 border-b border-gray-200 pb-4">
              <div class="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white font-bold text-lg">3</div>
              <div>
                <h2 class="text-2xl font-bold text-gray-900">Prix & Description</h2>
                <p class="text-sm text-gray-600">Détails finaux et tarification.</p>
              </div>
            </div>

            <!-- Description -->
            <section class="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
              <h3 class="text-xl font-bold mb-6 text-gray-900">Décrivez votre logement</h3>
              <div class="space-y-6">
                <div>
                  <label class="block text-sm font-semibold text-gray-900 mb-2">Titre</label>
                  <input 
                    v-model="title"
                    type="text" 
                    placeholder="ex: Appartement cosy au centre-ville"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-bold text-lg"
                  />
                </div>
                <div>
                  <label class="block text-sm font-semibold text-gray-900 mb-2">Description</label>
                  <textarea 
                    v-model="description"
                    placeholder="Partagez ce qui rend votre logement spécial..."
                    rows="6"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  ></textarea>
                </div>
              </div>
            </section>

            <!-- Pricing -->
            <section class="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
              <h3 class="text-xl font-bold mb-2 text-gray-900">Définissez votre prix</h3>
              <p class="text-gray-600 mb-6 text-sm">Vous pourrez le modifier à tout moment.</p>
              <div class="relative max-w-xs">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-900">€</span>
                <input 
                  v-model.number="price"
                  type="number" 
                  min="0"
                  placeholder="00"
                  class="w-full pl-10 pr-24 py-4 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-3xl font-bold"
                />
                <span class="absolute right-4 top-1/2 -translate-y-1/2 text-base text-gray-600">/ nuit</span>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>

    <!-- Footer -->
    <footer class="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white p-4 lg:pl-80 z-40">
      <div class="max-w-3xl mx-auto flex items-center justify-between px-4 lg:px-12">
        <button 
          v-if="step > 1"
          @click="prevStep"
          class="text-gray-900 font-bold text-sm underline hover:text-gray-600"
        >
          Retour
        </button>
        <div v-else></div>
        <button 
          v-if="step < 3"
          @click="nextStep"
          class="px-8 py-3 bg-primary hover:bg-emerald-600 text-white font-bold rounded-lg shadow-lg transition-colors"
        >
          Continuer
        </button>
        <button 
          v-else
          @click="submitListing"
          :disabled="isSubmitting"
          class="px-8 py-3 bg-primary hover:bg-emerald-600 text-white font-bold rounded-lg shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isSubmitting ? 'Création...' : 'Créer l\'annonce' }}
        </button>
      </div>
    </footer>
  </div>
</template>

<style scoped>
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
