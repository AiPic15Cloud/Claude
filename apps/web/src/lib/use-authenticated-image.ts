import { useEffect, useState } from 'react';
import { api } from './api';

/** Resolves an API-served image URL (local storage, guarded by JwtAuthGuard) to a blob: URL an <img> tag can actually load. */
export function useAuthenticatedImage(url: string | null | undefined): string | undefined {
  const [blobUrl, setBlobUrl] = useState<string>();

  useEffect(() => {
    if (!url) {
      setBlobUrl(undefined);
      return;
    }
    let objectUrl: string | undefined;
    let cancelled = false;
    api.getBlob(url).then((blob) => {
      if (cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setBlobUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return blobUrl;
}
