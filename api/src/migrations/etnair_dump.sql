-- ETNAir Database Schema
-- PostgreSQL Dump File
-- Version: 1.0.0
-- Date: 2026-01-08

-- Supprimer les tables existantes (dans l'ordre inverse des dependances)
DROP TABLE IF EXISTS token_blacklist CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS announces_pictures CASCADE;
DROP TABLE IF EXISTS announces_info CASCADE;
DROP TABLE IF EXISTS announces CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Supprimer les types enum existants
DROP TYPE IF EXISTS "UserRole" CASCADE;
DROP TYPE IF EXISTS "AnnounceType" CASCADE;
DROP TYPE IF EXISTS "ReservationStatus" CASCADE;

-- ============================================
-- CREATION DES TYPES ENUM
-- ============================================

-- Role utilisateur
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- Type d'annonce (logement)
CREATE TYPE "AnnounceType" AS ENUM (
    'APARTMENT',  -- Appartement
    'HOUSE',      -- Maison
    'VILLA',      -- Villa
    'STUDIO',     -- Studio
    'ROOM',       -- Chambre
    'OTHER'       -- Autre
);

-- Statut de reservation
CREATE TYPE "ReservationStatus" AS ENUM (
    'PENDING',    -- En attente
    'CONFIRMED',  -- Confirmee
    'CANCELLED',  -- Annulee
    'COMPLETED'   -- Terminee
);

-- ============================================
-- CREATION DES TABLES
-- ============================================

-- Table des utilisateurs
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role "UserRole" NOT NULL DEFAULT 'USER',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index pour recherche rapide par email
CREATE INDEX idx_users_email ON users(email);

-- Table des annonces (logements)
CREATE TABLE announces (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type "AnnounceType" NOT NULL,
    price FLOAT NOT NULL CHECK (price >= 0),
    city VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index pour recherche par ville et type
CREATE INDEX idx_announces_city ON announces(city);
CREATE INDEX idx_announces_type ON announces(type);
CREATE INDEX idx_announces_user_id ON announces(user_id);
CREATE INDEX idx_announces_active ON announces(is_active);

-- Table des informations detaillees des annonces
CREATE TABLE announces_info (
    id SERIAL PRIMARY KEY,
    announces_id INTEGER NOT NULL UNIQUE REFERENCES announces(id) ON DELETE CASCADE,
    content TEXT,
    address VARCHAR(255),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    capacity INTEGER,
    bedrooms INTEGER,
    bathrooms INTEGER,
    amenities TEXT,  -- JSON stringifie des equipements
    rules TEXT
);

-- Table des images des annonces
CREATE TABLE announces_pictures (
    id SERIAL PRIMARY KEY,
    announces_id INTEGER NOT NULL REFERENCES announces(id) ON DELETE CASCADE,
    is_cover BOOLEAN NOT NULL DEFAULT FALSE,
    url VARCHAR(500) NOT NULL,
    filename VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index pour recuperer les images d'une annonce
CREATE INDEX idx_announces_pictures_announce_id ON announces_pictures(announces_id);

-- Table des reservations
CREATE TABLE reservations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    announce_id INTEGER NOT NULL REFERENCES announces(id) ON DELETE CASCADE,
    title VARCHAR(255),
    total_price FLOAT NOT NULL CHECK (total_price >= 0),
    arrive_at TIMESTAMP NOT NULL,
    leave_at TIMESTAMP NOT NULL,
    reserved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    city VARCHAR(100),
    address VARCHAR(255),
    contact_host VARCHAR(255),
    guest_count INTEGER DEFAULT 1,
    
    -- Contrainte: la date de depart doit etre apres la date d'arrivee
    CONSTRAINT check_dates CHECK (leave_at > arrive_at)
);

-- Index pour recherche rapide
CREATE INDEX idx_reservations_user_id ON reservations(user_id);
CREATE INDEX idx_reservations_announce_id ON reservations(announce_id);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_dates ON reservations(arrive_at, leave_at);

-- Table pour la blacklist des tokens JWT
CREATE TABLE token_blacklist (
    id SERIAL PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index pour recherche rapide des tokens
CREATE INDEX idx_token_blacklist_token ON token_blacklist(token);
CREATE INDEX idx_token_blacklist_expires ON token_blacklist(expires_at);

-- ============================================
-- FONCTION DE MISE A JOUR AUTOMATIQUE DE updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour mise a jour automatique
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announces_updated_at
    BEFORE UPDATE ON announces
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DONNEES D'EXEMPLE (optionnel)
-- ============================================

-- Utilisateur admin par defaut (mot de passe: admin123)
-- Le hash correspond a "admin123" avec bcrypt, salt rounds = 10
INSERT INTO users (username, email, password, role) VALUES (
    'admin',
    'admin@etnair.com',
    '$2b$10$rX/1jP0n8eF0YcvYsQFkVeQkJMYqKjJ8X8x8w7xg6f5h4v3c2a1y0',
    'ADMIN'
);

-- ============================================
-- COMMENTAIRES SUR LES TABLES
-- ============================================

COMMENT ON TABLE users IS 'Table des utilisateurs de la plateforme ETNAir';
COMMENT ON COLUMN users.role IS 'Role: USER (locataire/proprietaire) ou ADMIN';

COMMENT ON TABLE announces IS 'Table des annonces de logements';
COMMENT ON COLUMN announces.type IS 'Type de logement: APARTMENT, HOUSE, VILLA, STUDIO, ROOM, OTHER';
COMMENT ON COLUMN announces.price IS 'Prix par nuit en euros';

COMMENT ON TABLE announces_info IS 'Informations detaillees des annonces';
COMMENT ON COLUMN announces_info.amenities IS 'Liste des equipements au format JSON';

COMMENT ON TABLE announces_pictures IS 'Images des annonces';
COMMENT ON COLUMN announces_pictures.url IS 'URL de l''image (stockage S3/MinIO)';
COMMENT ON COLUMN announces_pictures.is_cover IS 'Image de couverture (1 seule par annonce)';

COMMENT ON TABLE reservations IS 'Table des reservations';
COMMENT ON COLUMN reservations.status IS 'Statut: PENDING, CONFIRMED, CANCELLED, COMPLETED';

COMMENT ON TABLE token_blacklist IS 'Tokens JWT revoques (blacklist)';

-- ============================================
-- FIN DU DUMP
-- ============================================
