import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as sharp from 'sharp';
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir = path.resolve('uploads');
  private readonly profileDir = path.join(this.uploadDir, 'profiles');

  async onModuleInit() {
    await this.ensureUploadDirs();
  }

  private async ensureUploadDirs() {
    try {
      await fs.mkdir(this.profileDir, { recursive: true });
      this.logger.log(`Upload directories ready: ${this.profileDir}`);
    } catch (error) {
      this.logger.error('Failed to create upload directories', error);
    }
  }

  // ================= UPLOAD =================
  async uploadImage(file: Express.Multer.File) {
    if (!file || !file.buffer) {
      throw new Error('Invalid or empty file');
    }
    if (!this.validateImageFile(file)) {
      throw new Error('Invalid file type or size');
    }

    const timestamp = Date.now();
    const filename = `${timestamp}.webp`;
    const fullPath = path.join(this.profileDir, filename);

    try {
      // Save main image
      await sharp(file.buffer)
        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toFile(fullPath);

      // Thumbnail
      const thumbName = `thumb-${timestamp}.webp`;
      const thumbPath = path.join(this.profileDir, thumbName);

      await sharp(file.buffer)
        .resize(200, 200, { fit: 'cover' })
        .webp({ quality: 80 })
        .toFile(thumbPath);
      return {
        filename,
        thumbnailFilename: thumbName,
        fullUrl: `/uploads/profiles/${filename}`,
        thumbnailUrl: `/uploads/profiles/${thumbName}`,
      };
    } catch (error) {
      this.logger.error('Upload failed', error);
      throw new Error('Image upload failed');
    }
  }

  // ================= UPDATE =================
  // Update only profile image
  async updateProfileImage(file: Express.Multer.File, oldFilename?: string) {
    if (oldFilename) await this.deleteImage(oldFilename);

    if (!file || !file.buffer) {
      throw new Error('Invalid or empty file');
    }
    if (!this.validateImageFile(file)) {
      throw new Error('Invalid file type or size');
    }

    const timestamp = Date.now();
    const filename = `${timestamp}.webp`;
    const fullPath = path.join(this.profileDir, filename);

    try {
      await sharp(file.buffer)
        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toFile(fullPath);

      return {
        filename,
        fullUrl: `/uploads/profiles/${filename}`,
      };
    } catch (error) {
      this.logger.error('Profile image upload failed', error);
      throw new Error('Profile image upload failed');
    }
  }

  // Update only thumbnail image
  async updateThumbnailImage(file: Express.Multer.File, oldThumbnail?: string) {
    if (oldThumbnail) await this.deleteImage(oldThumbnail);

    if (!file || !file.buffer) {
      throw new Error('Invalid or empty file');
    }
    if (!this.validateImageFile(file)) {
      throw new Error('Invalid file type or size');
    }
    const timestamp = Date.now();
    const thumbName = `thumb-${timestamp}.webp`;
    const thumbPath = path.join(this.profileDir, thumbName);
    try {
      await sharp(file.buffer)
        .resize(200, 200, { fit: 'cover' })
        .webp({ quality: 80 })
        .toFile(thumbPath);

      return {
        thumbnailFilename: thumbName,
        thumbnailUrl: `/uploads/profiles/${thumbName}`,
      };
    } catch (error) {
      this.logger.error('Thumbnail upload failed', error);
      throw new Error('Thumbnail upload failed');
    }
  }

  // ================= DELETE =================
  async deleteImage(filename: string) {
    if (!filename) return;
    const filePath = path.join(this.profileDir, filename);

    try {
      await fs.unlink(filePath);
      this.logger.log(`Deleted: ${filename}`);
    } catch {
      this.logger.warn(`File not found: ${filename}`);
    }
  }

  // ================= VALIDATION =================
  validateImageFile(file: Express.Multer.File): boolean {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 5 * 1024 * 1024;

    return allowed.includes(file.mimetype) && file.size <= maxSize;
  }

  getProfileDir() {
    return this.profileDir;
  }
}
