<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { adminApi, type UserWithCounts } from '@/services/api';

const router = useRouter();
const userStore = useUserStore();

const users = ref<UserWithCounts[]>([]);
const loading = ref(true);
const error = ref('');
const searchQuery = ref('');
const roleFilter = ref<'ALL' | 'USER' | 'ADMIN'>('ALL');

// Modal de confirmation
const showDeleteModal = ref(false);
const userToDelete = ref<UserWithCounts | null>(null);
const deleting = ref(false);

// Modal de changement de rôle
const showRoleModal = ref(false);
const userToChangeRole = ref<UserWithCounts | null>(null);
const newRole = ref<'USER' | 'ADMIN'>('USER');
const changingRole = ref(false);

// Vérifier que l'utilisateur est admin
onMounted(async () => {
  if (!userStore.isLoggedIn) {
    router.push('/auth');
    return;
  }
  
  if (userStore.user?.role !== 'ADMIN') {
    router.push('/');
    return;
  }
  
  await loadUsers();
});

async function loadUsers() {
  loading.value = true;
  error.value = '';
  try {
    users.value = await adminApi.getAllUsers();
  } catch (e: any) {
    error.value = e.message || 'Erreur lors du chargement des utilisateurs';
    if (e.message?.includes('403') || e.message?.includes('Permission')) {
      router.push('/');
    }
  } finally {
    loading.value = false;
  }
}

// Filtrer les utilisateurs
const filteredUsers = computed(() => {
  return users.value.filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.value.toLowerCase());
    
    const matchesRole = roleFilter.value === 'ALL' || user.role === roleFilter.value;
    
    return matchesSearch && matchesRole;
  });
});

// Stats
const stats = computed(() => ({
  total: users.value.length,
  admins: users.value.filter(u => u.role === 'ADMIN').length,
  users: users.value.filter(u => u.role === 'USER').length,
}));

// Ouvrir modal de suppression
function openDeleteModal(user: UserWithCounts) {
  userToDelete.value = user;
  showDeleteModal.value = true;
}

// Confirmer suppression
async function confirmDelete() {
  if (!userToDelete.value) return;
  
  deleting.value = true;
  try {
    await adminApi.deleteUser(userToDelete.value.id);
    users.value = users.value.filter(u => u.id !== userToDelete.value!.id);
    showDeleteModal.value = false;
    userToDelete.value = null;
  } catch (e: any) {
    error.value = e.message || 'Erreur lors de la suppression';
  } finally {
    deleting.value = false;
  }
}

// Ouvrir modal de changement de rôle
function openRoleModal(user: UserWithCounts) {
  userToChangeRole.value = user;
  newRole.value = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
  showRoleModal.value = true;
}

