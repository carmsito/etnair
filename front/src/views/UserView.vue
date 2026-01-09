<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { useRouter, RouterLink } from 'vue-router';
import { usersApi, announcesApi, reservationsApi, favoritesApi, type Announce, type Reservation, type Favorite } from '@/services/api';

const userStore = useUserStore();
const router = useRouter();

const loading = ref(true);
const saving = ref(false);
const error = ref('');
const success = ref('');

// Données du profil
const editForm = ref({
  username: '',
  email: '',
  phone: ''
});

// Statistiques
const stats = ref({
  activeListings: 0,
  totalTrips: 0,
  rating: 4.9,
  favorites: 0
});

// Propriétés de l'utilisateur
const myProperties = ref<Announce[]>([]);

// Favoris de l'utilisateur
const myFavorites = ref<Favorite[]>([]);

// Voyages récents
const recentTrips = ref<Reservation[]>([]);

// Tab active (properties ou favorites)
const activeTab = ref<'properties' | 'favorites'>('properties');

// Date d'inscription
const memberSince = ref('2025');

onMounted(async () => {
  if (!userStore.id) {
    router.push('/auth');
    return;
  }
  
  editForm.value = {
    username: userStore.username || '',
    email: userStore.email || '',
    phone: userStore.phone || ''
  };
  
  await loadData();
});

const loadData = async () => {
  loading.value = true;
  try {
    // Charger les annonces de l'utilisateur
    if (userStore.id) {
      const userAnnounces = await announcesApi.getByUserId(userStore.id);
      myProperties.value = userAnnounces;
      stats.value.activeListings = userAnnounces.filter((a: Announce) => a.isActive).length;
    }
    
    // Charger les favoris
    try {
      const favorites = await favoritesApi.getAll();
      myFavorites.value = favorites;
      stats.value.favorites = favorites.length;
    } catch (err) {
      console.log('Favoris non chargés');
    }
    
    // Charger les réservations
    try {
      const reservationsRes = await reservationsApi.getAll();
      if (Array.isArray(reservationsRes)) {
        recentTrips.value = reservationsRes.slice(0, 3);
        stats.value.totalTrips = reservationsRes.length;
      } else if (reservationsRes.data) {
        recentTrips.value = reservationsRes.data.slice(0, 3);
        stats.value.totalTrips = reservationsRes.meta.total;
      }
    } catch (err) {
      console.log('Réservations non chargées');
    }
  } catch (err) {
    console.error('Erreur chargement données:', err);
  } finally {
    loading.value = false;
  }
};

const removeFavorite = async (announceId: number) => {
  try {
    await favoritesApi.remove(announceId);
    myFavorites.value = myFavorites.value.filter(f => f.announceId !== announceId);
    stats.value.favorites--;
  } catch (err) {
    console.error('Erreur suppression favori:', err);
  }
};

const saveProfile = async () => {
  saving.value = true;
  error.value = '';
  success.value = '';
  
  try {
    const response = await usersApi.update(userStore.id!, {
      username: editForm.value.username,
      email: editForm.value.email,
      phone: editForm.value.phone
    });
    
    if (response) {
      userStore.username = response.username;
      userStore.email = response.email;
      userStore.phone = response.phone;
      success.value = 'Profil mis à jour avec succès!';
      setTimeout(() => success.value = '', 3000);
    }
  } catch (err: any) {
    error.value = err.message || 'Erreur lors de la mise à jour';
  } finally {
    saving.value = false;
  }
};

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'confirmed': return { class: 'bg-green-100 text-green-700', label: 'Confirmé' };
    case 'pending': return { class: 'bg-yellow-100 text-yellow-700', label: 'En attente' };
    case 'cancelled': return { class: 'bg-gray-100 text-gray-600', label: 'Annulé' };
    case 'completed': return { class: 'bg-blue-100 text-blue-700', label: 'Terminé' };
    default: return { class: 'bg-gray-100 text-gray-600', label: status };
  }
};

const getRoleLabel = () => {
  switch (userStore.role) {
    case 'admin': return 'Admin';
    case 'host': return 'Superhôte';
    default: return 'Voyageur';
  }
};
</script>

