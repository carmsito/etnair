<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// Mode: 'login' ou 'register'
const isRegisterMode = ref(false)

// Form data
const formData = ref({
  username: '',
  email: '',
  password: '',
  phone: ''
})

const showPassword = ref(false)
const errorMessage = ref('')
const isLoading = ref(false)

// Récupérer le mode depuis l'URL
onMounted(() => {
  if (route.query.mode === 'register') {
    isRegisterMode.value = true
  }
  // Rediriger si déjà connecté
  if (userStore.isAuthenticated) {
    router.push('/')
  }
})

const toggleMode = () => {
  isRegisterMode.value = !isRegisterMode.value
  errorMessage.value = ''
}

const handleSubmit = async () => {
  errorMessage.value = ''
  isLoading.value = true

  try {
    if (isRegisterMode.value) {
      // Validation basique
      if (!formData.value.username || !formData.value.email || !formData.value.password) {
        errorMessage.value = 'Veuillez remplir tous les champs obligatoires'
        return
      }
      if (formData.value.password.length < 6) {
        errorMessage.value = 'Le mot de passe doit contenir au moins 6 caractères'
        return
      }
      
      const result = await userStore.register(
        formData.value.username,
        formData.value.email,
        formData.value.password,
        formData.value.phone || undefined
      )
      
      if (result.success) {
        router.push('/')
      } else {
        errorMessage.value = result.error || 'Erreur lors de l\'inscription'
      }
    } else {
      // Login
      if (!formData.value.email || !formData.value.password) {
        errorMessage.value = 'Veuillez remplir tous les champs'
        return
      }
      
      const result = await userStore.login(formData.value.email, formData.value.password)
      
      if (result.success) {
        router.push('/')
      } else {
        errorMessage.value = result.error || 'Email ou mot de passe incorrect'
      }
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <div class="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-100 relative">
      <!-- Header avec image -->
      <div class="h-32 w-full relative overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800" 
          alt="ETNAir Background" 
          class="w-full h-full object-cover opacity-80"
        />
        <div class="absolute inset-0 bg-gradient-to-b from-transparent to-white"></div>
      </div>

      <!-- Content -->
      <div class="px-8 pb-8 -mt-12 relative z-10">
        <!-- Logo -->
        <div class="text-center mb-6">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4 text-primary">
            <span class="material-icons-round text-3xl">flight_takeoff</span>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 mb-1">Bienvenue sur ETNAir</h1>
          <p class="text-sm text-gray-500">Trouvez votre prochain séjour parfait.</p>
        </div>

        <!-- Toggle Login/Register -->
        <div class="flex bg-gray-100 rounded-full p-1 mb-8 relative">
          <button 
            @click="isRegisterMode = false"
            :class="[
              'flex-1 py-2.5 text-sm font-medium rounded-full transition-all',
              !isRegisterMode ? 'text-primary bg-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
            ]"
          >
            Connexion
          </button>
          <button 
            @click="isRegisterMode = true"
            :class="[
              'flex-1 py-2.5 text-sm font-medium rounded-full transition-all',
              isRegisterMode ? 'text-primary bg-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
            ]"
          >
            Inscription
          </button>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {{ errorMessage }}
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Username (Register only) -->
          <div v-if="isRegisterMode" class="relative group">
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span class="material-icons-round text-gray-400 group-focus-within:text-primary transition-colors">person</span>
            </div>
            <input 
              v-model="formData.username"
              type="text" 
              placeholder="Nom d'utilisateur"
              class="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary focus:bg-white transition-all text-sm shadow-sm"
            />
          </div>

          <!-- Email -->
          <div class="relative group">
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span class="material-icons-round text-gray-400 group-focus-within:text-primary transition-colors">email</span>
            </div>
            <input 
              v-model="formData.email"
              type="email" 
              placeholder="Adresse email"
              class="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary focus:bg-white transition-all text-sm shadow-sm"
            />
          </div>

          <!-- Phone (Register only) -->
          <div v-if="isRegisterMode" class="relative group">
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span class="material-icons-round text-gray-400 group-focus-within:text-primary transition-colors">phone</span>
            </div>
            <input 
              v-model="formData.phone"
              type="tel" 
              placeholder="Numéro de téléphone (optionnel)"
              class="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary focus:bg-white transition-all text-sm shadow-sm"
            />
          </div>

          <!-- Password -->
          <div class="relative group">
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span class="material-icons-round text-gray-400 group-focus-within:text-primary transition-colors">lock</span>
            </div>
            <input 
              v-model="formData.password"
              :type="showPassword ? 'text' : 'password'" 
              placeholder="Mot de passe"
              class="w-full pl-11 pr-12 py-3.5 bg-gray-50 border-none rounded-2xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary focus:bg-white transition-all text-sm shadow-sm"
            />
            <button 
              type="button"
              @click="showPassword = !showPassword"
              class="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <span class="material-icons-round text-lg">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
            </button>
          </div>

          <!-- Submit Button -->
          <button 
            type="submit"
            :disabled="isLoading"
            class="w-full py-3.5 bg-primary hover:opacity-90 text-white font-semibold rounded-2xl shadow-lg shadow-primary/30 transition-all transform hover:-translate-y-0.5 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isLoading" class="flex items-center justify-center gap-2">
              <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Chargement...
            </span>
            <span v-else>{{ isRegisterMode ? 'Créer mon compte' : 'Se connecter' }}</span>
          </button>
        </form>

        <!-- Divider -->
        <div class="relative my-6">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-200"></div>
          </div>
          <div class="relative flex justify-center text-xs">
            <span class="px-2 bg-white text-gray-500">Ou continuer avec</span>
          </div>
        </div>

        <!-- Social Login Buttons -->
        <div class="space-y-3">
          <button class="w-full flex items-center justify-center px-4 py-3 bg-black text-white rounded-2xl hover:opacity-90 transition-opacity">
            <svg class="h-5 w-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16.365 1.43c0 1.14-.493 2.18-1.177 3.08-.684.9-1.695 1.54-2.83 1.54-.105 0-.21 0-.316-.01.052-1.07.493-2.07 1.135-2.85.642-.78 1.58-1.32 2.653-1.66.19 0 .368-.05.535-.1zM13.886 6.69c-2.472 0-3.324 1.37-4.49 1.37-1.356 0-3.114-1.33-5.26-1.28-2.653.05-5.113 1.58-6.49 4.02-2.734 4.86-.714 11.97 1.946 15.82 1.315 1.9 2.862 3.99 4.887 3.93 1.947-.05 2.684-1.28 5.04-1.28 2.315 0 2.99 1.28 5.02 1.23 2.083-.05 3.4-1.9 4.692-3.83 1.5-2.23 2.115-4.4 2.146-4.51-.043-.02-4.103-1.58-4.146-6.28-.02-3.92 3.167-5.8 3.324-5.91-1.81-2.68-4.63-2.98-5.61-3.04z"></path>
            </svg>
            Continuer avec Apple
          </button>
          <div class="grid grid-cols-2 gap-3">
            <button class="flex items-center justify-center px-4 py-3 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-colors">
              <svg class="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span class="text-sm font-medium text-gray-700">Google</span>
            </button>
            <button class="flex items-center justify-center px-4 py-3 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-colors">
              <svg class="h-5 w-5 mr-2 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"></path>
              </svg>
              <span class="text-sm font-medium text-gray-700">Facebook</span>
            </button>
          </div>
        </div>

        <!-- Terms -->
        <p class="text-xs text-center text-gray-400 mt-8 leading-relaxed">
          En continuant, vous acceptez nos 
          <a href="#" class="underline hover:text-primary">Conditions d'utilisation</a> 
          et notre 
          <a href="#" class="underline hover:text-primary">Politique de confidentialité</a>.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shadow-primary\/30 {
  --tw-shadow-color: rgba(0, 214, 146, 0.3);
  --tw-shadow: var(--tw-shadow-colored);
}

input:focus {
  outline: none;
}
</style>
