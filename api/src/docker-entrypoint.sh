#!/bin/sh
set -e

echo "🚀 Démarrage de l'API ETNAir..."

# Attendre que la base de données soit prête
echo "⏳ Attente de la base de données..."
sleep 5

# Exécuter les migrations Prisma
echo "📦 Exécution des migrations Prisma..."
cd /app/src
npx prisma migrate deploy --schema=./prisma/schema.prisma

# Exécuter les seeds (seulement si la DB est vide)
echo "🌱 Vérification et exécution des seeds..."
npx ts-node seeders/seed.ts || echo "Seeds déjà exécutés ou erreur ignorée"

# Retourner au répertoire de l'app
cd /app

# Démarrer l'application
echo "✅ Démarrage du serveur..."
exec "$@"
