// import { Strategy } from 'passport-local';
// import { PassportStrategy } from '@nestjs/passport';
// import { Injectable, UnauthorizedException } from '@nestjs/common';
// import { AuthService } from '../auth.service';
// @Injectable()
// export class LocalStrategy extends PassportStrategy(Strategy) {
//   constructor(private readonly authService: AuthService) {
//     // by default passport-local expects 'username' and 'password'
//     // we tell it to use 'email' instead:
//     super({ usernameField: 'email' });
//   }

//   async validate(email: string, password: string) {
//     const user = await this.authService.validateUser(email, password);
//     if (!user) {
//       throw new UnauthorizedException('Invalid credentials');
//     }
//     // return will be attached to req.user
//     return user;
//   }
// }
