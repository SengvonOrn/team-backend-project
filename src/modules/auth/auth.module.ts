import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { DatabaseModule } from 'src/database/database.module';
import { UsersModule } from '../users/users.module';
import { StorageModule } from 'src/storage/storage.module';

import { SessionSerializer } from './serializers/Serializer';
import { RefreshJwtGuard } from 'src/common/guards/jwt-refresh.guard';
import { JwtStrategy } from './strattegies/jwt.strattegy';
import { RefreshJwtStrategy } from './strattegies/refresh-jwt.strategy';
import { GoogleStrategy } from './strattegies/GoogleStrategy';

@Module({
  imports: [
    // ===== Passport & JWT Setup =====
    PassportModule.register({
      defaultStrategy: 'jwt',
      session: false,
    }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '3600s',
        },
      }),
    }),

    // ===== Config & Database =====
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    UsersModule,

    // ===== Storage & File Upload =====
    StorageModule,
    MulterModule.register({
      storage: memoryStorage(), // good for small
      // dest: join(process.cwd(), 'uploads', 'temp'), // good for big
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type'), false);
        }
      },
    }),
  ],

  controllers: [AuthController],

  providers: [
    AuthService,
    JwtStrategy,
    RefreshJwtStrategy,
    RefreshJwtGuard,
    GoogleStrategy,
    SessionSerializer,
  ],

  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
