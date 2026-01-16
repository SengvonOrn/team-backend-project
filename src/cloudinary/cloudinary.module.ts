import { Module } from '@nestjs/common';
import { v2 as Cloudinary } from 'cloudinary';
import { CloudinaryService } from './cloudinary.stores.service';

@Module({
  providers: [
    {
      provide: 'CLOUDINARY',
      useFactory: () => {
        Cloudinary.config({
          cloud_name: process.env.CLOUDINARY_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
        });
        return Cloudinary;
      },
    },
    CloudinaryService,
  ],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
