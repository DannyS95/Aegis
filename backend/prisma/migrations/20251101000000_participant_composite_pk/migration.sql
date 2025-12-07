-- Drop the surrogate primary key and unique index
ALTER TABLE "public"."Participant" DROP CONSTRAINT "Participant_pkey";
DROP INDEX "public"."Participant_conversationId_userId_key";

-- Remove the id column
ALTER TABLE "public"."Participant" DROP COLUMN "id";

-- Define composite primary key on (conversationId, userId)
ALTER TABLE "public"."Participant" ADD CONSTRAINT "Participant_pkey" PRIMARY KEY ("conversationId", "userId");
