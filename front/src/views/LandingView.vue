<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { ref, onMounted } from 'vue';
import { announcesApi, type Announce } from '@/services/api';

const featuredAnnounces = ref<Announce[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const response = await announcesApi.getAll({ limit: 6 });
    if (Array.isArray(response)) {
      featuredAnnounces.value = response.slice(0, 6);
    } else if (response.data) {
      featuredAnnounces.value = response.data.slice(0, 6);
    }
  } catch (err) {
    console.error('Error loading announces:', err);
  } finally {
    loading.value = false;
  }
});

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0
  }).format(price);
};

const getTypeIcon = (type: string) => {
  const icons: Record<string, string> = {
    apartment: 'apartment',
    house: 'home',
    villa: 'villa',
    studio: 'meeting_room',
    loft: 'warehouse',
    cabin: 'cabin'
  };
  return icons[type] || 'home';
};
</script>

<template>
  <div class="min-h-screen">
    <!-- Hero Section -->
    <section class="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white overflow-hidden">
      <!-- Background Pattern -->
      <div class="absolute inset-0 opacity-10">
        <div class="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
        <div class="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2"></div>
      </div>
      
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 class="text-4xl lg:text-6xl font-bold leading-tight mb-6">
              Trouvez votre
              <span class="text-yellow-400">logement idéal</span>
              partout en France
            </h1>
            <p class="text-xl text-blue-100 mb-8">
              Découvrez des milliers de logements uniques pour vos vacances, voyages d'affaires ou séjours longue durée. ETNAir vous connecte avec les meilleurs hôtes.
            </p>
            <div class="flex flex-col sm:flex-row gap-4">
              <RouterLink
                to="/research"
                class="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-colors shadow-lg"
              >
                <span class="material-icons mr-2">search</span>
                Explorer les logements
              </RouterLink>
              <RouterLink
                to="/auth"
                class="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white font-semibold rounded-xl hover:bg-white hover:text-blue-600 transition-colors"
              >
                <span class="material-icons mr-2">person_add</span>
                Créer un compte
              </RouterLink>
            </div>
          </div>
          
          <!-- Stats Cards -->
          <div class="hidden lg:grid grid-cols-2 gap-4">
            <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <span class="material-icons text-yellow-400 text-4xl mb-3">home_work</span>
              <p class="text-3xl font-bold">5000+</p>
              <p class="text-blue-200">Logements disponibles</p>
            </div>
            <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mt-8">
              <span class="material-icons text-yellow-400 text-4xl mb-3">location_city</span>
              <p class="text-3xl font-bold">150+</p>
              <p class="text-blue-200">Villes en France</p>
            </div>
            <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <span class="material-icons text-yellow-400 text-4xl mb-3">people</span>
              <p class="text-3xl font-bold">25000+</p>
              <p class="text-blue-200">Voyageurs satisfaits</p>
            </div>
            <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mt-8">
              <span class="material-icons text-yellow-400 text-4xl mb-3">star</span>
              <p class="text-3xl font-bold">4.8/5</p>
              <p class="text-blue-200">Note moyenne</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Wave Divider -->
      <div class="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="#F9FAFB"/>
        </svg>
      </div>
    </section>

    <!-- Featured Listings -->
    <section class="bg-gray-50 py-16 lg:py-24">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
          <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Découvrez nos logements populaires
          </h2>
          <p class="text-lg text-gray-600 max-w-2xl mx-auto">
            Des appartements cosy aux villas luxueuses, trouvez l'hébergement parfait pour votre prochain séjour.
          </p>
        </div>

        <div v-if="loading" class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div
            v-for="announce in featuredAnnounces"
            :key="announce.id"
            class="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition-shadow group"
          >
            <div class="relative h-56 bg-gradient-to-br from-blue-100 to-blue-200">
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="material-icons text-blue-300 group-hover:scale-110 transition-transform" style="font-size: 64px;">
                  {{ getTypeIcon(announce.type) }}
                </span>
              </div>
              <div class="absolute top-4 left-4">
                <span class="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-sm font-medium text-gray-700">
                  {{ announce.type }}
                </span>
              </div>
            </div>
            <div class="p-6">
              <h3 class="font-semibold text-xl text-gray-900 mb-2 line-clamp-1">{{ announce.title }}</h3>
              <div class="flex items-center text-gray-500 mb-4">
                <span class="material-icons mr-1" style="font-size: 18px;">location_on</span>
                {{ announce.city }}
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center text-gray-500">
                  <span class="material-icons mr-1" style="font-size: 18px;">people</span>
                  {{ announce.capacity }} personnes
                </div>
                <p class="text-xl font-bold text-blue-600">
                  {{ formatPrice(announce.price) }}
                  <span class="text-sm font-normal text-gray-500">/nuit</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="text-center mt-12">
          <RouterLink
            to="/research"
            class="inline-flex items-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            Voir tous les logements
            <span class="material-icons ml-2">arrow_forward</span>
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- How It Works -->
    <section class="py-16 lg:py-24 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
          <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Comment ça marche ?
          </h2>
          <p class="text-lg text-gray-600">
            Réservez votre logement idéal en quelques clics
          </p>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          <div class="text-center p-6">
            <div class="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span class="material-icons text-blue-600" style="font-size: 40px;">search</span>
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-3">1. Recherchez</h3>
            <p class="text-gray-600">
              Explorez notre catalogue de logements et filtrez selon vos critères : ville, type, capacité, budget.
            </p>
          </div>
          <div class="text-center p-6">
            <div class="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span class="material-icons text-blue-600" style="font-size: 40px;">calendar_today</span>
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-3">2. Réservez</h3>
            <p class="text-gray-600">
              Sélectionnez vos dates, vérifiez la disponibilité et réservez en quelques secondes.
            </p>
          </div>
          <div class="text-center p-6">
            <div class="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span class="material-icons text-blue-600" style="font-size: 40px;">luggage</span>
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-3">3. Profitez</h3>
            <p class="text-gray-600">
              Recevez la confirmation et préparez vos valises. Votre logement vous attend !
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="bg-gradient-to-r from-blue-600 to-indigo-700 py-16">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="text-3xl lg:text-4xl font-bold text-white mb-6">
          Vous avez un logement à proposer ?
        </h2>
        <p class="text-xl text-blue-100 mb-8">
          Rejoignez notre communauté d'hôtes et gagnez un revenu complémentaire en louant votre bien.
        </p>
        <RouterLink
          to="/auth"
          class="inline-flex items-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-colors shadow-lg"
        >
          <span class="material-icons mr-2">add_home</span>
          Devenir hôte
        </RouterLink>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-gray-900 text-gray-400 py-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid md:grid-cols-4 gap-8">
          <div>
            <div class="flex items-center space-x-2 mb-4">
              <span class="material-icons text-blue-500">flight</span>
              <span class="text-xl font-bold text-white">ETNAir</span>
            </div>
            <p class="text-sm">
              La plateforme de location de logements qui connecte voyageurs et hôtes depuis 2025.
            </p>
          </div>
          <div>
            <h4 class="font-semibold text-white mb-4">Explorer</h4>
            <ul class="space-y-2 text-sm">
              <li><RouterLink to="/research" class="hover:text-white transition-colors">Rechercher</RouterLink></li>
              <li><RouterLink to="/auth" class="hover:text-white transition-colors">Se connecter</RouterLink></li>
              <li><RouterLink to="/auth" class="hover:text-white transition-colors">S'inscrire</RouterLink></li>
            </ul>
          </div>
          <div>
            <h4 class="font-semibold text-white mb-4">Hôtes</h4>
            <ul class="space-y-2 text-sm">
              <li><a href="#" class="hover:text-white transition-colors">Devenir hôte</a></li>
              <li><a href="#" class="hover:text-white transition-colors">Ressources</a></li>
              <li><a href="#" class="hover:text-white transition-colors">Communauté</a></li>
            </ul>
          </div>
          <div>
            <h4 class="font-semibold text-white mb-4">Assistance</h4>
            <ul class="space-y-2 text-sm">
              <li><a href="#" class="hover:text-white transition-colors">Centre d'aide</a></li>
              <li><a href="#" class="hover:text-white transition-colors">Conditions d'utilisation</a></li>
              <li><a href="#" class="hover:text-white transition-colors">Confidentialité</a></li>
            </ul>
          </div>
        </div>
        <div class="border-t border-gray-800 mt-12 pt-8 text-center text-sm">
          <p>&copy; 2025 ETNAir. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>