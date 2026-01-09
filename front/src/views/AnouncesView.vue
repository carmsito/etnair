<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useUserStore } from '@/stores/user';
import { useRouter } from 'vue-router';
import { announcesApi, type Announce } from '@/services/api';

const userStore = useUserStore();
const router = useRouter();

const myAnnounces = ref<Announce[]>([]);
const loading = ref(true);
const error = ref('');
const success = ref('');

// Modal de création
const showCreateModal = ref(false);
const showEditModal = ref(false);
const editingAnnounce = ref<Announce | null>(null);

// Formulaire d'annonce
const announceForm = ref({
  title: '',
  description: '',
  type: 'APARTMENT',
  city: '',
  capacity: 1,
  price: 0,
  status: 'available'
});

const propertyTypes = [
  { value: 'APARTMENT', label: 'Appartement' },
  { value: 'HOUSE', label: 'Maison' },
  { value: 'VILLA', label: 'Villa' },
  { value: 'STUDIO', label: 'Studio' },
  { value: 'ROOM', label: 'Chambre' },
  { value: 'OTHER', label: 'Autre' }
];

const statusOptions = [
  { value: 'available', label: 'Disponible' },
  { value: 'unavailable', label: 'Indisponible' }
];

onMounted(async () => {
  if (!userStore.id) {
    router.push('/auth');
    return;
  }
  await fetchMyAnnounces();
});

const fetchMyAnnounces = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    // Récupérer toutes les annonces et filtrer par user_id
    const response = await announcesApi.getAll();
    const announceList = Array.isArray(response) ? response : response.data;
    myAnnounces.value = announceList.filter(
      (a: Announce) => a.userId === userStore.id
    );
  } catch (err: any) {
    error.value = err.message || 'Erreur lors du chargement des annonces';
  } finally {
    loading.value = false;
  }
};

const openCreateModal = () => {
  announceForm.value = {
    title: '',
    description: '',
    type: 'APARTMENT',
    city: '',
    capacity: 1,
    price: 0,
    status: 'available'
  };
  showCreateModal.value = true;
  error.value = '';
};

const openEditModal = (announce: Announce) => {
  editingAnnounce.value = announce;
  announceForm.value = {
    title: announce.title,
    description: announce.description || '',
    type: announce.type,
    city: announce.city || '',
    capacity: announce.info?.capacity || 1,
    price: announce.price,
    status: announce.isActive ? 'available' : 'unavailable'
  };
  showEditModal.value = true;
  error.value = '';
};

const closeModals = () => {
  showCreateModal.value = false;
  showEditModal.value = false;
  editingAnnounce.value = null;
};

const createAnnounce = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    await announcesApi.create({
      title: announceForm.value.title,
      description: announceForm.value.description,
      type: announceForm.value.type as any,
      city: announceForm.value.city,
      price: announceForm.value.price,
      info: {
        capacity: announceForm.value.capacity
      }
    });
    
    success.value = 'Annonce créée avec succès!';
    closeModals();
    await fetchMyAnnounces();
    
    setTimeout(() => { success.value = ''; }, 3000);
  } catch (err: any) {
    error.value = err.message || 'Erreur lors de la création de l\'annonce';
  } finally {
    loading.value = false;
  }
};

const updateAnnounce = async () => {
  if (!editingAnnounce.value) return;
  
  loading.value = true;
  error.value = '';
  
  try {
    await announcesApi.update(editingAnnounce.value.id, {
      title: announceForm.value.title,
      description: announceForm.value.description,
      type: announceForm.value.type as any,
      city: announceForm.value.city,
      price: announceForm.value.price,
      isActive: announceForm.value.status === 'available'
    });
    
    success.value = 'Annonce mise à jour avec succès!';
    closeModals();
    await fetchMyAnnounces();
    
    setTimeout(() => { success.value = ''; }, 3000);
  } catch (err: any) {
    error.value = err.message || 'Erreur lors de la mise à jour de l\'annonce';
  } finally {
    loading.value = false;
  }
};

const deleteAnnounce = async (id: number) => {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) return;
  
  loading.value = true;
  error.value = '';
  
  try {
    await announcesApi.delete(id);
    success.value = 'Annonce supprimée avec succès!';
    await fetchMyAnnounces();
    
    setTimeout(() => { success.value = ''; }, 3000);
  } catch (err: any) {
    error.value = err.message || 'Erreur lors de la suppression de l\'annonce';
  } finally {
    loading.value = false;
  }
};