// Confirmer changement de rôle
async function confirmRoleChange() {
  if (!userToChangeRole.value) return;
  
  changingRole.value = true;
  try {
    const updated = await adminApi.updateUserRole(userToChangeRole.value.id, newRole.value);
    const index = users.value.findIndex(u => u.id === userToChangeRole.value!.id);
    if (index !== -1) {
      users.value[index] = { ...users.value[index], ...updated };
    }
    showRoleModal.value = false;
    userToChangeRole.value = null;
  } catch (e: any) {
    error.value = e.message || 'Erreur lors du changement de rôle';
  } finally {
    changingRole.value = false;
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <!-- Header -->
    <div class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Administration</h1>
            <p class="mt-1 text-sm text-gray-500">Gestion des utilisateurs</p>
          </div>
          <router-link 
            to="/" 
            class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <span class="material-icons text-sm mr-2">arrow_back</span>
            Retour à l'accueil
          </router-link>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="p-3 rounded-full bg-emerald-100 text-emerald-600">
              <span class="material-icons">people</span>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Total utilisateurs</p>
              <p class="text-2xl font-semibold text-gray-900">{{ stats.total }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="p-3 rounded-full bg-purple-100 text-purple-600">
              <span class="material-icons">admin_panel_settings</span>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Administrateurs</p>
              <p class="text-2xl font-semibold text-gray-900">{{ stats.admins }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="p-3 rounded-full bg-blue-100 text-blue-600">
              <span class="material-icons">person</span>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Utilisateurs</p>
              <p class="text-2xl font-semibold text-gray-900">{{ stats.users }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-lg shadow mb-6 p-4">
        <div class="flex flex-col md:flex-row gap-4">
          <div class="flex-1">
            <div class="relative">
              <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 material-icons">search</span>
              <input 
                v-model="searchQuery"
                type="text" 
                placeholder="Rechercher par nom ou email..."
                class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
              />
            </div>
          </div>
          <div>
            <select 
              v-model="roleFilter"
              class="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
            >
              <option value="ALL">Tous les rôles</option>
              <option value="ADMIN">Administrateurs</option>
              <option value="USER">Utilisateurs</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
        {{ error }}
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>

      <!-- Users Table -->
      <div v-else class="bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activité</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inscrit le</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="user in filteredUsers" :key="user.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="h-10 w-10 flex-shrink-0">
                    <div class="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <span class="text-emerald-600 font-medium">{{ user.username.charAt(0).toUpperCase() }}</span>
                    </div>
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">{{ user.username }}</div>
                    <div class="text-sm text-gray-500">{{ user.email }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span 
                  :class="[
                    'px-2 inline-flex text-xs leading-5 font-semibold rounded-full',
                    user.role === 'ADMIN' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-green-100 text-green-800'
                  ]"
                >
                  {{ user.role === 'ADMIN' ? 'Admin' : 'Utilisateur' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div class="flex gap-3">
                  <span class="flex items-center">
                    <span class="material-icons text-sm mr-1 text-gray-400">home</span>
                    {{ user._count?.announces || 0 }} annonces
                  </span>
                  <span class="flex items-center">
                    <span class="material-icons text-sm mr-1 text-gray-400">calendar_today</span>
                    {{ user._count?.reservations || 0 }} réservations
                  </span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(user.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex justify-end gap-2">
                  <button
                    @click="openRoleModal(user)"
                    :disabled="user.id === userStore.user?.id"
                    :class="[
                      'px-3 py-1 rounded text-sm',
                      user.id === userStore.user?.id
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    ]"
                  >
                    <span class="material-icons text-sm">swap_horiz</span>
                  </button>
                  <button
                    @click="openDeleteModal(user)"
                    :disabled="user.id === userStore.user?.id"
                    :class="[
                      'px-3 py-1 rounded text-sm',
                      user.id === userStore.user?.id
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    ]"
                  >
                    <span class="material-icons text-sm">delete</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty State -->
        <div v-if="filteredUsers.length === 0 && !loading" class="text-center py-12">
          <span class="material-icons text-gray-400 text-5xl mb-2">person_off</span>
          <p class="text-gray-500">Aucun utilisateur trouvé</p>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-md w-full p-6">
        <div class="flex items-center mb-4">
          <div class="p-2 bg-red-100 rounded-full mr-3">
            <span class="material-icons text-red-600">warning</span>
          </div>
          <h3 class="text-lg font-semibold text-gray-900">Supprimer l'utilisateur</h3>
        </div>
        <p class="text-gray-600 mb-6">
          Êtes-vous sûr de vouloir supprimer <strong>{{ userToDelete?.username }}</strong> ?
          Cette action supprimera également toutes ses annonces et réservations.
        </p>
        <div class="flex justify-end gap-3">
          <button 
            @click="showDeleteModal = false"
            class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button 
            @click="confirmDelete"
            :disabled="deleting"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {{ deleting ? 'Suppression...' : 'Supprimer' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Role Change Modal -->
    <div v-if="showRoleModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-md w-full p-6">
        <div class="flex items-center mb-4">
          <div class="p-2 bg-purple-100 rounded-full mr-3">
            <span class="material-icons text-purple-600">admin_panel_settings</span>
          </div>
          <h3 class="text-lg font-semibold text-gray-900">Changer le rôle</h3>
        </div>
        <p class="text-gray-600 mb-4">
          Modifier le rôle de <strong>{{ userToChangeRole?.username }}</strong>
        </p>
        <div class="mb-6">
          <select 
            v-model="newRole"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
          >
            <option value="USER">Utilisateur</option>
            <option value="ADMIN">Administrateur</option>
          </select>
        </div>
        <div class="flex justify-end gap-3">
          <button 
            @click="showRoleModal = false"
            class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button 
            @click="confirmRoleChange"
            :disabled="changingRole"
            class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {{ changingRole ? 'Modification...' : 'Confirmer' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
