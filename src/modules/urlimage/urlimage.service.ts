import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateUrlimageDto } from './dto/create-urlimage.dto';
import { DatabaseService } from 'src/database/database.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as sharp from 'sharp';
@Injectable()
export class UrlimageService {
  private readonly uploadDir = path.join('/usr/src/app', 'uploads');
  private readonly allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  private readonly maxFileSize = 5 * 1024 * 1024;

  constructor(private readonly databaseService: DatabaseService) {
    this.initializeUploadDir();
  }
  private async initializeUploadDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      console.log('Upload directory initialized:', this.uploadDir);
    } catch (error) {
      console.error('Failed to initialize upload directory:', error);
    }
  }

  //=========================================================
  //  Upload Profile Image (Auto-generate thumbnail)
  //=========================================================

  async uploadProfileImage(file: Express.Multer.File, userId: number) {
    // Validate file exists
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    // Validate file type
    if (!this.allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.allowedMimes.join(', ')}`,
      );
    }
    // Validate file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds ${this.maxFileSize / 1024 / 1024}MB limit`,
      );
    }
    let fileBuffer: Buffer | undefined;
    let existingImage: any;
    try {
      // Read file buffer
      fileBuffer = await fs.readFile(file.path);

      // Generate filenames
      const timestamp = Date.now();
      const profileFileName = `profile-${userId}-${timestamp}.jpg`;
      const thumbnailFileName = `thumbnail-${userId}-${timestamp}.jpg`;

      // Set up directories
      const profileDir = path.join(this.uploadDir, 'profile');
      const thumbnailDir = path.join(this.uploadDir, 'thumbnail');

      // Create directories if they don't exist
      await fs.mkdir(profileDir, { recursive: true });
      await fs.mkdir(thumbnailDir, { recursive: true });

      // Set up file paths
      const profilePath = path.join(profileDir, profileFileName);
      const thumbnailPath = path.join(thumbnailDir, thumbnailFileName);

      // Get existing image before uploading new ones
      existingImage = await this.databaseService.profileImage.findUnique({
        where: { userId },
      });

      // Write profile image
      await fs.writeFile(profilePath, fileBuffer);

      // Create thumbnail from profile image
      await sharp(fileBuffer)
        .resize(200, 200, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      // Delete temporary uploaded file //if not set file temp not deleted
      await fs.unlink(file.path).catch(() => {});

      // Delete old files if updating
      if (existingImage) {
        await this.deleteProfileFile(existingImage.profile);
        await this.deleteThumbnailFile(existingImage.thumbnail);

        // Update existing record
        return this.databaseService.profileImage.update({
          where: { userId },
          data: {
            profile: `/uploads/profile/${profileFileName}`,
            thumbnail: `/uploads/thumbnail/${thumbnailFileName}`,
            updatedAt: new Date(),
          },
        });
      }
      // Create new record
      return this.databaseService.profileImage.create({
        data: {
          userId,
          profile: `/uploads/profile/${profileFileName}`,
          thumbnail: `/uploads/thumbnail/${thumbnailFileName}`,
        },
      });
    } catch (error) {
      // Clean up uploaded files on error
      if (file.path) {
        await fs.unlink(file.path).catch(() => {});
      }

      console.error('Profile image upload error:', error);
      throw new BadRequestException(`Failed to upload image: ${error.message}`);
    }
  }

  //==========================================================
  //
  //==========================================================

  async updateProfileOnly(file: Express.Multer.File, userId: number) {
    // Validate file
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!this.allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.allowedMimes.join(', ')}`,
      );
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds ${this.maxFileSize / 1024 / 1024}MB limit`,
      );
    }

    try {
      // Read file buffer
      const fileBuffer = await fs.readFile(file.path);

      // Get existing image
      const existingImage = await this.databaseService.profileImage.findUnique({
        where: { userId },
      });

      if (!existingImage) {
        throw new BadRequestException('No profile image found for this user');
      }

      // Generate new profile filename (keep thumbnail the same)
      const timestamp = Date.now();
      const profileFileName = `profile-${userId}-${timestamp}.jpg`;

      // Set up directory
      const profileDir = path.join(this.uploadDir, 'profile');
      await fs.mkdir(profileDir, { recursive: true });

      // Set up file path
      const profilePath = path.join(profileDir, profileFileName);

      // Write new profile
      await fs.writeFile(profilePath, fileBuffer);

      // Delete temporary uploaded file
      await fs.unlink(file.path).catch(() => {});

      // Delete old profile only (keep thumbnail)
      await this.deleteProfileFile(existingImage.profile);

      // Update only the profile in database (thumbnail stays same)
      return this.databaseService.profileImage.update({
        where: { userId },
        data: {
          profile: `/uploads/profile/${profileFileName}`,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      // Clean up on error
      if (file.path) {
        await fs.unlink(file.path).catch(() => {});
      }

      console.error('Profile update error:', error);
      throw new BadRequestException(
        `Failed to update profile: ${error.message}`,
      );
    }
  }

  //=========================================================

  // Update for thumbnail only

  //=======================================================

  async updateThumbnailOnly(file: Express.Multer.File, userId: number) {
    if (!file) {
      throw new BadRequestException('No file provider ');
    }
    if (!this.allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.allowedMimes.join(', ')}`,
      );
    }
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds ${this.maxFileSize / 1024 / 1024}MB limit`,
      );
    }
    try {
      // Read file buffer
      const fileBuffer = await fs.readFile(file.path);

      // Get existing image
      const existingImage = await this.databaseService.profileImage.findUnique({
        where: { userId },
      });

      if (!existingImage) {
        throw new BadRequestException('No profile image found for this user');
      }

      // Generate new thumbnail filename (keep profile the same)
      const timestamp = Date.now();
      const thumbnailFileName = `thumbnail-${userId}-${timestamp}.jpg`;

      // Set up directory
      const thumbnailDir = path.join(this.uploadDir, 'thumbnail');
      await fs.mkdir(thumbnailDir, { recursive: true });

      // Set up file path
      const thumbnailPath = path.join(thumbnailDir, thumbnailFileName);

      // Write new thumbnail
      await fs.writeFile(thumbnailPath, fileBuffer);

      // Delete temporary uploaded file
      await fs.unlink(file.path).catch(() => {});

      // Delete old thumbnail only (keep profile)
      await this.deleteThumbnailFile(existingImage.thumbnail);

      // Update only the thumbnail in database (profile stays same)
      return this.databaseService.profileImage.update({
        where: { userId },
        data: {
          thumbnail: `/uploads/thumbnail/${thumbnailFileName}`,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      // Clean up on error
      if (file.path) {
        await fs.unlink(file.path).catch(() => {});
      }
      console.error('Thumbnail update error:', error);
      throw new BadRequestException(
        `Failed to update thumbnail: ${error.message}`,
      );
    }
  }

  //========================================================

  //=========================================================
  //  Upload Separate Profile and Thumbnail Images
  //=========================================================

  async uploadProfileAndThumbnail(
    files: {
      profile?: Express.Multer.File[];
      thumbnail?: Express.Multer.File[];
    },
    userId: number,
  ) {
    const profileFile = files.profile?.[0];
    const thumbnailFile = files.thumbnail?.[0];

    if (!profileFile || !thumbnailFile) {
      throw new BadRequestException(
        'Both profile image and thumbnail image are required',
      );
    }

    // Validate both files
    this.validateFile(profileFile);
    this.validateFile(thumbnailFile);

    let profileBuffer: Buffer | undefined;
    let thumbnailBuffer: Buffer | undefined;
    let existingImage: any;

    try {
      // Read file buffers
      profileBuffer = await fs.readFile(profileFile.path);
      thumbnailBuffer = await fs.readFile(thumbnailFile.path);

      // Generate filenames
      const timestamp = Date.now();
      const profileFileName = `profile-${userId}-${timestamp}.jpg`;
      const thumbnailFileName = `thumbnail-${userId}-${timestamp}.jpg`;

      // Set up directories
      const profileDir = path.join(this.uploadDir, 'profile');
      const thumbnailDir = path.join(this.uploadDir, 'thumbnail');

      await fs.mkdir(profileDir, { recursive: true });
      await fs.mkdir(thumbnailDir, { recursive: true });

      // Set up file paths
      const profilePath = path.join(profileDir, profileFileName);
      const thumbnailPath = path.join(thumbnailDir, thumbnailFileName);

      // Get existing image before uploading
      existingImage = await this.databaseService.profileImage.findUnique({
        where: { userId },
      });

      // Write both images
      await fs.writeFile(profilePath, profileBuffer);
      await fs.writeFile(thumbnailPath, thumbnailBuffer);

      // Delete temporary uploaded files
      await fs.unlink(profileFile.path).catch(() => {});
      await fs.unlink(thumbnailFile.path).catch(() => {});

      // Delete old files if updating
      if (existingImage) {
        await this.deleteProfileFile(existingImage.profile);
        await this.deleteThumbnailFile(existingImage.thumbnail);

        return this.databaseService.profileImage.update({
          where: { userId },
          data: {
            profile: `/uploads/profile/${profileFileName}`,
            thumbnail: `/uploads/thumbnail/${thumbnailFileName}`,
            updatedAt: new Date(),
          },
        });
      }

      // Create new record
      return this.databaseService.profileImage.create({
        data: {
          userId,
          profile: `/uploads/profile/${profileFileName}`,
          thumbnail: `/uploads/thumbnail/${thumbnailFileName}`,
        },
      });
    } catch (error) {
      // Cleanup on error
      if (profileFile.path) {
        await fs.unlink(profileFile.path).catch(() => {});
      }
      if (thumbnailFile.path) {
        await fs.unlink(thumbnailFile.path).catch(() => {});
      }

      console.error('Separate upload error:', error);
      throw new BadRequestException(
        `Failed to upload images: ${error.message}`,
      );
    }
  }

  //=========================================================
  //  Validate File
  //=========================================================

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!this.allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.allowedMimes.join(', ')}`,
      );
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds ${this.maxFileSize / 1024 / 1024}MB limit`,
      );
    }
  }

  //=========================================================
  //  Delete Profile File
  //=========================================================

  private async deleteProfileFile(
    profileUrl: string | null | undefined,
  ): Promise<void> {
    try {
      if (!profileUrl) {
        console.log('No profile URL provided');
        return;
      }

      const profileFilename = profileUrl.split('/').pop();

      if (!profileFilename) {
        console.log('No profile filename extracted');
        return;
      }

      const profilePath = path.join(this.uploadDir, 'profile', profileFilename);

      try {
        await fs.unlink(profilePath);
        console.log('✓ Deleted profile image:', profilePath);
      } catch (err: any) {
        console.warn(
          `⚠ Profile not found or already deleted: ${profilePath}`,
          err.message,
        );
      }
    } catch (error) {
      console.error('Error deleting profile file:', error);
    }
  }

  //=========================================================
  //  Delete Thumbnail File
  //=========================================================

  private async deleteThumbnailFile(
    thumbnailUrl: string | null | undefined,
  ): Promise<void> {
    try {
      if (!thumbnailUrl) {
        console.log('No thumbnail URL provided');
        return;
      }

      const thumbnailFilename = thumbnailUrl.split('/').pop();

      if (!thumbnailFilename) {
        console.log('No thumbnail filename extracted');
        return;
      }

      const thumbnailPath = path.join(
        this.uploadDir,
        'thumbnail',
        thumbnailFilename,
      );

      try {
        await fs.unlink(thumbnailPath);
        console.log('✓ Deleted thumbnail:', thumbnailPath);
      } catch (err: any) {
        console.warn(
          `⚠ Thumbnail not found or already deleted: ${thumbnailPath}`,
          err.message,
        );
      }
    } catch (error) {
      console.error('Error deleting thumbnail file:', error);
    }
  }

  //=========================================================
  //  Get Profile Image
  //=========================================================

  async getProfileImage(userId: number) {
    const profileImage = await this.databaseService.profileImage.findUnique({
      where: { userId },
    });

    if (!profileImage) {
      throw new BadRequestException('No profile image found for this user');
    }

    return profileImage;
  }

  //=========================================================
  //  Delete Profile Image
  //=========================================================

  async deleteProfileImage(userId: number) {
    try {
      const profileImage = await this.databaseService.profileImage.findUnique({
        where: { userId },
      });

      if (!profileImage) {
        throw new BadRequestException('No profile image found for this user');
      }

      // Delete files from disk separately
      await this.deleteProfileFile(profileImage.profile);
      await this.deleteThumbnailFile(profileImage.thumbnail);

      // Delete database record
      return this.databaseService.profileImage.delete({
        where: { userId },
      });
    } catch (error) {
      console.error('Error deleting profile image:', error);
      throw new BadRequestException(
        `Failed to delete profile image: ${error.message}`,
      );
    }
  }
}
