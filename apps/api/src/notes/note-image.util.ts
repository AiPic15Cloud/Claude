import { StorageService } from '../common/storage/storage.service';

interface RawNoteImage {
  id: string;
  storageKey: string;
  storageDriver: string;
  mimeType: string;
}

/** Attaches a ready-to-use URL to each image so a note feed can render thumbnails without a round trip per image. */
export async function withNoteImageUrls<T extends { images: RawNoteImage[] }>(note: T, storage: StorageService) {
  const images = await Promise.all(
    note.images.map(async (image) => ({
      id: image.id,
      mimeType: image.mimeType,
      url: await storage.getUrl(image.storageKey, image.storageDriver),
    })),
  );
  return { ...note, images };
}
