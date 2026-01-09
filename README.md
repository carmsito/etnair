# ETNAir - Application de Réservation de Vols

Ce dépôt contient l'application complète ETNAir avec :
- **API Backend** : Node.js/TypeScript avec Express et Prisma ORM
- **Frontend** : Vue.js 3 avec TypeScript et Vite
- **Base de données** : PostgreSQL
- **Déploiement** : Docker Compose et Kubernetes (Minikube)

## Prérequis
- Docker et Docker Compose installés
- Node.js 22+ (pour développement local)
- Git pour cloner le dépôt

## Architecture
- **API** : Port 8080
- **Frontend** : Port 3000
- **PostgreSQL** : Port 5432 (interne aux conteneurs)

## Démarrage rapide avec Docker Compose

1. **Clonez le dépôt** :
```bash
git clone https://rendu-git.etna-alternance.net/module-10092/activity-54705/group-1068848.git
cd group-1068848/etnair
```

2. **Démarrez tous les services** :
```bash
docker-compose up --build
```

Les services seront accessibles sur :
- API : http://localhost:8080
- Frontend : http://localhost:3000

3. **Arrêter les services** :
```bash
docker-compose down
```

## Test de l'API

Une fois les conteneurs démarrés :

```bash
curl http://localhost:8080
```

Réponse attendue : `Bienvenue sur l'API etnair !`

## Développement local

### API (Backend)
```bash
cd api/src
npm install
npm run dev
```

### Frontend
```bash
cd front/src
npm install
npm run dev
```

## Déploiement Kubernetes

Les fichiers de déploiement sont disponibles dans :
- `api/api-deployment.yaml` : Déploiement de l'API
- `front/front-deployment.yaml` : Déploiement du frontend
- `db/postgresql-deployment.yaml` : Déploiement de PostgreSQL

Pour déployer sur Minikube :
```bash
kubectl apply -f db/postgresql-deployment.yaml
kubectl apply -f api/api-deployment.yaml
kubectl apply -f front/front-deployment.yaml
```

## Structure du projet
```
etnair/
├── api/                    # Backend API
│   ├── src/               # Code source TypeScript
│   ├── Dockerfile         # Image Docker pour l'API
│   └── api-deployment.yaml
├── front/                 # Frontend Vue.js
│   ├── src/              # Code source Vue.js
│   ├── Dockerfile        # Image Docker pour le frontend
│   └── front-deployment.yaml
├── db/                   # Configuration PostgreSQL
│   └── postgresql-deployment.yaml
└── docker-compose.yml    # Orchestration des services
```

## Variables d'environnement

### API
- `PORT` : 8080
- `DB_HOST` : db
- `DB_USER` : etnair_user
- `DB_PASSWORD` : etnair_pass
- `DB_NAME` : etnair_db

## Technologies utilisées
- **Backend** : Node.js 22, Express, TypeScript, Prisma ORM
- **Frontend** : Vue.js 3, TypeScript, Vite, Pinia
- **Base de données** : PostgreSQL 13
- **Containerisation** : Docker, Docker Compose
- **Orchestration** : Kubernetes