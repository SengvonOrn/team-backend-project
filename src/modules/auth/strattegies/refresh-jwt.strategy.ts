import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  private readonly logger = new Logger(RefreshJwtStrategy.name);

  constructor(private readonly configService: ConfigService) {
    const jwtSecret = configService.get('JWT_REFRESH_SECRET');
    if (!jwtSecret) {
      throw new Error(
        'JWT_REFRESH_SECRET is not defined in environment variables',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromUrlQueryParameter('token'),
      ]),
      secretOrKey: jwtSecret,
      passReqToCallback: true,
      ignoreExpiration: false,
    });

    this.logger.log('RefreshJwtStrategy initialized successfully');
  }

  validate(req: Request, payload: any) {
    this.logger.log('Validating refresh token for user:', payload);
    const refreshToken = req.get('authorization')?.replace('Bearer', '').trim();
    this.logger.log(
      'Extracted refresh token:',
      refreshToken ? 'Found' : 'Not found',
    );
    return {
      ...payload,
      refreshToken,
    };
  }
}
