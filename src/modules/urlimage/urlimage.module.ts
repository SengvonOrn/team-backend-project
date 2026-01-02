import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MulterModule } from '@nestjs/platform-express';
import { UrlimageService } from './urlimage.service';
import { UrlimageController } from './urlimage.controller';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from 'src/database/database.module';
import { StorageModule } from 'src/storage/storage.module';
import { join } from 'path';
@Module({
  imports: [
    MulterModule.register({
      dest: join(process.cwd(), 'uploads', 'temp'),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
    PassportModule.register({
      defaultStrategy: 'jwt',
      session: false,
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
    DatabaseModule,
    StorageModule,
  ],
  controllers: [UrlimageController],
  providers: [UrlimageService],
  exports: [UrlimageService],
})
export class UrlimageModule {}
