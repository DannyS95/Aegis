-- AlterTable
ALTER TABLE "public"."Conversation" ADD COLUMN     "isGroup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastMessageId" TEXT,
ADD COLUMN     "title" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropDefault
ALTER TABLE "public"."Conversation" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "public"."Message"("conversationId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Participant_conversationId_userId_key" ON "public"."Participant"("conversationId", "userId");
