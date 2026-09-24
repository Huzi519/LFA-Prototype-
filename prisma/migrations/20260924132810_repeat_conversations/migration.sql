-- DropIndex
DROP INDEX "Conversation_companyId_workerId_key";

-- CreateIndex
CREATE INDEX "Conversation_companyId_workerId_idx" ON "Conversation"("companyId", "workerId");