<template>
  <div class="min-h-screen bg-gray-100 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <!-- Colonne gauche - Profil -->
        <div class="lg:col-span-3 space-y-6">
          <!-- Carte profil -->
          <div class="bg-white rounded-2xl shadow-sm p-6">
            <div class="flex flex-col items-center text-center">
              <!-- Avatar -->
              <div class="relative mb-4">
                <div class="w-28 h-28 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center overflow-hidden">
                  <span class="material-icons text-gray-400" style="font-size: 56px;">person</span>
                </div>
                <button class="absolute bottom-0 right-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors">
                  <span class="material-icons" style="font-size: 16px;">edit</span>
                </button>
              </div>
              
              <!-- Nom et badge -->
              <div class="flex items-center gap-2 mb-1">
                <h1 class="text-xl font-bold text-gray-900">{{ userStore.username }}</h1>
                <span class="material-icons text-primary" style="font-size: 20px;">verified</span>
              </div>
              <p class="text-gray-500 text-sm">{{ getRoleLabel() }} • Rejoint en {{ memberSince }}</p>
            </div>
            
            <!-- Formulaire -->
            <form @submit.prevent="saveProfile" class="mt-6 space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-gray-400" style="font-size: 20px;">person</span>
                  <input
                    v-model="editForm.username"
                    type="text"
                    class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-gray-900"
                  />
                </div>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-gray-400" style="font-size: 20px;">email</span>
                  <input
                    v-model="editForm.email"
                    type="email"
                    class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-gray-900"
                  />
                </div>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-gray-400" style="font-size: 20px;">phone</span>
                  <input
                    v-model="editForm.phone"
                    type="tel"
                    placeholder="+1(555)012-3456"
                    class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-gray-900"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                :disabled="saving"
                class="w-full bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {{ saving ? 'Enregistrement...' : 'Save Changes' }}
              </button>
            </form>
            
            <!-- Message succès/erreur -->
            <div v-if="success" class="mt-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center">
              <span class="material-icons mr-2" style="font-size: 18px;">check_circle</span>
              {{ success }}
            </div>
            <div v-if="error" class="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center">
              <span class="material-icons mr-2" style="font-size: 18px;">error</span>
              {{ error }}
            </div>
          </div>
          
          <!-- Vérification d'identité -->
          <div class="bg-white rounded-2xl shadow-sm p-6">
            <h3 class="font-semibold text-gray-900 mb-4">Identity Verification</h3>
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                <span class="material-icons text-green-600" style="font-size: 20px;">verified_user</span>
              </div>
              <div>
                <p class="font-medium text-gray-900">Identity Verified</p>
                <p class="text-sm text-gray-500">Your government ID has been verified.</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Colonne droite - Contenu principal -->
        <div class="lg:col-span-9 space-y-6">
          <!-- Statistiques -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div class="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4">
              <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <span class="material-icons text-primary" style="font-size: 24px;">home_work</span>
              </div>
              <div>
                <p class="text-2xl font-bold text-gray-900">{{ stats.activeListings }}</p>
                <p class="text-sm text-gray-500">Active Listings</p>
              </div>
            </div>
            <div class="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4">
              <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <span class="material-icons text-primary" style="font-size: 24px;">flight</span>
              </div>
              <div>
                <p class="text-2xl font-bold text-gray-900">{{ stats.totalTrips }}</p>
                <p class="text-sm text-gray-500">Total Trips</p>
              </div>
            </div>
            <div class="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4">
              <div class="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <span class="material-icons text-yellow-500" style="font-size: 24px;">star</span>
              </div>
              <div>
                <p class="text-2xl font-bold text-gray-900">{{ stats.rating }}</p>
                <p class="text-sm text-gray-500">Guest Rating</p>
              </div>
            </div>
            <div class="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4">
              <div class="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <span class="material-icons text-red-500" style="font-size: 24px;">favorite</span>
              </div>
              <div>
                <p class="text-2xl font-bold text-gray-900">{{ stats.favorites }}</p>
                <p class="text-sm text-gray-500">Favorites</p>
              </div>
            </div>
          </div>
          
          <!-- Mes propriétés et favoris -->
          <div class="bg-white rounded-2xl shadow-sm p-6">
            <!-- Tabs -->
            <div class="flex items-center justify-between mb-5">
              <div class="flex gap-4">
                <button 
                  @click="activeTab = 'properties'"
                  :class="[
                    'text-lg font-bold pb-2 border-b-2 transition-colors',
                    activeTab === 'properties' 
                      ? 'text-gray-900 border-primary' 
                      : 'text-gray-400 border-transparent hover:text-gray-600'
                  ]"
                >
                  Your Properties
                </button>
                <button 
                  @click="activeTab = 'favorites'"
                  :class="[
                    'text-lg font-bold pb-2 border-b-2 transition-colors',
                    activeTab === 'favorites' 
                      ? 'text-gray-900 border-primary' 
                      : 'text-gray-400 border-transparent hover:text-gray-600'
                  ]"
                >
                  Favorites ({{ stats.favorites }})
                </button>
              </div>
              <RouterLink 
                :to="activeTab === 'properties' ? '/anounces' : '/research'" 
                class="text-primary text-sm font-medium hover:underline"
              >
                {{ activeTab === 'properties' ? 'View all listings' : 'Discover more' }}
              </RouterLink>
            </div>
            
            <!-- Properties Tab -->
            <div v-if="activeTab === 'properties'">
              <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div v-for="i in 2" :key="i" class="animate-pulse">
                  <div class="aspect-[4/3] bg-gray-200 rounded-xl mb-3"></div>
                  <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div class="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
              
              <div v-else class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <!-- Propriétés existantes -->
                <div 
                  v-for="property in myProperties.slice(0, 2)" 
                  :key="property.id"
                  class="group cursor-pointer"
                  @click="router.push(`/anounce/${property.id}`)"
                >
                  <div class="relative aspect-[4/3] rounded-xl overflow-hidden mb-3">
                    <img 
                      :src="property.pictures?.[0]?.url || `https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400`"
                      :alt="property.title"
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div :class="[
                      'absolute top-2 left-2 px-2 py-1 rounded text-xs font-semibold',
                      property.isActive ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'
                    ]">
                      {{ property.isActive ? 'Active' : 'Inactive' }}
                    </div>
                  </div>
                  <div class="flex items-start justify-between">
                    <div class="flex-1 min-w-0">
                      <h3 class="font-semibold text-gray-900 truncate">{{ property.title }}</h3>
                      <p class="text-sm text-gray-500">{{ property.type }} • {{ property.info?.capacity || 2 }} Guests</p>
                    </div>
                    <div class="flex items-center text-sm text-gray-900 font-medium">
                      <span class="material-icons text-yellow-400 mr-1" style="font-size: 16px;">star</span>
                      4.85
                    </div>
                  </div>
                  <div class="flex items-center justify-between mt-2">
                    <p class="font-bold text-gray-900">{{ formatPrice(property.price) }}<span class="text-gray-500 font-normal text-sm">/night</span></p>
                    <button 
                      @click.stop="router.push('/anounces')"
                      class="text-sm text-gray-600 hover:text-primary border border-gray-200 px-3 py-1 rounded-lg"
                    >
                      Manage
                    </button>
                  </div>
                </div>
                
                <!-- Carte "Add New Listing" -->
                <RouterLink 
                  to="/anounces/create"
                  class="aspect-[4/3] border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition-colors cursor-pointer"
                >
                  <span class="material-icons mb-2" style="font-size: 32px;">add</span>
                  <p class="font-semibold">Add New Listing</p>
                  <p class="text-sm">Create a new space for guests</p>
                </RouterLink>
              </div>
            </div>
            
            <!-- Favorites Tab -->
            <div v-if="activeTab === 'favorites'">
              <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div v-for="i in 3" :key="i" class="animate-pulse">
                  <div class="aspect-[4/3] bg-gray-200 rounded-xl mb-3"></div>
                  <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div class="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
              
              <div v-else-if="myFavorites.length === 0" class="text-center py-12 text-gray-500">
                <span class="material-icons mb-2" style="font-size: 48px;">favorite_border</span>
                <p>Aucun favori pour le moment</p>
                <RouterLink to="/research" class="text-primary hover:underline mt-2 inline-block">
                  Découvrir des logements
                </RouterLink>
              </div>
              
              <div v-else class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div 
                  v-for="favorite in myFavorites" 
                  :key="favorite.id"
                  class="group cursor-pointer"
                >
                  <div 
                    class="relative aspect-[4/3] rounded-xl overflow-hidden mb-3"
                    @click="router.push(`/anounce/${favorite.announceId}`)"
                  >
                    <img 
                      :src="favorite.announce?.pictures?.[0]?.url || `https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400`"
                      :alt="favorite.announce?.title"
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <!-- Bouton supprimer favori -->
                    <button 
                      @click.stop="removeFavorite(favorite.announceId)"
                      class="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                    >
                      <span class="material-icons text-red-500" style="font-size: 20px;">favorite</span>
                    </button>
                  </div>
                  <div @click="router.push(`/anounce/${favorite.announceId}`)">
                    <div class="flex items-start justify-between">
                      <div class="flex-1 min-w-0">
                        <h3 class="font-semibold text-gray-900 truncate">{{ favorite.announce?.title }}</h3>
                        <p class="text-sm text-gray-500">{{ favorite.announce?.city || 'France' }}</p>
                      </div>
                      <div class="flex items-center text-sm text-gray-900 font-medium">
                        <span class="material-icons text-yellow-400 mr-1" style="font-size: 16px;">star</span>
                        4.85
                      </div>
                    </div>
                    <p class="font-bold text-gray-900 mt-2">
                      {{ formatPrice(favorite.announce?.price || 0) }}
                      <span class="text-gray-500 font-normal text-sm">/night</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Voyages récents -->
          <div class="bg-white rounded-2xl shadow-sm p-6">
            <div class="flex items-center justify-between mb-5">
              <h2 class="text-lg font-bold text-gray-900">Recent Trips</h2>
              <RouterLink to="/reservations" class="text-primary text-sm font-medium hover:underline">
                View booking history
              </RouterLink>
            </div>
            
            <div v-if="loading" class="space-y-4">
              <div v-for="i in 3" :key="i" class="flex items-center gap-4 animate-pulse">
                <div class="w-20 h-16 bg-gray-200 rounded-lg"></div>
                <div class="flex-1">
                  <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div class="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
            
            <div v-else-if="recentTrips.length === 0" class="text-center py-8 text-gray-500">
              <span class="material-icons mb-2" style="font-size: 48px;">flight_takeoff</span>
              <p>Aucun voyage pour le moment</p>
              <RouterLink to="/research" class="text-primary hover:underline mt-2 inline-block">
                Découvrir des logements
              </RouterLink>
            </div>
            
            <div v-else class="space-y-4">
              <div 
                v-for="trip in recentTrips" 
                :key="trip.id"
                class="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
                @click="router.push(`/anounce/${trip.announce_id}`)"
              >
                <div class="w-20 h-16 bg-gray-200 rounded-lg overflow-hidden shrink-0">
                  <img 
                    src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=200"
                    alt="Trip"
                    class="w-full h-full object-cover"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">
                    Réservation #{{ trip.id }}
                  </h3>
                  <p class="text-sm text-gray-500">{{ trip.announce?.city || 'France' }}</p>
                </div>
                <div class="text-right shrink-0">
                  <p class="text-sm text-gray-700">{{ formatDate(trip.start_date) }} - {{ formatDate(trip.end_date) }}</p>
                  <span :class="['text-xs font-medium px-2 py-1 rounded-full', getStatusBadge(trip.status).class]">
                    {{ getStatusBadge(trip.status).label }}
                  </span>
                </div>
                <span class="material-icons text-gray-400 group-hover:text-primary">chevron_right</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Smooth transitions */
input:focus {
  outline: none;
}
</style>