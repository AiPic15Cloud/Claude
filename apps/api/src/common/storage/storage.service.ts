import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { promises as fs } from 'fs';
import * as path from 'path';
import { nanoid } from 'nanoid';

export interface StoredObject {
  storageKey: string;
  driver: 'local' | 's3';
}

/**
 * Pluggable document storage. Defaults to local disk for zero-config
 * development; switches transparently to any S3-compatible bucket
 * (AWS S3, MinIO, Scaleway, OVH…) when S3_* env vars are set.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: 'local' | 's3';
  private readonly localPath: string;
  private readonly s3?: S3Client;
  private readonly bucket?: string;

  constructor(private readonly config: ConfigService) {
    this.driver = this.config.get<string>('storage.driver') === 's3' ? 's3' : 'local';
    this.localPath = this.config.get<string>('storage.localPath') ?? './uploads';

    if (this.driver === 's3') {
      this.bucket = this.config.get<string>('storage.s3.bucket');
      this.s3 = new S3Client({
        region: this.config.get<string>('storage.s3.region'),
        endpoint: this.config.get<string>('storage.s3.endpoint') || undefined,
        forcePathStyle: this.config.get<boolean>('storage.s3.forcePathStyle'),
        credentials: {
          accessKeyId: this.config.get<string>('storage.s3.accessKeyId') ?? '',
          secretAccessKey: this.config.get<string>('storage.s3.secretAccessKey') ?? '',
        },
      });
    } else {
      fs.mkdir(this.localPath, { recursive: true }).catch((err) =>
        this.logger.error(`Cannot create local upload dir: ${err.message}`),
      );
    }
  }

  /**
   * `file.originalname` is attacker-controlled (raw multipart header, never
   * sanitized by multer) — without this, a name like `../../../../app/dist/main.js`
   * escapes the uploads directory entirely via path.join. Keep only the
   * basename and a safe character set.
   */
  private sanitizeFileName(name: string): string {
    const base = path.basename(name).replace(/[^\w.-]/g, '_');
    return base || 'file';
  }

  /** Resolves a storage key to an on-disk path and refuses to leave `localPath`, even if a malformed key ever reaches here. */
  private resolveLocalPath(storageKey: string): string {
    const root = path.resolve(this.localPath);
    const resolved = path.resolve(root, storageKey);
    if (resolved !== root && !resolved.startsWith(root + path.sep)) {
      throw new Error('Invalid storage key');
    }
    return resolved;
  }

  async save(dealId: string, originalName: string, buffer: Buffer, mimeType: string): Promise<StoredObject> {
    const key = `${dealId}/${nanoid()}-${this.sanitizeFileName(originalName)}`;

    if (this.driver === 's3') {
      await this.s3!.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        }),
      );
      return { storageKey: key, driver: 's3' };
    }

    const fullPath = this.resolveLocalPath(key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);
    return { storageKey: key, driver: 'local' };
  }

  async getUrl(storageKey: string, driver: string): Promise<string> {
    if (driver === 's3' && this.s3) {
      return getSignedUrl(
        this.s3,
        new GetObjectCommand({ Bucket: this.bucket, Key: storageKey }),
        { expiresIn: 900 },
      );
    }
    return `/api/v1/documents/local/${encodeURIComponent(storageKey)}`;
  }

  async readLocal(storageKey: string): Promise<Buffer> {
    return fs.readFile(this.resolveLocalPath(storageKey));
  }

  async delete(storageKey: string, driver: string): Promise<void> {
    if (driver === 's3' && this.s3) {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey }));
      return;
    }
    await fs.rm(this.resolveLocalPath(storageKey), { force: true });
  }
}
