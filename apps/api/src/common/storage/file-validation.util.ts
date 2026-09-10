import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';

/**
 * MIME types a deal document is allowed to be. Deliberately excludes
 * anything a browser can execute or render as markup (text/html,
 * image/svg+xml, application/javascript, …) — an S3-backed document is
 * served back with this same content type, so allowing one of those would
 * let an uploaded file run as script in the context of whoever opens it
 * (stored XSS).
 */
export const DOCUMENT_MIME_ALLOWLIST = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

/** Note-image uploads: raster formats only — image/svg+xml can embed <script> and must never be allowed. */
export const IMAGE_MIME_ALLOWLIST = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

type MulterFileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => void;

export function mimeAllowlistFilter(allowlist: ReadonlySet<string>): MulterFileFilter {
  return (_req, file, callback) => {
    if (!allowlist.has(file.mimetype)) {
      callback(new BadRequestException(`Type de fichier non autorisé : ${file.mimetype}`), false);
      return;
    }
    callback(null, true);
  };
}
