-- CreateTable
CREATE TABLE "note_images" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "storageDriver" TEXT NOT NULL DEFAULT 'local',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "note_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "note_images_noteId_idx" ON "note_images"("noteId");

-- AddForeignKey
ALTER TABLE "note_images" ADD CONSTRAINT "note_images_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
