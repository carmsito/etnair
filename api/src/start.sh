#!/bin/bash
set -e

echo "🚀 Script de démarrage API ETNAir sur Render"

# Vérifier que nous sommes dans le bon répertoire
echo "📂 Répertoire actuel: $(pwd)"
echo "📂 Contenu: $(ls -la)"

# Générer le client Prisma
echo "🔧 Génération du client Prisma..."
npx prisma generate

# Appliquer les migrations
echo "📦 Application des migrations..."
npx prisma migrate deploy

# Démarrer le serveur
echo "✅ Démarrage du serveur..."
node dist/app.js
