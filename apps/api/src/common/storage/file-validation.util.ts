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

/**
 * `file.mimetype` is whatever Content-Type the uploading client declared on
 * the multipart part — Multer never inspects the actual bytes. Nothing stops
 * a client from labelling an HTML/script payload "image/png" to sail through
 * this allowlist; the check below is only a first, cheap filter. The real
 * gate is assertFileContentMatchesMime, run once the body is fully buffered.
 */
export function mimeAllowlistFilter(allowlist: ReadonlySet<string>): MulterFileFilter {
  return (_req, file, callback) => {
    if (!allowlist.has(file.mimetype)) {
      callback(new BadRequestException(`Type de fichier non autorisé : ${file.mimetype}`), false);
      return;
    }
    callback(null, true);
  };
}

function startsWith(buffer: Buffer, bytes: number[], offset = 0): boolean {
  if (buffer.length < offset + bytes.length) return false;
  return bytes.every((byte, i) => buffer[offset + i] === byte);
}

const OLE2_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]; // legacy .doc/.xls/.ppt
const ZIP_SIGNATURES = [
  [0x50, 0x4b, 0x03, 0x04],
  [0x50, 0x4b, 0x05, 0x06],
  [0x50, 0x4b, 0x07, 0x08],
]; // .docx/.xlsx/.pptx are all zip containers

/** Magic-byte signature check per MIME type — undefined means "not verifiable, trust the allowlist". */
const SIGNATURE_CHECKS: Record<string, (buf: Buffer) => boolean> = {
  'application/pdf': (buf) => startsWith(buf, [0x25, 0x50, 0x44, 0x46, 0x2d]), // %PDF-
  'application/msword': (buf) => startsWith(buf, OLE2_SIGNATURE),
  'application/vnd.ms-excel': (buf) => startsWith(buf, OLE2_SIGNATURE),
  'application/vnd.ms-powerpoint': (buf) => startsWith(buf, OLE2_SIGNATURE),
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': (buf) =>
    ZIP_SIGNATURES.some((sig) => startsWith(buf, sig)),
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': (buf) =>
    ZIP_SIGNATURES.some((sig) => startsWith(buf, sig)),
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': (buf) =>
    ZIP_SIGNATURES.some((sig) => startsWith(buf, sig)),
  'image/jpeg': (buf) => startsWith(buf, [0xff, 0xd8, 0xff]),
  'image/png': (buf) => startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  'image/gif': (buf) => startsWith(buf, [0x47, 0x49, 0x46, 0x38]), // "GIF8"
  'image/webp': (buf) => startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8), // RIFF....WEBP
};

// A markup/script payload masquerading as text/plain or text/csv — the one
// pattern worth rejecting even for MIME types with no fixed magic number.
const HTML_LIKE_PREFIX = /^\s*(<!doctype\s+html|<html[\s>]|<script[\s>])/i;

/**
 * Verifies the uploaded bytes actually match the declared (and
 * allowlist-checked) MIME type, closing the gap where a client simply lies
 * about Content-Type to get a renderable payload (e.g. HTML) past
 * mimeAllowlistFilter under a safe-looking label (e.g. "image/png").
 */
export function assertFileContentMatchesMime(buffer: Buffer, mimetype: string): void {
  const check = SIGNATURE_CHECKS[mimetype];
  if (check) {
    if (!check(buffer)) {
      throw new BadRequestException(`Le contenu du fichier ne correspond pas au type déclaré (${mimetype})`);
    }
    return;
  }
  if ((mimetype === 'text/plain' || mimetype === 'text/csv') && HTML_LIKE_PREFIX.test(buffer.subarray(0, 200).toString('utf8'))) {
    throw new BadRequestException('Le contenu du fichier ressemble à du HTML — refusé');
  }
}