const getTypeLabel = (type: string) => {
  const found = propertyTypes.find(t => t.value === type);
  return found ? found.label : type;
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'available':
      return { class: 'bg-green-100 text-green-800', label: 'Disponible' };
    case 'unavailable':
      return { class: 'bg-red-100 text-red-800', label: 'Indisponible' };
    default:
      return { class: 'bg-gray-100 text-gray-800', label: status };
  }
};

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(price);
};

const availableCount = computed(() => 
  myAnnounces.value.filter(a => a.status === 'available').length
);

const unavailableCount = computed(() => 
  myAnnounces.value.filter(a => a.status === 'unavailable').length
);
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- En-tête -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Mes annonces</h1>
          <p class="text-gray-500 mt-1">Gérez vos propriétés et leurs disponibilités</p>
        </div>
        <button
          @click="router.push('/anounces/create')"
          class="mt-4 sm:mt-0 inline-flex items-center px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-emerald-600 transition-colors shadow-sm"
        >
          <span class="material-icons mr-2">add</span>
          Créer une annonce
        </button>
      </div>

      <!-- Messages -->
      <div v-if="success" class="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
        <span class="material-icons mr-2">check_circle</span>
        {{ success }}
      </div>
      <div v-if="error && !showCreateModal && !showEditModal" class="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
        <span class="material-icons mr-2">error</span>
        {{ error }}
      </div>

      <!-- Statistiques -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div class="bg-white rounded-xl p-6 shadow-sm">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span class="material-icons text-blue-600">home_work</span>
            </div>
            <div class="ml-4">
              <p class="text-sm text-gray-500">Total annonces</p>
              <p class="text-2xl font-bold text-gray-900">{{ myAnnounces.length }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-6 shadow-sm">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span class="material-icons text-green-600">check_circle</span>
            </div>
            <div class="ml-4">
              <p class="text-sm text-gray-500">Disponibles</p>
              <p class="text-2xl font-bold text-gray-900">{{ availableCount }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-6 shadow-sm">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <span class="material-icons text-red-600">block</span>
            </div>
            <div class="ml-4">
              <p class="text-sm text-gray-500">Indisponibles</p>
              <p class="text-2xl font-bold text-gray-900">{{ unavailableCount }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Liste des annonces -->
      <div v-if="loading && myAnnounces.length === 0" class="flex justify-center items-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>

      <div v-else-if="myAnnounces.length === 0" class="text-center py-20">
        <div class="w-24 h-24 bg-gray-100 rounded-full mx-auto flex items-center justify-center mb-6">
          <span class="material-icons text-gray-400" style="font-size: 48px;">home_work</span>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">Aucune annonce</h2>
        <p class="text-gray-500 mb-6">Vous n'avez pas encore créé d'annonce. Commencez dès maintenant !</p>
        <button
          @click="openCreateModal"
          class="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
        >
          <span class="material-icons mr-2">add</span>
          Créer ma première annonce
        </button>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="announce in myAnnounces"
          :key="announce.id"
          class="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
        >
          <!-- Image placeholder -->
          <div class="relative h-48 bg-gradient-to-br from-blue-100 to-blue-200">
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="material-icons text-blue-300" style="font-size: 64px;">home</span>
            </div>
            <div class="absolute top-3 right-3">
              <span :class="['px-3 py-1 rounded-full text-xs font-medium', getStatusBadge(announce.status).class]">
                {{ getStatusBadge(announce.status).label }}
              </span>
            </div>
          </div>
          
          <!-- Contenu -->
          <div class="p-5">
            <div class="flex items-start justify-between mb-2">
              <h3 class="font-semibold text-lg text-gray-900 line-clamp-1">{{ announce.title }}</h3>
            </div>
            
            <div class="flex items-center text-gray-500 text-sm mb-2">
              <span class="material-icons mr-1" style="font-size: 16px;">location_on</span>
              {{ announce.city }}
            </div>
            
            <div class="flex items-center gap-4 text-gray-500 text-sm mb-4">
              <span class="flex items-center">
                <span class="material-icons mr-1" style="font-size: 16px;">apartment</span>
                {{ getTypeLabel(announce.type) }}
              </span>
              <span class="flex items-center">
                <span class="material-icons mr-1" style="font-size: 16px;">people</span>
                {{ announce.capacity }} pers.
              </span>
            </div>
            
            <div class="flex items-center justify-between pt-4 border-t border-gray-100">
              <p class="text-xl font-bold text-blue-600">
                {{ formatPrice(announce.price) }}
                <span class="text-sm font-normal text-gray-500">/nuit</span>
              </p>
              <div class="flex space-x-2">
                <button
                  @click="openEditModal(announce)"
                  class="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Modifier"
                >
                  <span class="material-icons" style="font-size: 20px;">edit</span>
                </button>
                <RouterLink
                  :to="`/anounce/${announce.id}`"
                  class="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Voir"
                >
                  <span class="material-icons" style="font-size: 20px;">visibility</span>
                </RouterLink>
                <button
                  @click="deleteAnnounce(announce.id)"
                  class="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Supprimer"
                >
                  <span class="material-icons" style="font-size: 20px;">delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de création -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-900">Créer une nouvelle annonce</h2>
            <button @click="closeModals" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <span class="material-icons">close</span>
            </button>
          </div>
        </div>
        
        <form @submit.prevent="createAnnounce" class="p-6 space-y-4">
          <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {{ error }}
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Titre *</label>
            <input
              v-model="announceForm.title"
              type="text"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: Bel appartement avec vue mer"
              required
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              v-model="announceForm.description"
              rows="4"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Décrivez votre logement..."
            ></textarea>
          </div>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Type de bien *</label>
              <select
                v-model="announceForm.type"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option v-for="type in propertyTypes" :key="type.value" :value="type.value">
                  {{ type.label }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Ville *</label>
              <input
                v-model="announceForm.city"
                type="text"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Paris"
                required
              />
            </div>
          </div>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Capacité (personnes) *</label>
              <input
                v-model.number="announceForm.capacity"
                type="number"
                min="1"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Prix par nuit (€) *</label>
              <input
                v-model.number="announceForm.price"
                type="number"
                min="1"
                step="0.01"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Statut</label>
            <select
              v-model="announceForm.status"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option v-for="status in statusOptions" :key="status.value" :value="status.value">
                {{ status.label }}
              </option>
            </select>
          </div>
          
          <div class="flex space-x-3 pt-4">
            <button
              type="submit"
              :disabled="loading"
              class="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
            >
              {{ loading ? 'Création en cours...' : 'Créer l\'annonce' }}
            </button>
            <button
              type="button"
              @click="closeModals"
              class="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal d'édition -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-900">Modifier l'annonce</h2>
            <button @click="closeModals" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <span class="material-icons">close</span>
            </button>
          </div>
        </div>
        
        <form @submit.prevent="updateAnnounce" class="p-6 space-y-4">
          <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {{ error }}
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Titre *</label>
            <input
              v-model="announceForm.title"
              type="text"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              v-model="announceForm.description"
              rows="4"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            ></textarea>
          </div>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Type de bien *</label>
              <select
                v-model="announceForm.type"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option v-for="type in propertyTypes" :key="type.value" :value="type.value">
                  {{ type.label }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Ville *</label>
              <input
                v-model="announceForm.city"
                type="text"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Capacité (personnes) *</label>
              <input
                v-model.number="announceForm.capacity"
                type="number"
                min="1"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Prix par nuit (€) *</label>
              <input
                v-model.number="announceForm.price"
                type="number"
                min="1"
                step="0.01"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Statut</label>
            <select
              v-model="announceForm.status"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option v-for="status in statusOptions" :key="status.value" :value="status.value">
                {{ status.label }}
              </option>
            </select>
          </div>
          
          <div class="flex space-x-3 pt-4">
            <button
              type="submit"
              :disabled="loading"
              class="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
            >
              {{ loading ? 'Mise à jour...' : 'Enregistrer les modifications' }}
            </button>
            <button
              type="button"
              @click="closeModals"
              class="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Animation pour les modals */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.fixed {
  animation: fadeIn 0.2s ease-out;
}

.fixed > div {
  animation: slideUp 0.3s ease-out;
}
</style>