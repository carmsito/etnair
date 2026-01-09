<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { reservationsApi, type Reservation } from '@/services/api'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

// State
const myReservations = ref<Reservation[]>([])
const receivedReservations = ref<Reservation[]>([])
const isLoading = ref(true)
const mainTab = ref<'my' | 'received'>('my')
const activeTab = ref<'all' | 'upcoming' | 'pending' | 'past' | 'cancelled'>('all')
const cancellingId = ref<number | null>(null)
const updatingId = ref<number | null>(null)

// Load reservations
const loadReservations = async () => {
  isLoading.value = true
  try {
    const [myResult, receivedResult] = await Promise.all([
      reservationsApi.getAll(),
      reservationsApi.getReceived()
    ])
    myReservations.value = Array.isArray(myResult) ? myResult : myResult.data
    receivedReservations.value = receivedResult
  } catch (error) {
    console.error('Erreur lors du chargement des réservations:', error)
    myReservations.value = []
    receivedReservations.value = []
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  if (!userStore.isAuthenticated) {
    router.push('/auth?redirect=/reservations')
    return
  }
  loadReservations()
})

// Current list based on main tab
const currentList = computed(() => {
  return mainTab.value === 'my' ? myReservations.value : receivedReservations.value
})

// Filter reservations by tab
const filteredReservations = computed(() => {
  const now = new Date()
  now.setHours(0, 0, 0, 0) // Comparer uniquement les dates, pas les heures
  
  if (activeTab.value === 'all') {
    return currentList.value
  }
  
  return currentList.value.filter(r => {
    const arriveDate = new Date(r.arriveAt)
    const leaveDate = new Date(r.leaveAt)
    leaveDate.setHours(23, 59, 59, 999) // Fin de journée pour le départ
    
    switch (activeTab.value) {
      case 'upcoming':
        // Confirmées: arrivée dans le futur OU séjour en cours (arrivée passée mais départ futur)
        return r.status === 'CONFIRMED' && leaveDate >= now
      case 'pending':
        return r.status === 'PENDING'
      case 'past':
        // Passées: terminées OU confirmées avec départ dans le passé
        return r.status === 'COMPLETED' || (r.status === 'CONFIRMED' && leaveDate < now)
      case 'cancelled':
        return r.status === 'CANCELLED'
      default:
        return true
    }
  })
})

// Tab counts
const tabCounts = computed(() => {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const list = currentList.value
  return {
    upcoming: list.filter(r => {
      const leaveDate = new Date(r.leaveAt)
      leaveDate.setHours(23, 59, 59, 999)
      return r.status === 'CONFIRMED' && leaveDate >= now
    }).length,
    pending: list.filter(r => r.status === 'PENDING').length,
    past: list.filter(r => {
      const leaveDate = new Date(r.leaveAt)
      leaveDate.setHours(23, 59, 59, 999)
      return r.status === 'COMPLETED' || (r.status === 'CONFIRMED' && leaveDate < now)
    }).length,
    cancelled: list.filter(r => r.status === 'CANCELLED').length,
  }
})

// Main tab counts
const receivedPendingCount = computed(() => {
  return receivedReservations.value.filter(r => r.status === 'PENDING').length
})

// Cancel reservation
const cancelReservation = async (id: number) => {
  if (!confirm('Êtes-vous sûr de vouloir annuler cette réservation ?')) return
  
  cancellingId.value = id
  try {
    await reservationsApi.updateStatus(id, 'CANCELLED')
    await loadReservations()
  } catch (error) {
    console.error('Erreur lors de l\'annulation:', error)
  } finally {
    cancellingId.value = null
  }
}

// Confirm reservation (for received)
const confirmReservation = async (id: number) => {
  updatingId.value = id
  try {
    await reservationsApi.updateStatus(id, 'CONFIRMED')
    await loadReservations()
  } catch (error) {
    console.error('Erreur lors de la confirmation:', error)
  } finally {
    updatingId.value = null
  }
}

// Refuse reservation (for received)
const refuseReservation = async (id: number) => {
  if (!confirm('Êtes-vous sûr de vouloir refuser cette réservation ?')) return
  
  updatingId.value = id
  try {
    await reservationsApi.updateStatus(id, 'CANCELLED')
    await loadReservations()
  } catch (error) {
    console.error('Erreur lors du refus:', error)
  } finally {
    updatingId.value = null
  }
}

