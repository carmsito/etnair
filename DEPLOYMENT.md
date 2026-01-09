# 🚀 Guide de Déploiement ETNAir sur Render.com

Ce guide vous permet de déployer gratuitement votre application ETNAir et d'y accéder depuis n'importe quelle machine.

## ✅ Solution de Déploiement Gratuit : Render.com

**Avantages :**
- ✨ 100% GRATUIT (plan Free tier)
- 🗄️ Base de données PostgreSQL incluse gratuitement
- 🌍 Accessible depuis n'importe où avec une URL HTTPS
- 🔒 SSL/TLS automatique
- 🔄 Déploiement automatique depuis Git

## 📋 Prérequis

1. Un compte GitHub (gratuit)
2. Un compte Render.com (gratuit - créer sur https://render.com)
3. Votre code ETNAir poussé sur GitHub

## 🔧 Étape 1 : Préparer votre dépôt GitHub

### 1.1 Initialiser Git (si pas déjà fait)

```bash
cd /home/emmanuel/workspace/ecole/etna/B3/C2W-CBI1/etnair/etnair
git init
git add .
git commit -m "Initial commit - ETNAir project"
```

### 1.2 Créer un dépôt sur GitHub

1. Allez sur https://github.com
2. Cliquez sur le bouton "+" en haut à droite → "New repository"
3. Nommez-le `etnair` (ou autre nom)
4. Laissez-le en **Public** (nécessaire pour le plan gratuit)
5. Ne cochez PAS "Initialize with README" (vous avez déjà du code)
6. Cliquez sur "Create repository"

### 1.3 Pousser votre code

```bash
git remote add origin https://github.com/VOTRE_USERNAME/etnair.git
git branch -M main
git push -u origin main
```

## 🌐 Étape 2 : Créer un compte Render.com

1. Allez sur https://render.com
2. Cliquez sur "Get Started for Free"
3. Connectez-vous avec votre compte GitHub
4. Autorisez Render à accéder à vos dépôts

## 🗄️ Étape 3 : Créer la base de données PostgreSQL

1. Sur le dashboard Render, cliquez sur "New +" → "PostgreSQL"
2. Configurez :
   - **Name** : `etnair-db`
   - **Database** : `etnair_db`
   - **User** : `etnair_user`
   - **Region** : choisir `Frankfurt (EU Central)` ou la plus proche
   - **Plan** : Sélectionner **Free**
3. Cliquez sur "Create Database"
4. ⏳ Attendez 1-2 minutes que la base soit créée
5. **IMPORTANT** : Copiez l'URL de connexion "Internal Database URL" (vous en aurez besoin)

## 🔌 Étape 4 : Déployer l'API (Backend)

1. Cliquez sur "New +" → "Web Service"
2. Sélectionnez votre dépôt GitHub `etnair`
3. Configurez :
   - **Name** : `etnair-api`
   - **Region** : même région que la base de données
   - **Root Directory** : `api/src`
   - **Runtime** : `Node`
   - **Build Command** : 
     ```
     npm install && npx prisma generate && npm run build
     ```
   - **Start Command** : 
     ```
     npx prisma migrate deploy && node dist/app.js
     ```
   - **Plan** : Sélectionner **Free**

4. Cliquez sur "Advanced" et ajoutez ces **Variables d'environnement** :

   | Clé | Valeur |
   |-----|--------|
   | `DATABASE_URL` | Coller l'URL de votre base de données (étape 3) |
   | `NODE_ENV` | `production` |
   | `PORT` | `8080` |
   | `JWT_SECRET` | `votre_secret_tres_securise_123456789` |
   | `CORS_ORIGINS` | `https://etnair-front.onrender.com` (vous ajusterez après) |

5. Cliquez sur "Create Web Service"
6. ⏳ Attendez 5-10 minutes pour le premier déploiement
7. Une fois terminé, notez votre URL API : `https://etnair-api.onrender.com`

## 🎨 Étape 5 : Déployer le Frontend (Vue.js)

1. Cliquez sur "New +" → "Web Service"
2. Sélectionnez à nouveau votre dépôt GitHub `etnair`
3. Configurez :
   - **Name** : `etnair-front`
   - **Region** : même région que l'API
   - **Root Directory** : `front/src`
   - **Runtime** : `Node`
   - **Build Command** : 
     ```
     npm install && npm run build
     ```
   - **Start Command** : 
     ```
     npm run preview -- --host 0.0.0.0 --port $PORT
     ```
   - **Plan** : Sélectionner **Free**

4. Ajoutez ces **Variables d'environnement** :

   | Clé | Valeur |
   |-----|--------|
   | `VITE_API_URL` | `https://etnair-api.onrender.com` |

5. Cliquez sur "Create Web Service"
6. ⏳ Attendez 5-10 minutes
7. Notez votre URL frontend : `https://etnair-front.onrender.com`

## 🔄 Étape 6 : Mettre à jour le CORS de l'API

1. Retournez sur le service `etnair-api`
2. Allez dans "Environment"
3. Modifiez la variable `CORS_ORIGINS` avec l'URL du frontend :
   ```
   https://etnair-front.onrender.com
   ```
4. Sauvegardez (le service redémarrera automatiquement)

## ✅ Étape 7 : Tester votre déploiement

1. Ouvrez votre navigateur
2. Allez sur `https://etnair-front.onrender.com`
3. Vous devriez voir votre application ETNAir ! 🎉

### Tests supplémentaires :
- API Health : `https://etnair-api.onrender.com/health`
- API Docs : `https://etnair-api.onrender.com/api-docs`

## 📱 Accès depuis n'importe quelle machine

Maintenant, vous pouvez accéder à votre application depuis n'importe quel ordinateur, téléphone ou tablette en utilisant simplement l'URL :

```
https://etnair-front.onrender.com
```

**Partagez cette URL avec qui vous voulez !**

## ⚡ Déploiements automatiques

Chaque fois que vous faites un `git push` sur GitHub, Render redéploiera automatiquement votre application.

```bash
# Après avoir modifié du code :
git add .
git commit -m "Description des modifications"
git push
```

Render détecte automatiquement les changements et redéploie (5-10 minutes).

## ⚠️ Limitations du plan gratuit

- **Sommeil après 15 min d'inactivité** : La première requête après inactivité prendra ~30 secondes (le service se réveille)
- **750 heures/mois** : Largement suffisant pour un usage normal
- **Base de données** : 90 jours de rétention, puis suppression si non utilisée
- **Bande passante** : 100 GB/mois

## 🔐 Sécurité recommandée

### Avant la production :

1. Changez le `JWT_SECRET` dans les variables d'environnement Render
2. Utilisez un mot de passe fort pour la base de données
3. Activez l'authentification à deux facteurs sur GitHub et Render

## 🆘 Dépannage

### Problème : "Application Error" ou "Service Unavailable"

1. Allez dans le dashboard Render
2. Cliquez sur votre service
3. Allez dans l'onglet "Logs"
4. Regardez les erreurs

### Problème : "CORS Error"

- Vérifiez que `CORS_ORIGINS` contient bien l'URL exacte du frontend
- Redémarrez le service API

### Problème : "Database connection failed"

- Vérifiez que `DATABASE_URL` est correctement configurée
- La base de données doit être dans la même région

## 📞 Support

- Documentation Render : https://render.com/docs
- Status Render : https://status.render.com

## 🎯 Alternative : Railway.app

Si Render ne fonctionne pas, essayez Railway.app (aussi gratuit) :

1. https://railway.app
2. Même principe mais avec un fichier `railway.json`
3. 500h gratuites/mois ($5 de crédit gratuit)

---

**Félicitations ! Votre application ETNAir est maintenant accessible depuis n'importe où dans le monde ! 🌍✈️**
