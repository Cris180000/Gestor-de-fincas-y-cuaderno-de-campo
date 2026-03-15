-- CreateTable
CREATE TABLE "AgronomicAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "parcel_id" TEXT,
    "priority" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "recommendation_type" TEXT NOT NULL,
    "cta_label" TEXT,
    "cta_href" TEXT,
    "expires_at" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RecommendationOutcome" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "recommendation_id" TEXT NOT NULL,
    "recommendation_type" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "worked" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "AgronomicAlert_user_id_status_expires_at_idx" ON "AgronomicAlert"("user_id", "status", "expires_at");

-- CreateIndex
CREATE INDEX "RecommendationOutcome_user_id_recommendation_type_idx" ON "RecommendationOutcome"("user_id", "recommendation_type");
