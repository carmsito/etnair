-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AnnounceType" AS ENUM ('APARTMENT', 'HOUSE', 'VILLA', 'STUDIO', 'ROOM', 'OTHER');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announces" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" "AnnounceType" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "city" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announces_info" (
    "id" SERIAL NOT NULL,
    "announces_id" INTEGER NOT NULL,
    "content" TEXT,
    "address" VARCHAR(255),
    "postal_code" VARCHAR(20),
    "country" VARCHAR(100),
    "capacity" INTEGER,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "amenities" TEXT,
    "rules" TEXT,

    CONSTRAINT "announces_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announces_pictures" (
    "id" SERIAL NOT NULL,
    "announces_id" INTEGER NOT NULL,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "url" VARCHAR(500) NOT NULL,
    "filename" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announces_pictures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "announce_id" INTEGER NOT NULL,
    "title" VARCHAR(255),
    "total_price" DOUBLE PRECISION NOT NULL,
    "arrive_at" TIMESTAMP(3) NOT NULL,
    "leave_at" TIMESTAMP(3) NOT NULL,
    "reserved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "city" VARCHAR(100),
    "address" VARCHAR(255),
    "contact_host" VARCHAR(255),
    "guest_count" INTEGER DEFAULT 1,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_blacklist" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "announces_info_announces_id_key" ON "announces_info"("announces_id");

-- CreateIndex
CREATE UNIQUE INDEX "token_blacklist_token_key" ON "token_blacklist"("token");

-- AddForeignKey
ALTER TABLE "announces" ADD CONSTRAINT "announces_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announces_info" ADD CONSTRAINT "announces_info_announces_id_fkey" FOREIGN KEY ("announces_id") REFERENCES "announces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announces_pictures" ADD CONSTRAINT "announces_pictures_announces_id_fkey" FOREIGN KEY ("announces_id") REFERENCES "announces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_announce_id_fkey" FOREIGN KEY ("announce_id") REFERENCES "announces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
