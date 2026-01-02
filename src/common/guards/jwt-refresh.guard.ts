import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class RefreshJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  // -----acces verify user token jwt refresh--------

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) throw new UnauthorizedException('No token found');
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      console.log('JWT_REFRESH_SECRET:', process.env.JWT_REFRESH_SECRET);
      console.log('Payload:', payload);
      request.user = payload;
    } catch {
      throw new UnauthorizedException();
    }
    return true;

    //--------------------------------------------
  }

  private extractTokenFromHeader(request: Request) {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    // return type === 'Refresh' ? token : undefined; // Original line
    return type === 'Bearer' ? token : undefined; // Adjusted to 'Bearer' for standardization
  }
}
