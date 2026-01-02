import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

export interface JwtPayload {
  sub: number;
  email: string;
  name: string;
  role: string;
  iat?: number;
  exp?: number;
}
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    // ✅ STEP 1: Get and validate secret BEFORE super()
    const jwtSecret = configService.get<string>('JWT_SECRET');

    if (!jwtSecret) {
      throw new Error(
        'JWT_SECRET environment variable is not defined. Please check your .env file.',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromUrlQueryParameter('token'),
        (request) => {
          if (request?.cookies?.accessToken) {
            this.logger.debug('JWT extracted from cookie');
            return request.cookies.accessToken;
          }
          return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret, 
    });

    this.logger.log('JwtStrategy initialized successfully');
  }

  async validate(payload: JwtPayload) {
    this.logger.log(`JWT validation for user: ${payload.email}`);

    try {
      const user = await this.authService.getUserFromPayload(payload);

      if (!user) {
        this.logger.warn(`User not found: ${payload.email}`);
        throw new UnauthorizedException('User not found');
      }

      return user;
    } catch (error) {
      this.logger.error(`JWT validation failed: ${error.message}`);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
