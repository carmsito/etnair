# Utiliser une image Node.js officielle
FROM node:22-alpine

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier les package.json (racine et src/)
COPY package*.json ./
COPY src/package*.json ./src/

# Installer les dépendances depuis src/
WORKDIR /app/src
RUN npm install

# Copier tout le code source
WORKDIR /app
COPY src/ ./src/

# Exposer le port 3000
EXPOSE 3000

# Variable d'environnement pour l'API
ENV VITE_API_URL=http://localhost:8080

# Commande pour démarrer l'application
WORKDIR /app/src
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
