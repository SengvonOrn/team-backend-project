import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { v2 as Cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor(
    @Inject('CLOUDINARY') private readonly cloudinary: typeof Cloudinary,
  ) {}

  /**
   * Upload a file buffer to Cloudinary
   */
  uploadBuffer(
    file: Express.Multer.File,
    folder: string,
  ): Promise<{ secure_url: string; public_id: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        { folder },
        (error, result) => {
          if (error || !result) {
            return reject(error || new Error('Upload failed'));
          }
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
          });
        },
      );
      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  /**
   * Upload multiple files to Cloudinary
   */
  async uploadMultiple(
    files: Express.Multer.File[],
    folder: string,
  ): Promise<Array<{ secure_url: string; public_id: string }>> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const uploadPromises = files.map((file) =>
      this.uploadBuffer(file, folder),
    );
    return Promise.all(uploadPromises);
  }

  /**
   * Update/Replace an existing image on Cloudinary
   */
  async updateImage(
    publicId: string,
    file: Express.Multer.File,
    folder: string,
  ): Promise<{ secure_url: string; public_id: string }> {
    // Delete the old image
    await this.deleteImage(publicId);

    // Upload the new image
    return this.uploadBuffer(file, folder);
  }

  /**
   * Delete a single image from Cloudinary by public_id
   */
  async deleteImage(publicId: string): Promise<{ result: string }> {
    try {
      const result = await this.cloudinary.uploader.destroy(publicId);
      
      if (result.result !== 'ok' && result.result !== 'not found') {
        throw new Error(`Failed to delete image: ${result.result}`);
      }

      return result;
    } catch (error) {
      throw new BadRequestException(
        `Error deleting image: ${error.message}`,
      );
    }
  }

  /**
   * Delete multiple images from Cloudinary
   */
  async deleteMultiple(publicIds: string[]): Promise<{
    deleted: string[];
    failed: string[];
  }> {
    if (!publicIds || publicIds.length === 0) {
      throw new BadRequestException('No public IDs provided');
    }

    const results = await Promise.allSettled(
      publicIds.map((id) => this.deleteImage(id)),
    );

    const deleted: string[] = [];
    const failed: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        deleted.push(publicIds[index]);
      } else {
        failed.push(publicIds[index]);
      }
    });

    return { deleted, failed };
  }

  /**
   * Delete all images in a specific folder
   */
  async deleteFolder(folder: string): Promise<{ result: string }> {
    try {
      const result = await this.cloudinary.api.delete_resources_by_prefix(
        folder,
      );
      return result;
    } catch (error) {
      throw new BadRequestException(
        `Error deleting folder: ${error.message}`,
      );
    }
  }

  /**
   * Get image details by public_id
   */
  async getImageDetails(publicId: string): Promise<any> {
    try {
      const result = await this.cloudinary.api.resource(publicId);
      return result;
    } catch (error) {
      throw new BadRequestException(
        `Error fetching image details: ${error.message}`,
      );
    }
  }

  /**
   * Get all images from a specific folder
   */
  async getImagesByFolder(folder: string, maxResults = 100): Promise<any> {
    try {
      const result = await this.cloudinary.api.resources({
        type: 'upload',
        prefix: folder,
        max_results: maxResults,
      });
      return result;
    } catch (error) {
      throw new BadRequestException(
        `Error fetching images: ${error.message}`,
      );
    }
  }

  /**
   * Generate a transformation URL for an image
   */
  generateTransformationUrl(
    publicId: string,
    transformations: {
      width?: number;
      height?: number;
      crop?: string;
      quality?: string | number;
      format?: string;
    },
  ): string {
    return this.cloudinary.url(publicId, transformations);
  }
}