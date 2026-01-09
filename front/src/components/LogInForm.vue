<script setup lang="ts">
import { useUserStore } from '@/stores/user';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const userStore = useUserStore();

    const signForm = ref({
        name: '',
        mail: '',
        phone: '',
        password: '',
        createdAt: new Date()
    });

    const logForm = ref({
        mail: '',
        password: ''
    });


// Submit Sign In Form function => POST method -------- A completer avec les routes backend
    function submitSignForm() {
        console.log("Inscription :", signForm.value);

        if (!signForm.value.name || !signForm.value.mail || !signForm.value.phone || !signForm.value.password) {
            alert('Veuillez remplir tous les champs du formulaire d\'inscription.');
            return
        }
        if(!signForm.value.mail.includes('@')) {
            alert('Veuillez entrer une adresse email valide.');
            return
        }
        if(signForm.value.password.length < 6) {
            alert('Le mot de passe doit contenir au moins 6 caractères.');
            return
        }
        if(signForm.value.phone.length < 10) {
            alert('Le numéro de téléphone doit contenir au moins 10 chiffres.');
            return
        }
        else {
            fetch('http://localhost:3000/?????????????', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(signForm.value)
            }).then(response => {
                if (!response.ok) {
                    throw new Error('Erreur lors de l\'inscription');
                }
                return response.json();
            }).then(data => {
                console.log('Inscription réussie:', data);
            }).catch(error => {
                console.error('Erreur:', error);
            });
        }
    }


// Submit Log In Form function => GET method -------- A completer avec les routes backend


    function submitLogForm() {
        console.log("Connexion :", logForm.value);

        if (!logForm.value.mail || !logForm.value.password) {
            alert('Veuillez remplir tous les champs du formulaire de connexion.');
        }
        else {
            fetch('http://localhost:3000/???????????', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ mail: logForm.value.mail, password: logForm.value.password })
            })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Erreur lors de la connexion');
                    return response.json();
                }
            }).then((data) => {
                console.log('Connexion réussie:', data);
                userStore.setUser({
                    id: data.id,
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                    token: data.token
                });
                router.push({ path: '/landing' });
            }).catch((error) => {
                console.error('Erreur:', error);
                alert('Erreur lors de la connexion. Veuillez vérifier vos identifiants et réessayer.');
            });
        }
    }

    
// Button switch Sign In / Log In
    let onSignIn = ref(true);
    function logInButtonEvent ():void {
        onSignIn.value = false
    }
    function signInButtonEvent ():void {
        onSignIn.value = true
    }

</script>





<template>
    <section class="main-form-container">

        <div class="btn-box">
            <button :class="{ active: !onSignIn}" @click="logInButtonEvent">Deja membre ?</button>
            <button :class="{ active: onSignIn}" @click="signInButtonEvent">Incription</button>
        </div>

        <div class="form-container">
            <form id="sign-form" class="group-form" v-if="onSignIn" @submit.prevent="submitSignForm" action="">
                <div class="input-slide-group">
                    <input name="name" type="text" v-model="signForm.name" placeholder=" ">
                    <label>Nom d'utilisateur</label>
                </div>
                <div class="input-slide-group">
                    <input name="mail" type="text" v-model="signForm.mail" placeholder=" ">
                    <label>Email</label>
                </div>
                <div class="input-slide-group">
                    <input  name="phone" type="text" v-model="signForm.phone" placeholder=" ">
                    <label>Numero de telephone</label>
                </div>
                <div class="input-slide-group">
                    <input  name="password" type="password" v-model="signForm.password" placeholder=" ">
                    <label>Mot de passe</label>
                </div>
                <button type="submit">S'inscrire</button>
            </form>

            <form id="log-form" class="group-form" v-if="!onSignIn" @submit.prevent="submitLogForm" action="">
                <div class="input-slide-group">
                    <input name="mail" type="text" v-model="logForm.mail" placeholder=" ">
                    <label>Email</label>
                </div>
                <div class="input-slide-group">
                    <input  name="password" type="password" v-model="logForm.password" placeholder=" ">
                    <label>Mot de passe</label>
                </div>
                <button type="submit">Se connecter</button>
            </form>
        </div>

    </section>
</template>





<style scoped>
/* --------------------Component main container -------------------- */
    .main-form-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3rem;
        margin-top: 10%;
        transition: 0.3s ease-in;
    }




/* --------------------Switch button top form => Sign in or Log In -------------------- */
    .btn-box {
        display: flex;
        width: 58%;
        border-radius: 15px;
        overflow: hidden;
        border: 2px solid rgba(255, 255, 255, 0.705);
        box-shadow: 0px 3px 12px rgb(0, 0, 0);
        background-color: #535353;
    }
    .btn-box > button {
        height: 3rem;
        padding: 1rem;
        border: none;
        background: none;
        color: white;
        cursor: pointer;
        font-size: 1.1rem;
        transition: all 0.3s ease;
        width: 50%;
    }
    .btn-box > button.active {
        background: rgba(126, 126, 126, 0.45);
        transform: scale(1.03);
        box-shadow: inset 0px 0px 10px rgb(0, 0, 0);
    }
    



/* --------------------Form container -------------------- */
    .form-container {
        box-shadow: 3px 3px 32px rgb(0, 0, 0);
        border: 1px solid white;
        width: 70%;
        height: 430px;
        border-radius: 25px;
    }



/* -------------------- Form group => set of input and label -------------------- */
    .group-form {
        display: flex;
        flex-direction: column;
        justify-content: space-around;
        padding: 2rem;
        align-items: center;
        width: 90%;
        height: 100%;
        margin: auto;
    }

    .input-slide-group {
        position: relative;
        width: 100%;
        margin: 0.7rem;
    }

    .input-slide-group input {
        width: 100%;
        padding: 12px 10px;
        font-size: 1rem;
        border: 2px solid #e4e4e49c;
        border-radius: 6px;
        background: transparent;
        color: white;
        outline: none;
        transition: border-color 0.3s ease;
    }

    .input-slide-group label {
        position: absolute;
        top: 12px;
        left: 12px;
        color: #e4e4e4;
        transition: 0.3s ease;
        pointer-events: none;
    }

    .input-slide-group input:focus + label,
    .input-slide-group input:not(:placeholder-shown) + label {
        transform: translateX(-10px);
        opacity: 0;
    }
    .input-slide-group input:focus {
        border-color: white;
        transition: border-color 0.3s ease;
    }

    input:-webkit-autofill,
    textarea:-webkit-autofill {
        background-color: rgb(29, 29, 29) !important;
        -webkit-box-shadow: 0 0 0 1000px rgba(24, 24, 24, 0.963) inset !important;
        -webkit-text-fill-color: rgba(246, 243, 248, 0.897) !important;
        border: 2px solid #a5a5a59c !important;   
    }


/* -------------------- Bottom button to submit the form -------------------- */
    .group-form > button {
        width: 50%;
        height: 3rem;
        border-radius: 15px;
        border: none;
        background-color: rgb(94, 94, 94);
        color: white;
        font-size: 1.1rem;
        cursor: pointer;
        box-shadow: 0px 3px 10px rgb(0, 0, 0);
        border: 2px solid;
        border-color: rgba(255, 255, 255, 0);
        transition: 0.3s ease-in;
    }

    .group-form > button:hover {
        background-color: rgb(126, 126, 126);
        box-shadow: inset 0px 0px 10px rgb(0, 0, 0);
        border-color: rgba(255, 255, 255, 0.822);
    }


</style>
