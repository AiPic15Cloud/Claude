-- CreateEnum
CREATE TYPE "FractionalDataRoomItemStatusValue" AS ENUM ('OBTAINED', 'MISSING', 'NOT_APPLICABLE', 'INCONSISTENT');

-- CreateTable
CREATE TABLE "fractional_data_room_item_statuses" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "block" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "status" "FractionalDataRoomItemStatusValue" NOT NULL,
    "notes" TEXT,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fractional_data_room_item_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fractional_data_room_item_statuses_projectId_idx" ON "fractional_data_room_item_statuses"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "fractional_data_room_item_statuses_projectId_block_itemKey_key" ON "fractional_data_room_item_statuses"("projectId", "block", "itemKey");

-- AddForeignKey
ALTER TABLE "fractional_data_room_item_statuses" ADD CONSTRAINT "fractional_data_room_item_statuses_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "fractional_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