// Mark reservation as completed
const completeReservation = async (id: number) => {
  updatingId.value = id
  try {
    await reservationsApi.updateStatus(id, 'COMPLETED')
    await loadReservations()
  } catch (error) {
    console.error('Erreur lors de la finalisation:', error)
  } finally {
    updatingId.value = null
  }
}
// Helper functions
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price)
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })
}

const formatDateRange = (start: string, end: string) => {
  return `${formatDate(start)} - ${formatDate(end)}`
}

const getNightsCount = (start: string, end: string) => {
  const startDate = new Date(start)
  const endDate = new Date(end)
  return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    PENDING: 'En attente',
    CONFIRMED: 'Confirmée',
    CANCELLED: 'Annulée',
    COMPLETED: 'Terminée',
  }
  return labels[status] || status
}

const getPlaceholderImage = (index: number) => {
  const images = [
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600',
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600',
  ]
  return images[index % images.length]
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <main class="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Réservations</h1>
          <p class="text-gray-500 mt-1">Gérez vos réservations et demandes.</p>
        </div>
        <RouterLink 
          to="/research"
          class="mt-4 md:mt-0 inline-flex items-center gap-2 text-primary hover:underline font-medium"
        >
          <span class="material-icons-round text-base">search</span>
          Explorer les logements
        </RouterLink>
      </div>

      <!-- Main Tabs (My reservations / Received) -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div class="flex">
          <button 
            @click="mainTab = 'my'"
            :class="[
              'flex-1 py-4 px-6 text-center font-medium transition-colors relative',
              mainTab === 'my' 
                ? 'text-primary bg-primary/5' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            ]"
          >
            <span class="flex items-center justify-center gap-2">
              <span class="material-icons-round text-xl">flight_takeoff</span>
              Mes réservations
            </span>
            <div v-if="mainTab === 'my'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
          </button>
          <button 
            @click="mainTab = 'received'"
            :class="[
              'flex-1 py-4 px-6 text-center font-medium transition-colors relative',
              mainTab === 'received' 
                ? 'text-primary bg-primary/5' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            ]"
          >
            <span class="flex items-center justify-center gap-2">
              <span class="material-icons-round text-xl">inbox</span>
              Réservations reçues
              <span 
                v-if="receivedPendingCount > 0"
                class="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full"
              >
                {{ receivedPendingCount }}
              </span>
            </span>
            <div v-if="mainTab === 'received'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
          </button>
        </div>
      </div>

      <!-- Sub Tabs -->
      <div class="border-b border-gray-200 mb-8">
        <nav class="-mb-px flex space-x-8" aria-label="Tabs">
          <button 
            @click="activeTab = 'all'"
            :class="[
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors',
              activeTab === 'all' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            Toutes
            <span 
              v-if="currentList.length > 0"
              class="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs"
            >
              {{ currentList.length }}
            </span>
          </button>
          <button 
            @click="activeTab = 'upcoming'"
            :class="[
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors',
              activeTab === 'upcoming' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            {{ mainTab === 'my' ? 'À venir' : 'Confirmées' }}
            <span 
              v-if="tabCounts.upcoming > 0"
              class="bg-green-100 text-green-700 py-0.5 px-2 rounded-full text-xs"
            >
              {{ tabCounts.upcoming }}
            </span>
          </button>
          <button 
            @click="activeTab = 'pending'"
            :class="[
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors',
              activeTab === 'pending' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            En attente
            <span 
              v-if="tabCounts.pending > 0"
              class="bg-yellow-100 text-yellow-800 py-0.5 px-2 rounded-full text-xs"
            >
              {{ tabCounts.pending }}
            </span>
          </button>
          <button 
            @click="activeTab = 'past'"
            :class="[
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'past' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            Passées
          </button>
          <button 
            @click="activeTab = 'cancelled'"
            :class="[
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'cancelled' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            {{ mainTab === 'my' ? 'Annulées' : 'Refusées' }}
          </button>
        </nav>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="space-y-6">
        <div v-for="i in 3" :key="i" class="animate-pulse bg-white rounded-2xl p-6 border border-gray-100">
          <div class="flex gap-6">
            <div class="w-48 h-32 bg-gray-200 rounded-xl"></div>
            <div class="flex-1">
              <div class="h-5 bg-gray-200 rounded w-1/3 mb-3"></div>
              <div class="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div class="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Reservations List -->
      <div v-else-if="filteredReservations.length > 0" class="space-y-6">
        <div 
          v-for="reservation in filteredReservations" 
          :key="reservation.id"
          class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 hover:border-primary/30 transition-colors"
        >
          <div class="flex flex-col md:flex-row gap-6">
            <!-- Image -->
            <div class="w-full md:w-48 h-32 flex-shrink-0 relative">
              <img 
                :src="reservation.announce?.pictures?.[0]?.url || getPlaceholderImage(reservation.id)" 
                :alt="reservation.announce?.title || 'Logement'"
                class="w-full h-full object-cover rounded-xl"
              />
              <div class="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md">
                {{ getNightsCount(reservation.arriveAt, reservation.leaveAt) }} nuit(s)
              </div>
              <div 
                v-if="mainTab === 'received' && reservation.status === 'PENDING'"
                class="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-md animate-pulse"
              >
                Nouvelle
              </div>
            </div>

            <!-- Content -->
            <div class="flex-grow flex flex-col justify-between">
              <div class="flex justify-between items-start">
                <div>
                  <div class="flex items-center gap-2 mb-1">
                    <span :class="['inline-block w-2 h-2 rounded-full', 
                      reservation.status === 'CONFIRMED' ? 'bg-green-500' :
                      reservation.status === 'PENDING' ? 'bg-yellow-500' :
                      reservation.status === 'CANCELLED' ? 'bg-gray-400' : 'bg-blue-500'
                    ]"></span>
                    <span :class="['text-xs font-bold uppercase tracking-wide',
                      reservation.status === 'CONFIRMED' ? 'text-green-600' :
                      reservation.status === 'PENDING' ? 'text-yellow-600' :
                      reservation.status === 'CANCELLED' ? 'text-gray-500' : 'text-blue-600'
                    ]">
                      {{ getStatusLabel(reservation.status) }}
                    </span>
                  </div>
                  <h3 class="text-lg font-bold text-gray-900">
                    {{ reservation.announce?.title || reservation.title || 'Réservation' }}
                  </h3>
                  <p class="text-sm text-gray-500">{{ reservation.city || reservation.announce?.city || 'France' }}</p>
                  
                  <!-- Guest info for received reservations -->
                  <div v-if="mainTab === 'received' && reservation.user" class="mt-2 flex items-center gap-2 text-sm">
                    <div class="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                      <span class="material-icons-round text-gray-500 text-sm">person</span>
                    </div>
                    <span class="text-gray-700 font-medium">{{ reservation.user.username }}</span>
                    <span class="text-gray-400">·</span>
                    <span class="text-gray-500">{{ reservation.user.email }}</span>
                  </div>
                </div>
                <div class="text-right">
                  <p class="font-bold text-gray-900 text-lg">{{ formatPrice(reservation.totalPrice) }}</p>
                  <p class="text-xs text-gray-500">{{ reservation.guestCount || 1 }} voyageur(s)</p>
                </div>
              </div>

              <!-- Dates and actions -->
              <div class="flex flex-col md:flex-row md:items-center justify-between mt-4">
                <div class="flex items-center gap-6 text-sm text-gray-500 mb-4 md:mb-0">
                  <div class="flex items-center gap-2">
                    <span class="material-icons-round text-gray-400">calendar_month</span>
                    <span class="text-gray-900 font-medium">{{ formatDateRange(reservation.arriveAt, reservation.leaveAt) }}</span>
                  </div>
                  <div v-if="reservation.user?.phone && mainTab === 'received'" class="flex items-center gap-2">
                    <span class="material-icons-round text-gray-400">phone</span>
                    <span>{{ reservation.user.phone }}</span>
                  </div>
                </div>

                <!-- Actions for My Reservations -->
                <div v-if="mainTab === 'my'" class="flex gap-2">
                  <RouterLink 
                    v-if="reservation.announce"
                    :to="`/anounce/${reservation.announce.id}`"
                    class="text-sm font-semibold text-primary hover:text-primary/80 border border-primary/20 hover:bg-primary/5 px-4 py-2 rounded-lg transition-colors"
                  >
                    Voir détails
                  </RouterLink>
                  <button 
                    v-if="reservation.status === 'CONFIRMED'"
                    @click="completeReservation(reservation.id)"
                    :disabled="updatingId === reservation.id"
                    class="text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    <span class="material-icons-round text-sm">check_circle</span>
                    {{ updatingId === reservation.id ? '...' : 'Terminé' }}
                  </button>
                  <button 
                    v-if="reservation.status === 'PENDING' || reservation.status === 'CONFIRMED'"
                    @click="cancelReservation(reservation.id)"
                    :disabled="cancellingId === reservation.id"
                    class="text-sm font-semibold text-red-600 hover:text-red-700 border border-red-200 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {{ cancellingId === reservation.id ? '...' : 'Annuler' }}
                  </button>
                </div>

                <!-- Actions for Received Reservations -->
                <div v-else class="flex gap-2">
                  <RouterLink 
                    v-if="reservation.announce"
                    :to="`/anounce/${reservation.announce.id}`"
                    class="text-sm font-semibold text-gray-600 hover:text-gray-800 border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors"
                  >
                    Voir l'annonce
                  </RouterLink>
                  <template v-if="reservation.status === 'PENDING'">
                    <button 
                      @click="confirmReservation(reservation.id)"
                      :disabled="updatingId === reservation.id"
                      class="text-sm font-semibold text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      <span class="material-icons-round text-sm">check</span>
                      {{ updatingId === reservation.id ? '...' : 'Accepter' }}
                    </button>
                    <button 
                      @click="refuseReservation(reservation.id)"
                      :disabled="updatingId === reservation.id"
                      class="text-sm font-semibold text-red-600 hover:text-red-700 border border-red-200 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      <span class="material-icons-round text-sm">close</span>
                      Refuser
                    </button>
                  </template>
                  <button 
                    v-if="reservation.status === 'CONFIRMED'"
                    @click="completeReservation(reservation.id)"
                    :disabled="updatingId === reservation.id"
                    class="text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    <span class="material-icons-round text-sm">check_circle</span>
                    {{ updatingId === reservation.id ? '...' : 'Terminé' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-16">
        <span class="material-icons-round text-6xl text-gray-300 mb-4">
          {{ mainTab === 'my' ? 'flight_takeoff' : 'inbox' }}
        </span>
        <h3 class="text-xl font-semibold text-gray-700 mb-2">
          <template v-if="mainTab === 'my'">
            {{ activeTab === 'upcoming' ? 'Aucune réservation à venir' :
               activeTab === 'pending' ? 'Aucune réservation en attente' :
               activeTab === 'past' ? 'Aucune réservation passée' :
               'Aucune réservation annulée' }}
          </template>
          <template v-else>
            {{ activeTab === 'upcoming' ? 'Aucune réservation confirmée' :
               activeTab === 'pending' ? 'Aucune demande en attente' :
               activeTab === 'past' ? 'Aucune réservation passée' :
               'Aucune réservation refusée' }}
          </template>
        </h3>
        <p class="text-gray-500 mb-6">
          <template v-if="mainTab === 'my'">
            {{ activeTab === 'upcoming' ? 'Réservez votre prochain séjour dès maintenant !' : 'Rien à afficher ici.' }}
          </template>
          <template v-else>
            {{ activeTab === 'pending' ? 'Les demandes de réservation apparaîtront ici.' : 'Rien à afficher ici.' }}
          </template>
        </p>
        <RouterLink 
          v-if="mainTab === 'my' && activeTab === 'upcoming'"
          to="/research"
          class="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          <span class="material-icons-round">search</span>
          Explorer les logements
        </RouterLink>
        <RouterLink 
          v-if="mainTab === 'received' && receivedReservations.length === 0"
          to="/anounces/create"
          class="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          <span class="material-icons-round">add</span>
          Créer une annonce
        </RouterLink>
      </div>
    </main>
  </div>
</template>

<style scoped>
</style>
