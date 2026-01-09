#!/bin/bash
set -e

echo "🚀 Script de démarrage API ETNAir sur Render"

# Vérifier que nous sommes dans le bon répertoire
echo "📂 Répertoire actuel: $(pwd)"
echo "📂 Contenu: $(ls -la)"
echo "📂 Contenu prisma: $(ls -la prisma/ 2>/dev/null || echo 'Dossier prisma non trouvé')"

# Générer le client Prisma
echo "🔧 Génération du client Prisma..."
npx prisma generate --schema=./prisma/schema.prisma

# Appliquer les migrations
echo "📦 Application des migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

# Démarrer le serveur
echo "✅ Démarrage du serveur..."
node dist/app.js
