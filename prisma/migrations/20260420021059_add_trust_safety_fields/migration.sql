-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('BEGINNER_OK', 'SOME_EXPERIENCE', 'EXPERIENCED_ONLY');

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "experienceLevel" "ExperienceLevel" NOT NULL DEFAULT 'BEGINNER_OK',
ADD COLUMN     "holdingFee" DECIMAL(10,2),
ADD COLUMN     "usageNotes" TEXT;
