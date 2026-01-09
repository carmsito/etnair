import { PrismaClient, UserRole, AnnounceType, ReservationStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Fonction de hash sécurisée pour Docker Alpine
async function hashPassword(password: string): Promise<string> {
  try {
    return await bcrypt.hash(password, 10);
  } catch (error) {
    // Fallback simple si bcrypt échoue (environnement Alpine)
    console.warn('⚠️ bcrypt failed, using simple hash fallback');
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(password + 'etnair_salt').digest('hex');
  }
}

// ==================== DONNÉES RÉALISTES ====================

// Utilisateurs français réalistes
const usersData = [
  { username: 'admin', email: 'admin@etnair.com', phone: '0612345678', role: UserRole.ADMIN },
  { username: 'Marie_Dupont', email: 'marie.dupont@gmail.com', phone: '0623456789', role: UserRole.USER },
  { username: 'Jean_Martin', email: 'jean.martin@outlook.fr', phone: '0634567890', role: UserRole.USER },
  { username: 'Sophie_Bernard', email: 'sophie.bernard@yahoo.fr', phone: '0645678901', role: UserRole.USER },
  { username: 'Pierre_Durand', email: 'pierre.durand@gmail.com', phone: '0656789012', role: UserRole.USER },
  { username: 'Camille_Leroy', email: 'camille.leroy@hotmail.fr', phone: '0667890123', role: UserRole.USER },
  { username: 'Thomas_Moreau', email: 'thomas.moreau@gmail.com', phone: '0678901234', role: UserRole.USER },
  { username: 'Emma_Simon', email: 'emma.simon@outlook.fr', phone: '0689012345', role: UserRole.USER },
  { username: 'Lucas_Laurent', email: 'lucas.laurent@gmail.com', phone: '0690123456', role: UserRole.USER },
  { username: 'Chloé_Michel', email: 'chloe.michel@yahoo.fr', phone: '0601234567', role: UserRole.USER },
  { username: 'Hugo_Garcia', email: 'hugo.garcia@gmail.com', phone: '0712345678', role: UserRole.USER },
  { username: 'Léa_David', email: 'lea.david@outlook.fr', phone: '0723456789', role: UserRole.USER },
];

// Annonces réalistes avec données complètes
const announcesData = [
  {
    title: 'Charmant appartement au cœur du Marais',
    description: `Bienvenue dans ce magnifique appartement parisien situé en plein cœur du Marais, l'un des quartiers les plus prisés de Paris. 

Entièrement rénové avec goût, cet espace lumineux de 65m² allie le charme de l'ancien (poutres apparentes, parquet d'époque) au confort moderne.

Idéalement situé à deux pas de la Place des Vosges, vous pourrez profiter des nombreux restaurants, galeries d'art et boutiques du quartier. Le métro Saint-Paul est à 3 minutes à pied.`,
    type: 'APARTMENT' as AnnounceType,
    price: 145,
    city: 'Paris',
    info: {
      address: '23 Rue des Francs-Bourgeois',
      postalCode: '75004',
      country: 'France',
      capacity: 4,
      bedrooms: 2,
      bathrooms: 1,
      amenities: JSON.stringify(['WiFi haut débit', 'Cuisine équipée', 'Machine à laver', 'Chauffage', 'TV écran plat', 'Fer à repasser']),
      rules: 'Non-fumeur, pas de fêtes, animaux non acceptés',
    },
    pictures: [
      { url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', filename: 'salon.jpg', isCover: true },
      { url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', filename: 'chambre.jpg', isCover: false },
      { url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800', filename: 'cuisine.jpg', isCover: false },
    ],
  },
  {
    title: 'Villa avec piscine vue mer à Nice',
    description: `Superbe villa contemporaine de 200m² avec une vue imprenable sur la Baie des Anges.

Cette propriété d'exception dispose d'une piscine à débordement chauffée, d'un jardin méditerranéen de 1000m² et d'une terrasse panoramique parfaite pour les couchers de soleil.

À seulement 10 minutes du centre-ville de Nice et à 5 minutes de la plage privée. Parking privatif pour 2 véhicules inclus.`,
    type: 'VILLA' as AnnounceType,
    price: 450,
    city: 'Nice',
    info: {
      address: '156 Avenue des Fleurs',
      postalCode: '06000',
      country: 'France',
      capacity: 8,
      bedrooms: 4,
      bathrooms: 3,
      amenities: JSON.stringify(['Piscine privée', 'Vue mer', 'Climatisation', 'WiFi', 'Parking gratuit', 'Barbecue', 'Jardin', 'Lave-vaisselle']),
      rules: 'Fêtes autorisées avec accord préalable, animaux acceptés',
    },
    pictures: [
      { url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800', filename: 'villa.jpg', isCover: true },
      { url: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800', filename: 'piscine.jpg', isCover: false },
      { url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', filename: 'vue.jpg', isCover: false },
    ],
  },
  {
    title: 'Studio cosy proche de la Tour Eiffel',
    description: `Parfait pied-à-terre parisien ! Ce studio de 25m² entièrement équipé est idéal pour un couple souhaitant découvrir Paris.

Situé dans le 7ème arrondissement, vous êtes à 10 minutes à pied de la Tour Eiffel et du Champ de Mars. Le quartier regorge de boulangeries, cafés et restaurants typiquement parisiens.

Le studio dispose d'un lit double confortable, d'une kitchenette équipée et d'une salle de bain moderne.`,
    type: 'STUDIO' as AnnounceType,
    price: 89,
    city: 'Paris',
    info: {
      address: '45 Rue Cler',
      postalCode: '75007',
      country: 'France',
      capacity: 2,
      bedrooms: 1,
      bathrooms: 1,
      amenities: JSON.stringify(['WiFi', 'Kitchenette', 'TV', 'Chauffage', 'Sèche-cheveux', 'Draps fournis']),
      rules: 'Non-fumeur, pas de fêtes, pas d\'animaux',
    },
    pictures: [
      { url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', filename: 'studio.jpg', isCover: true },
      { url: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800', filename: 'lit.jpg', isCover: false },
    ],
  },
  {
    title: 'Maison de pêcheur rénovée à Saint-Malo',
    description: `Authentique maison de pêcheur du 18ème siècle entièrement rénovée, située intra-muros à Saint-Malo.

Cette demeure de caractère sur 3 niveaux (90m²) conserve tout son charme d'antan : murs en pierre, escalier en bois, cheminée d'époque. La terrasse sur le toit offre une vue panoramique sur les remparts et la mer.

Idéal pour découvrir la cité corsaire : plages, restaurants de fruits de mer et patrimoine historique à deux pas.`,
    type: 'HOUSE' as AnnounceType,
    price: 175,
    city: 'Saint-Malo',
    info: {
      address: '8 Rue de la Corne de Cerf',
      postalCode: '35400',
      country: 'France',
      capacity: 6,
      bedrooms: 3,
      bathrooms: 2,
      amenities: JSON.stringify(['WiFi', 'Cheminée', 'Terrasse vue mer', 'Cuisine équipée', 'Lave-linge', 'Livres et jeux']),
      rules: 'Non-fumeur, animaux acceptés sur demande',
    },
    pictures: [
      { url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800', filename: 'maison.jpg', isCover: true },
      { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', filename: 'interieur.jpg', isCover: false },
    ],
  },
  {
    title: 'Loft d\'artiste à Lyon Confluence',
    description: `Loft atypique de 110m² dans un ancien entrepôt réhabilité du quartier Confluence, le nouveau quartier tendance de Lyon.

Espace ouvert baigné de lumière grâce aux grandes verrières industrielles. Décoration contemporaine avec œuvres d'art originales. Le quartier offre une architecture moderne remarquable, des musées (Musée des Confluences) et de nombreux restaurants.

Parfait pour les amateurs d'art et d'architecture contemporaine.`,
    type: 'APARTMENT' as AnnounceType,
    price: 165,
    city: 'Lyon',
    info: {
      address: '12 Quai Rambaud',
      postalCode: '69002',
      country: 'France',
      capacity: 4,
      bedrooms: 2,
      bathrooms: 1,
      amenities: JSON.stringify(['WiFi fibre', 'Cuisine américaine', 'Vélos à disposition', 'Parking', 'Enceinte Bluetooth', 'Netflix']),
      rules: 'Non-fumeur, pas d\'animaux',
    },
    pictures: [
      { url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', filename: 'loft.jpg', isCover: true },
      { url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800', filename: 'salon.jpg', isCover: false },
    ],
  },
  {
    title: 'Chambre privée dans maison bordelaise',
    description: `Belle chambre privée de 18m² dans une maison bourgeoise du quartier des Chartrons à Bordeaux.

Vous disposerez de votre propre salle de bain et aurez accès aux espaces communs : cuisine équipée, salon avec cheminée, et joli jardin. Ambiance conviviale garantie !

Quartier vivant avec ses antiquaires, caves à vin et restaurants. Tramway à 2 minutes, centre-ville à 10 minutes.`,
    type: 'ROOM' as AnnounceType,
    price: 55,
    city: 'Bordeaux',
    info: {
      address: '34 Rue Notre-Dame',
      postalCode: '33000',
      country: 'France',
      capacity: 2,
      bedrooms: 1,
      bathrooms: 1,
      amenities: JSON.stringify(['WiFi', 'Petit-déjeuner inclus', 'Jardin', 'Parking vélo', 'Machine à café']),
      rules: 'Non-fumeur, pas d\'animaux, heures de calme après 22h',
    },
    pictures: [
      { url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800', filename: 'chambre.jpg', isCover: true },
      { url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800', filename: 'sdb.jpg', isCover: false },
    ],
  },
  {
    title: 'Appartement vue sur le Vieux-Port à Marseille',
    description: `Magnifique T3 de 75m² avec balcon donnant directement sur le Vieux-Port de Marseille.

Réveillez-vous avec une vue imprenable sur les bateaux et le Fort Saint-Jean ! L'appartement a été entièrement refait à neuf avec des matériaux de qualité. Climatisation réversible indispensable l'été.

Emplacement exceptionnel : restaurants, marché aux poissons, MuCEM et quartier du Panier accessibles à pied.`,
    type: 'APARTMENT' as AnnounceType,
    price: 135,
    city: 'Marseille',
    info: {
      address: '15 Quai du Port',
      postalCode: '13002',
      country: 'France',
      capacity: 5,
      bedrooms: 2,
      bathrooms: 1,
      amenities: JSON.stringify(['Vue Vieux-Port', 'Balcon', 'Climatisation', 'WiFi', 'Cuisine équipée', 'Ascenseur']),
      rules: 'Non-fumeur, animaux de petite taille acceptés',
    },
    pictures: [
      { url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', filename: 'vue.jpg', isCover: true },
      { url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', filename: 'salon.jpg', isCover: false },
    ],
  },
  {
    title: 'Chalet cocooning au pied des pistes - Chamonix',
    description: `Chalet traditionnel en bois de 120m² situé à 200m des remontées mécaniques de Chamonix.

Ambiance montagne chaleureuse avec sa cheminée, ses boiseries et sa vue sur le Mont-Blanc. Après une journée de ski, détendez-vous dans le jacuzzi extérieur face aux sommets enneigés.

Local à skis chauffé, garage fermé, et navette gratuite vers le centre-ville.`,
    type: 'HOUSE' as AnnounceType,
    price: 320,
    city: 'Chamonix',
    info: {
      address: '245 Route des Pèlerins',
      postalCode: '74400',
      country: 'France',
      capacity: 10,
      bedrooms: 5,
      bathrooms: 3,
      amenities: JSON.stringify(['Jacuzzi', 'Cheminée', 'Vue Mont-Blanc', 'Local à skis', 'WiFi', 'Garage', 'Sauna']),
      rules: 'Non-fumeur à l\'intérieur, animaux acceptés',
    },
    pictures: [
      { url: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800', filename: 'chalet.jpg', isCover: true },
      { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', filename: 'salon.jpg', isCover: false },
    ],
  },
  {
    title: 'Appartement design Vieux-Lille',
    description: `Superbe appartement de standing de 85m² au cœur du Vieux-Lille, dans un immeuble flamand du 17ème siècle.

Décoration contemporaine épurée contrastant avec les briques et poutres d'origine. Deux chambres spacieuses, grande pièce de vie lumineuse et cuisine ouverte haut de gamme.

Quartier animé avec ses estaminets, boutiques et la Grand'Place à 5 minutes.`,
    type: 'APARTMENT' as AnnounceType,
    price: 125,
    city: 'Lille',
    info: {
      address: '28 Rue de la Monnaie',
      postalCode: '59800',
      country: 'France',
      capacity: 4,
      bedrooms: 2,
      bathrooms: 1,
      amenities: JSON.stringify(['WiFi', 'Nespresso', 'TV connectée', 'Cuisine équipée', 'Chauffage au sol', 'Linge de maison premium']),
      rules: 'Non-fumeur, pas de fêtes',
    },
    pictures: [
      { url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800', filename: 'salon.jpg', isCover: true },
      { url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', filename: 'chambre.jpg', isCover: false },
    ],
  },
  {
    title: 'Mas provençal avec piscine - Luberon',
    description: `Authentique mas provençal du 18ème siècle niché au cœur du Luberon, entouré de lavandes et d'oliviers.

Cette propriété de charme de 180m² offre 4 chambres climatisées, une grande cuisine provençale, et plusieurs terrasses ombragées. La piscine de 12x6m avec pool house est un véritable havre de paix.

Villages pittoresques (Gordes, Roussillon, Ménerbes) à moins de 20 minutes.`,
    type: 'VILLA' as AnnounceType,
    price: 380,
    city: 'Apt',
    info: {
      address: 'Chemin des Ocres',
      postalCode: '84400',
      country: 'France',
      capacity: 8,
      bedrooms: 4,
      bathrooms: 3,
      amenities: JSON.stringify(['Piscine', 'Climatisation', 'Terrain de pétanque', 'Barbecue', 'WiFi', 'Parking', 'Oliviers', 'Vue Luberon']),
      rules: 'Non-fumeur à l\'intérieur, animaux acceptés, pas de fêtes',
    },
    pictures: [
      { url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', filename: 'mas.jpg', isCover: true },
      { url: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800', filename: 'piscine.jpg', isCover: false },
    ],
  },
  {
    title: 'Studio moderne Strasbourg Petite France',
    description: `Charmant studio de 30m² dans le quartier historique de la Petite France, classé au patrimoine mondial de l'UNESCO.

Logement moderne et fonctionnel dans une maison à colombages. Vue sur les canaux depuis la fenêtre. Idéal pour découvrir Strasbourg : cathédrale, marché de Noël, institutions européennes.

Restaurants winstubs et terrasses au bord de l'eau à deux pas.`,
    type: 'STUDIO' as AnnounceType,
    price: 79,
    city: 'Strasbourg',
    info: {
      address: '5 Rue du Bain aux Plantes',
      postalCode: '67000',
      country: 'France',
      capacity: 2,
      bedrooms: 1,
      bathrooms: 1,
      amenities: JSON.stringify(['WiFi', 'Kitchenette', 'Vue canal', 'Chauffage', 'TV', 'Machine à café']),
      rules: 'Non-fumeur, pas d\'animaux',
    },
    pictures: [
      { url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', filename: 'studio.jpg', isCover: true },
    ],
  },
  {
    title: 'Grande maison familiale Côte Basque',
    description: `Spacieuse maison basque de 150m² à 800m de la plage de la Côte des Basques à Biarritz.

Parfaite pour les familles et groupes d'amis surfeurs ! 5 chambres, grand jardin avec barbecue, et garage pour ranger les planches. Déco surf chic et ambiance décontractée.

Spots de surf légendaires, centre-ville animé et restaurants à proximité.`,
    type: 'HOUSE' as AnnounceType,
    price: 245,
    city: 'Biarritz',
    info: {
      address: '12 Avenue de la Perspective',
      postalCode: '64200',
      country: 'France',
      capacity: 10,
      bedrooms: 5,
      bathrooms: 2,
      amenities: JSON.stringify(['Jardin', 'Barbecue', 'Garage', 'WiFi', 'Lave-linge', 'Planches de surf disponibles', 'Douche extérieure']),
      rules: 'Animaux acceptés, fêtes avec accord préalable',
    },
    pictures: [
      { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', filename: 'maison.jpg', isCover: true },
      { url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800', filename: 'jardin.jpg', isCover: false },
    ],
  },
];

// Avis réalistes
const reviewsData = {
  excellent: [
    "Séjour parfait ! L'appartement est exactement comme sur les photos, voire mieux. L'hôte a été très réactif et nous a donné d'excellents conseils pour découvrir le quartier. On reviendra sans hésiter !",
    "Coup de cœur pour ce logement ! Propreté irréprochable, déco magnifique et emplacement idéal. Merci pour les petites attentions à notre arrivée (bouteille de vin, chocolats). Top !",
    "Nous avons passé un week-end merveilleux. Le logement est spacieux, lumineux et très bien équipé. La vue est incroyable ! Communication parfaite avec l'hôte. Je recommande à 200% !",
    "Meilleure expérience Airbnb ! L'appartement est sublime, le quartier super sympa, et l'hôte adorable. Les enfants ont adoré. Merci pour tout !",
    "Logement d'exception ! Chaque détail a été pensé pour notre confort. Literie de qualité hôtelière, cuisine équipée top, et le petit balcon est un vrai plus. Parfait !",
    "On s'est sentis comme chez nous dès notre arrivée. Appartement chaleureux, propre et fonctionnel. L'hôte nous a même laissé partir plus tard le dernier jour. Super expérience !",
  ],
  good: [
    "Très bon séjour dans l'ensemble. L'appartement correspond bien aux photos. Quelques petits bruits de la rue le matin mais rien de rédhibitoire. Je recommande.",
    "Logement agréable et bien situé. La cuisine mériterait quelques ustensiles supplémentaires mais on a passé un bon moment. Hôte sympathique.",
    "Bon rapport qualité-prix pour le quartier. L'appartement est propre et confortable. Seul petit bémol : le WiFi un peu lent pour le télétravail.",
    "Séjour satisfaisant. Le logement est conforme à la description. L'hôte répond rapidement aux messages. Le quartier est sympa avec plein de restos.",
    "Appartement correct, bien équipé pour l'essentiel. La salle de bain est un peu petite mais fonctionnelle. Bonne adresse pour visiter la ville.",
  ],
  average: [
    "Logement correct mais quelques déceptions : le canapé est un peu fatigué et la propreté pourrait être améliorée. Bien situé cependant.",
    "Séjour mitigé. L'emplacement est top mais l'appartement mériterait une rénovation. Bruyant le week-end à cause des bars en bas.",
    "C'était bien mais sans plus. Le logement est vieillissant et certains équipements ne fonctionnent pas très bien. Prix un peu élevé pour ce que c'est.",
    "Correct pour dépanner mais j'attendais mieux vu les photos. Propreté moyenne à notre arrivée. L'hôte a été réactif pour résoudre un problème de chauffe-eau.",
  ],
  poor: [
    "Déçu par ce séjour. L'appartement ne correspond pas aux photos (plus petit et moins lumineux). Problèmes de propreté à notre arrivée.",
    "Expérience décevante. Très bruyant, impossible de dormir correctement. L'hôte n'a pas été très réactif quand on a signalé les problèmes.",
    "Le logement nécessite vraiment une rénovation. Équipements vétustes, literie inconfortable. Le seul point positif est l'emplacement.",
  ],
};

// ==================== FONCTIONS DE CRÉATION ====================

async function createUser(data: typeof usersData[0]) {
  const password = await hashPassword('password123');
  return prisma.user.create({
    data: {
      username: data.username,
      email: data.email,
      password,
      phone: data.phone,
      role: data.role,
    },
  });
}

async function createAnnounce(userId: number, data: typeof announcesData[0]) {
  return prisma.announce.create({
    data: {
      userId,
      title: data.title,
      description: data.description,
      type: data.type,
      price: data.price,
      city: data.city,
      isActive: true,
      info: {
        create: {
          content: data.description,
          address: data.info.address,
          postalCode: data.info.postalCode,
          country: data.info.country,
          capacity: data.info.capacity,
          bedrooms: data.info.bedrooms,
          bathrooms: data.info.bathrooms,
          amenities: data.info.amenities,
          rules: data.info.rules,
        },
      },
      pictures: {
        create: data.pictures,
      },
    },
    include: {
      info: true,
      pictures: true,
    },
  });
}

async function createReservation(
  userId: number,
  announce: any,
  status: ReservationStatus,
  daysFromNow: number,
  nights: number
) {
  const arriveAt = new Date();
  arriveAt.setDate(arriveAt.getDate() + daysFromNow);
  const leaveAt = new Date(arriveAt);
  leaveAt.setDate(leaveAt.getDate() + nights);
  
  const totalPrice = announce.price * nights;
  
  return prisma.reservation.create({
    data: {
      userId,
      announceId: announce.id,
      title: `Séjour à ${announce.city}`,
      totalPrice,
      arriveAt,
      leaveAt,
      status,
      city: announce.city,
      address: announce.info?.address,
      contactHost: 'contact@etnair.com',
      guestCount: Math.min(Math.floor(Math.random() * 4) + 1, announce.info?.capacity || 4),
    },
  });
}

async function createReview(userId: number, announceId: number, rating: number) {
  let comment: string;
  const reviews = rating === 5 
    ? reviewsData.excellent 
    : rating === 4 
      ? reviewsData.good 
      : rating === 3 
        ? reviewsData.average 
        : reviewsData.poor;
  
  comment = reviews[Math.floor(Math.random() * reviews.length)];
  
  return prisma.review.create({
    data: {
      userId,
      announceId,
      rating,
      comment,
    },
  });
}

// ==================== FONCTION PRINCIPALE ====================

async function main() {
  console.log('🌱 Début du seeding ETNAir...\n');

  // Nettoyer la base de données
  console.log('🗑️  Nettoyage des données existantes...');
  await prisma.favorite.deleteMany();
  await prisma.review.deleteMany();
  await prisma.tokenBlacklist.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.announcePicture.deleteMany();
  await prisma.announceInfo.deleteMany();
  await prisma.announce.deleteMany();
  await prisma.user.deleteMany();

  // Créer les utilisateurs
  console.log('\n👤 Création des utilisateurs...');
  const users = [];
  for (const userData of usersData) {
    const user = await createUser(userData);
    users.push(user);
    console.log(`   ✓ ${user.username} (${user.email})`);
  }

  // Créer les annonces (répartir entre les utilisateurs non-admin)
  console.log('\n🏠 Création des annonces...');
  const announces = [];
  const nonAdminUsers = users.filter(u => u.role !== 'ADMIN');
  
  for (let i = 0; i < announcesData.length; i++) {
    const owner = nonAdminUsers[i % nonAdminUsers.length];
    const announce = await createAnnounce(owner.id, announcesData[i]);
    announces.push(announce);
    console.log(`   ✓ "${announce.title}" par ${owner.username}`);
  }

  // Créer des réservations réalistes
  console.log('\n📅 Création des réservations...');
  const reservations = [];
  
  // Réservations passées (COMPLETED)
  for (let i = 0; i < 5; i++) {
    const user = nonAdminUsers[Math.floor(Math.random() * nonAdminUsers.length)];
    const announce = announces.filter(a => a.userId !== user.id)[Math.floor(Math.random() * announces.length)];
    if (announce) {
      const res = await createReservation(user.id, announce, 'COMPLETED', -30 - i * 10, 3 + i);
      reservations.push(res);
    }
  }
  
  // Réservations confirmées (à venir)
  for (let i = 0; i < 4; i++) {
    const user = nonAdminUsers[Math.floor(Math.random() * nonAdminUsers.length)];
    const announce = announces.filter(a => a.userId !== user.id)[Math.floor(Math.random() * announces.length)];
    if (announce) {
      const res = await createReservation(user.id, announce, 'CONFIRMED', 7 + i * 14, 4 + i);
      reservations.push(res);
    }
  }
  
  // Réservations en attente
  for (let i = 0; i < 3; i++) {
    const user = nonAdminUsers[Math.floor(Math.random() * nonAdminUsers.length)];
    const announce = announces.filter(a => a.userId !== user.id)[Math.floor(Math.random() * announces.length)];
    if (announce) {
      const res = await createReservation(user.id, announce, 'PENDING', 20 + i * 7, 2 + i);
      reservations.push(res);
    }
  }
  
  console.log(`   ✓ ${reservations.length} réservations créées`);

  // Créer des avis pour chaque annonce
  console.log('\n⭐ Création des avis...');
  const reviews = [];
  
  for (const announce of announces) {
    const reviewers = nonAdminUsers.filter(u => u.id !== announce.userId);
    const numReviews = 3 + Math.floor(Math.random() * 5); // 3 à 7 avis par annonce
    
    const shuffledReviewers = reviewers.sort(() => Math.random() - 0.5).slice(0, numReviews);
    
    for (const reviewer of shuffledReviewers) {
      // Distribution réaliste des notes (beaucoup de 4-5, moins de 1-3)
      const rand = Math.random();
      const rating = rand < 0.45 ? 5 : rand < 0.75 ? 4 : rand < 0.88 ? 3 : rand < 0.95 ? 2 : 1;
      
      const review = await createReview(reviewer.id, announce.id, rating);
      reviews.push(review);
    }
  }
  console.log(`   ✓ ${reviews.length} avis créés`);

  // Créer quelques favoris
  console.log('\n❤️  Création des favoris...');
  let favCount = 0;
  for (const user of nonAdminUsers) {
    const randomAnnounces = announces.sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 3));
    for (const announce of randomAnnounces) {
      if (announce.userId !== user.id) {
        await prisma.favorite.create({
          data: { userId: user.id, announceId: announce.id },
        });
        favCount++;
      }
    }
  }
  console.log(`   ✓ ${favCount} favoris créés`);

  // Résumé
  console.log('\n═══════════════════════════════════════════════');
  console.log('📊 Résumé du seeding ETNAir:');
  console.log(`   👤 Utilisateurs: ${users.length}`);
  console.log(`   🏠 Annonces: ${announces.length}`);
  console.log(`   📅 Réservations: ${reservations.length}`);
  console.log(`   ⭐ Avis: ${reviews.length}`);
  console.log(`   ❤️  Favoris: ${favCount}`);
  console.log('═══════════════════════════════════════════════');
  console.log('\n🎉 Seeding terminé avec succès!\n');
  console.log('📝 Comptes pour les tests:');
  console.log('   Admin:');
  console.log('     Email: admin@etnair.com');
  console.log('     Mot de passe: password123');
  console.log('   Utilisateur:');
  console.log('     Email: marie.dupont@gmail.com');
  console.log('     Mot de passe: password123');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
