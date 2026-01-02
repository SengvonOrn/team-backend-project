import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  Param,
  Patch,
  Delete,
  Ip,
  Query,
  Res,
  Logger,
  Put,
  UseInterceptors,
  BadRequestException,
  UploadedFile,
  ParseIntPipe,
  UnauthorizedException,
  UploadedFiles,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Prisma, Role } from '@prisma/client';
import { UserService } from '../users/users.service';
import { RefreshJwtGuard } from 'src/common/guards/jwt-refresh.guard';
import { AuthGuard } from '@nestjs/passport';
import { GoogleAuthGuard } from 'src/common/guards/google.guard';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { StorageService } from 'src/storage/storage.service';
import { UpdateLocationDto, UpdateProfileDto } from './dto/update.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { UpdatePasswordDto } from './dto/updatePassword.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(
    private readonly authService: AuthService,
    private userService: UserService,
    private readonly configService: ConfigService,
  ) {}
  // ===================================
  // REGISTRATION
  // ===================================
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // ===================================
  // LOGIN
  // ===================================
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
    // return this.userService.login(dto);
  }

  // ===================================
  // GOOGLE OAUTH - FOR PASSPORT FLOW
  // ===================================
  @Get('google/login')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    return { msg: 'Google Authentication' };
  }
  //===============================================================
  // ✅ This endpoint is called by Google after user authenticates
  //===============================================================
  @Get('google/redirect')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    if (!req.user) {
      this.logger.error('No user in request');
      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      return res.redirect(`${frontendUrl}/userlogin/error`);
    }

    try {
      const user = await this.authService.getUserFromPayload({
        sub: (req.user as any).id,
        email: (req.user as any).email,
        name: (req.user as any).name,
      });

      this.logger.log(`User retrieved: ${user.email} (${user.name})`);

      // Generate tokens for this user
      const tokens = await this.userService.refreshToken(user);

      this.logger.log('Tokens generated, setting cookies');

      // Set access token cookie
      res.cookie('accessToken', tokens.accessToken, {
        httpOnly: true,
        secure: this.configService.get<string>('NODE_ENV') === 'production',
        sameSite: 'lax',
        maxAge: 20 * 1000,
      });

      // Set refresh token cookie
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: this.configService.get<string>('NODE_ENV') === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      this.logger.log('Cookies set, redirecting to frontend');
      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      // Redirect to frontend callback page (NextAuth will handle it)
      return res.redirect(
        `${frontendUrl}/auth/callback?token=${tokens.accessToken}`,
      );
    } catch (err) {
      this.logger.error('Google redirect error:', err.message);
      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      return res.redirect(`${frontendUrl}/login?error=redirect_failed`);
    }
  }

  // ===================================
  // GOOGLE OAUTH - FOR NEXTAUTH FRONTEND
  // ===================================

  @Post('google/callback')
  async googleCallback(
    @Body()
    body: {
      email: string;
      name: string;
      image?: string;
      password: string;
    },
  ) {
    this.logger.log(`Google callback from NextAuth: ${body.email}`);
    return await this.authService.googleCallback(body);
  }

  // ===================================
  // PROFILE
  // http://localhost:3000/api/auth/profile
  // use format data
  // {
  // name :
  // username:
  // email:
  // }
  // Authorization: Bearer <access_token>
  // ===================================

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Req() req: Request) {
    const userId = (req.user as any).id;
    return await this.userService.getProfile(userId);
  }

  //===================================
  // UPDATE PROFILE
  // http://localhost:3000/api/auth/profile
  // Authorization: Bearer <access_token>
  // //================================

  @Put('profile')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'profile' }, { name: 'thumbnail' }]),
  )
  async updateProfile(
    @Req() req: Express.Request,
    @Body() dto: UpdateProfileDto,
    @UploadedFiles()
    files: {
      profile?: Express.Multer.File[];
      thumbnail?: Express.Multer.File[];
    },
  ) {
    const user = (req as any).user;

    if (!user || !user.id) {
      throw new UnauthorizedException('User not found in request');
    }

    if (dto.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(dto.email)) {
        throw new BadRequestException('Invalid email format');
      }
    }
    return this.authService.updateProfile(
      user.id,
      dto,
      files?.profile?.[0], // avatar
      files?.thumbnail?.[0], // cover
    );
  }

  //======================================================
  // Update Password
  //======================================================

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updatePassword(@Req() req: Request, @Body() dto: UpdatePasswordDto) {
    const userId = (req.user as any).id;
    return this.userService.updatePasword(userId, dto);
  }

  /**
   * Get current user's full profile
   * GET /auth/me
   */

  // http://localhost:3000/api/auth/me
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getMyProfile(@Req() req: Express.Request) {
    const user = (req as any).user;
    if (!user || !user.id) {
      throw new UnauthorizedException('User not found');
    }

    return this.userService.getFullProfile(user.id);
  }

  // http://localhost:3000/api/auth/6/locations
  @Get(':userId/locations')
  async getUserLocations(@Param('userId', ParseIntPipe) userId: number) {
    return this.userService.getUserLocations(userId);
  }

  /**
   * Get user's default location
   * GET /users/:userId/location/default
   */

  // http://localhost:3000/api/auth/6/location/default
  @Get(':userId/location/default')
  async getDefaultLocation(@Param('userId', ParseIntPipe) userId: number) {
    return this.userService.getDefaultLocation(userId);
  }

  /**
   * Set location as default
   * PATCH /users/:userId/location/:locationId/set-default
   */
  // http://localhost:3000/api/auth/6/location/1/set-default
  @Patch(':userId/location/:locationId/set-default')
  @UseGuards(AuthGuard('jwt'))
  async setDefaultLocation(
    @Req() req: Express.Request,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('locationId', ParseIntPipe) locationId: number,
  ) {
    const user = (req as any).user;

    if (user?.id !== userId) {
      throw new UnauthorizedException('Can only update your own profile');
    }
    return this.userService.setDefaultLocation(userId, locationId);
  }

  /**
   * Delete a location
   * DELETE /users/:userId/location/:locationId
   */
  // http://localhost:3000/api/auth/profile
  @Delete(':userId/location/:locationId')
  @UseGuards(AuthGuard('jwt'))
  async deleteLocation(
    @Req() req: Express.Request,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('locationId', ParseIntPipe) locationId: number,
  ) {
    const user = (req as any).user;
    if (user?.id !== userId) {
      throw new UnauthorizedException('Can only delete your own locations');
    }
    return this.userService.deleteLocation(userId, locationId);
  }

  //===================================
  // REFRESH TOKEN
  // http://localhost:3000/api/auth/refresh
  // Authorization: Bearer <refresh_token>
  // ===================================
  @Post('refresh')
  // @UseGuards(AuthGuard('jwt-refresh'))
  @UseGuards(RefreshJwtGuard)
  async refreshToken(@Req() req) {
    this.logger.log('Refreshing token for users:', req.user);
    return await this.userService.refreshToken(req.user);
  }

  // ===================================
  // LOGOUT
  // ===================================
  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout(@Res() res: Response) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return res.json({ message: 'Logged out successfully' });
  }

  // ===================================
  // USER MANAGEMENT
  // ===================================

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(@Ip() ip: String, @Query('role') role?: Role) {
    return this.authService.findAll(role);
  }

  // ===================================
  // Get user by ID
  // ===================================

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.authService.findOne(Number(id));
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: Prisma.UserUpdateInput,
  ) {
    return this.authService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.authService.remove(+id);
  }
}
