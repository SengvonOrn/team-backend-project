// import { Injectable } from '@nestjs/common';
// import { PassportStrategy } from '@nestjs/passport';
// import { ExtractJwt, Strategy } from 'passport-jwt';

// @Injectable()
// export class JwtStrategy extends PassportStrategy(Strategy) {
//   constructor() {
//     super({
//       jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
//       ignoreExpiration: false, // reject expired tokens
//       secretOrKey: 'sengvon1234', // 🔑 must match the one used to sign tokens
//     });
//   }

//   validate(payload: any) {
//     console.log('Inside JWT Stragy Validate');
//     console.log(payload);
//     return payload;
//   }
// }
//---------------------------------------------------------------->
import { Injectable, NotFoundException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { TokenPayload } from '../types/oken-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    const secret = process.env.JWT_SECRET; // get verify id from env file
    if (!secret) throw new Error('JWT_SECRET not defined');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
      passReqToCallback: false,
    });
  }

  async validate(payload: TokenPayload) {
    const user = await this.authService.getUserFromPayload(payload);
    if (!user) throw new NotFoundException('User not found');
    return user; // req.user
  }
}
