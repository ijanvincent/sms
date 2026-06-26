-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "scope" TEXT NOT NULL DEFAULT 'client';

-- CreateIndex
CREATE INDEX "Message_apiKeyId_createdAt_idx" ON "Message"("apiKeyId", "createdAt");
