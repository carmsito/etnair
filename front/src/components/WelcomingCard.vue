<script setup lang="ts">
    import { useUserStore } from '@/stores/user';
    const userStore = useUserStore();
    const currentUserId = userStore.id;
    const currentUserName = userStore.name;
</script>

<template>
    
    <div class="welcoming-card-container">
        <h2>Bienvenue, {{ currentUserName }} !</h2>
        <p>Nous sommes ravis de vous revoir sur ETN'Air. Explorez nos nouvelles fonctionnalités et trouvez le logement parfait pour vous.</p>
    </div>
  
</template>

<style scoped>
    .welcoming-card-container {
        width: 80%;
        margin: auto;
        padding: 2rem;
        border: 2px solid #4DAA7F;
        border-radius: 15px;
        background-color: #f9f9f9;
        text-align: center;
    }

    .welcoming-card-container h2 {
        color: #4DAA7F;
        margin-bottom: 1rem;
    }

    .welcoming-card-container p {
        font-size: 1.1rem;
        color: #333;
    }
  
</style>