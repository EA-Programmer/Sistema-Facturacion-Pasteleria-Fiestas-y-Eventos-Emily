ALTER TABLE "BusinessSettings"
ADD COLUMN "signatureFileName" TEXT,
ADD COLUMN "signatureFilePath" TEXT,
ADD COLUMN "signaturePassword" TEXT,
ADD COLUMN "signatureRegisteredAt" TIMESTAMP(3);
