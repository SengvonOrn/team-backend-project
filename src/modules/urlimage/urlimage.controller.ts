import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UrlimageService } from './urlimage.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/get-user.decorator';

@Controller('urlimage')
@UseGuards(JwtAuthGuard)
export class UrlimageController {
  constructor(private readonly urlimageService: UrlimageService) {}

  //=========================================================
  //  Upload Profile Image (Auto-generate Thumbnail)
  //  POST http://localhost:3000/api/urlimage/profile
  //=========================================================

  @Post('profile')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    console.log('Upload profile request received');
    console.log('File:', file);
    console.log('User:', user);
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (!user || !user.id) {
      throw new BadRequestException('User not authenticated');
    }
    return this.urlimageService.uploadProfileImage(file, user.id);
  }

  //=========================================================
  //  Update Profile Only (Keep Thumbnail)
  //  POST http://localhost:3000/api/urlimage/update-profile
  //  Body: form-data with field "file"
  //=========================================================

  @Post('update-profile')
  @UseInterceptors(FileInterceptor('file'))
  async updateProfile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    console.log('Update profile request received');
    console.log('File:', file);
    console.log('User:', user);

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!user || !user.id) {
      throw new BadRequestException('User not authenticated');
    }
    return this.urlimageService.updateProfileOnly(file, user.id);
  }

  //=========================================================
  //  Update Thumbnail Only (Keep Profile)
  //  POST http://localhost:3000/api/urlimage/update-thumbnail
  //  Body: form-data with field "thumbnail"
  //=========================================================
  @Post('update-thumbnail')
  @UseInterceptors(FileInterceptor('thumbnail'))
  async updateThumbnail(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    console.log('Update thumbnail request received');
    console.log('File:', file);
    console.log('User:', user);

    if (!file) {
      throw new BadRequestException('No thumbnail file uploaded');
    }

    if (!user || !user.id) {
      throw new BadRequestException('User not authenticated');
    }

    return this.urlimageService.updateThumbnailOnly(file, user.id);
  }

  //=========================================================
  //  Upload Separate Profile and Thumbnail
  //  POST http://localhost:3000/urlimage/separate
  //=========================================================

  //=========================================================
  //  Upload Separate with Named Fields
  //  POST http://localhost:3000/api/urlimage/upload-both
  // files : File
  // files : File

  //=========================================================
  @Post('upload-both')
  @UseInterceptors(FilesInterceptor('files', 2))
  async uploadBoth(
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: any,
  ) {
    console.log('Upload both request received');
    console.log('Files:', files);
    console.log('User:', user);

    if (!files || files.length < 2) {
      throw new BadRequestException(
        'Both profile and thumbnail files are required',
      );
    }

    if (!user || !user.id) {
      throw new BadRequestException('User not authenticated');
    }

    // Get profile and thumbnail from the files array
    const profileFile = files[0];
    const thumbnailFile = files[1];

    if (!profileFile || !thumbnailFile) {
      throw new BadRequestException('Profile and thumbnail files are required');
    }

    return this.urlimageService.uploadProfileAndThumbnail(
      {
        profile: [profileFile],
        thumbnail: [thumbnailFile],
      },
      user.id,
    );
  }

  //=========================================================
  //  Get Profile Image
  //  GET http://localhost:3000/api/urlimage/profile/:userId
  //=========================================================
  @Get('profile/:userId')
  async getProfileImage(@Param('userId') userId: string) {
    console.log('Get profile image for user:', userId);
    return this.urlimageService.getProfileImage(parseInt(userId, 10));
  }

  //=========================================================
  //  Delete Profile Image
  //  DELETE http://localhost:3000/urlimage/profile/:userId
  //=========================================================
  @Delete('profile/:userId')
  async deleteProfileImage(@Param('userId') userId: string) {
    console.log('Delete profile image for user:', userId);
    return this.urlimageService.deleteProfileImage(parseInt(userId, 10));
  }
}
