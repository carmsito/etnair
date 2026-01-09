# Utiliser une image Node.js officielle
FROM node:22-alpine

# Installer OpenSSL pour Prisma
RUN apk add --no-cache openssl

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier le tsconfig.json à la racine
COPY tsconfig.json ./

# Copier le package.json depuis src/ et installer les dépendances
COPY src/package*.json ./src/
WORKDIR /app/src
RUN npm install

# Copier le schema Prisma et regénérer le client pour Alpine
COPY src/prisma ./prisma
RUN npx prisma generate

# Revenir à la racine et copier tout le code source
WORKDIR /app
COPY src/ ./src/

# Build l'application TypeScript (génère /app/src/dist)
RUN npm --prefix ./src run build

# Copier node_modules pour l'exécution
RUN cp -r ./src/node_modules ./node_modules

# Copier le dossier prisma dans src/dist pour les migrations
RUN mkdir -p ./src/dist/prisma && cp -r ./src/prisma/* ./src/dist/prisma/

# Exposer le port 8080
EXPOSE 8080

# Script de démarrage : migrations + seed + start
COPY src/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "src/dist/app.js"]
