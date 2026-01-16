-- CreateIndex
CREATE INDEX "products_isDeleted_deletedAt_idx" ON "products"("isDeleted", "deletedAt");

-- CreateIndex
CREATE INDEX "products_storeId_isDeleted_status_idx" ON "products"("storeId", "isDeleted", "status");
