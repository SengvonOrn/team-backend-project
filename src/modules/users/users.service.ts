import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import * as bcrypt from 'bcrypt';
import { Prisma, User } from '@prisma/client';
import { LoginDto } from '../auth/dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UpdatePasswordDto } from '../auth/dto/updatePassword.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  //=====================================================
  //User Register
  //=====================================================
  async register(dto: Prisma.UserCreateInput) {
    // -------check user dublications----------
    try {
      const user = await this.db.user.findUnique({
        where: {
          email: dto.email,
        },
      });
      if (user) throw new ConflictException('email duplications');

      const hashed = await bcrypt.hash(dto.password || '', 10);

      const newUser = await this.db.user.create({
        data: {
          email: dto.email,
          password: hashed,
          name: dto.name ?? 'Anonymous',
          role: 'USER',
          status: 'ACTIVE',
        },
      });
      const { password, ...result } = newUser;
      return result;
    } catch (error) {
      // ✅ CORRECT
      throw error;
    }
  }

  //======================================================
  // LOGIN - FOR EMAIL/PASSWORD AUTH
  //======================================================
  async login(dto: LoginDto) {
    try {
      const user = await this.db.user.findUnique({
        where: { email: dto.email },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid User email');
      }

      const passwordMatch =
        user.password && (await bcrypt.compare(dto.password, user.password));
      if (!passwordMatch)
        throw new UnauthorizedException('Invalid email or passwd');
      this.logger.log(`Login successful: ${dto.email}`);
      return await this.generateAuthResponse(user);
    } catch (error) {
      // ✅ CORRECT
      throw error;
    }
  }

  //=====================================================
  //  Update password
  //=====================================================
  async updatePasword(userId: number, dto: UpdatePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Password Not Match');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password');
    }
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, email: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Verify current password
    if (!user.password) {
      throw new BadRequestException('User password not set');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    // Update in database
    const updatedUser = await this.db.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
      select: {
        id: true,
        email: true,
        name: true,
        updatedAt: true,
      },
    });

    return {
      message: 'Password updated successfully',
      user: updatedUser,
    };
  }

  //======================================================
  // GOOGLE OAUTH - VALIDATE USER
  //======================================================

  //======================================================
  //   Google User Validation
  //======================================================
  async validateGoogleUser(details: {
    email: string;
    name: string;
    password: string;
  }) {
    try {
      let users = await this.db.user.findUnique({
        where: { email: details.email },
      });
      if (users) {
        this.logger.log('User found, proceeding to login.');
        return users;
      }
      const hashedPassword = await bcrypt.hash(details.password, 10);
      users = await this.db.user.create({
        data: {
          email: details.email,
          name: details.name || 'Anonymous',
          password: hashedPassword,
          role: 'USER',
          status: 'ACTIVE',
        },
      });
      return users;
    } catch (error) {
      // ✅ CORRECT
      throw error;
    }
  }

  //=====================================================
  // Google callback login register
  //=====================================================
  async googleCallback(userGoogleData: any) {
    let user = await this.db.user.findUnique({
      where: { email: userGoogleData.email },
    });
    if (!user) {
      user = await this.db.user.create({
        data: {
          email: userGoogleData.email,
          name: userGoogleData.name || 'Anonymous',
          password: '',
          role: 'USER',
          status: 'ACTIVE',
        },
      });
    } else if (!user.image && userGoogleData.image) {
      user = await this.db.user.update({
        where: { email: user.email },
        data: { image: userGoogleData.image },
      });
    }
    return {
      user,
      backendTokens: {
        accessToken: this.generateAccessToken(user),
        refreshToken: this.generateRefreshToken(user),
      },
    };
  }

  //======================================================
  //  apply generate token for user access and refresh
  //======================================================

  generateTokens(user: User) {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }

  //====================================================
  // Refresh User Token
  //====================================================

  // ✅ CORRECT - For refresh token with different secret
  private generateRefreshToken(user: User): string {
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }
    return this.jwtService.sign(
      { sub: user.id },
      {
        secret: refreshSecret,
        expiresIn: '7d',
      },
    );
  }

  //==================================================
  //  generateAccess Token Id
  //=================================================
  private generateAccessToken(user: User): string {
    const secret = this.configService.get('JWT_SECRET');
    return this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      { secret, expiresIn: this.configService.get('JWT_EXPIRES_IN') || '15m' },
    );
  }

  //================================================
  //  make for refresh change user Token
  //================================================
  async refreshToken(user: any) {
    try {
      const token = await this.generateTokens(user);
      return token;
    } catch (error) {
      this.logger.error(`Token generation failed: ${error.message}`);
      throw error;
    }
  }

  //==============================================
  // make for response user after token provide
  //=============================================

  private async generateAuthResponse(user: any) {
    const tokens = await this.generateTokens(user);
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      backendTokens: tokens,
    };
  }

  //============================================
  //JWT  payload validation
  //============================================

  async validateUserFromPayload(payload: {
    sub: number;
    email: string;
    name: string;
  }) {
    try {
      const user = await this.db.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) throw new UnauthorizedException('Invalid token payload');
      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid token payload error', {
        cause: error,
      });
    }
    // ====================================
    //  USER PROFILE VALIDATION
    //=====================================
  }
  async getProfile(userId: number) {
    try {
      const user = await this.db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          password: true,
          status: true,
          image: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          profileImage: true,
          customers: true,
          comments: true,
          cartItems: true,
          locations: true,
          store: true,
        },
      });
      if (!user) throw new UnauthorizedException('User not found');
      return user;
    } catch (error) {
      throw new UnauthorizedException('Error fetching user profile', {
        cause: error,
      });
    }
  }
  // ===================================
  //    UPDATE USER PROFILE
  // ===================================

  // ✅ CORRECTED VERSION
  async getFullProfile(userId: number) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: {
        profileImage: true,
        locations: {
          orderBy: { isDefault: 'desc' },
        },
        customers: {
          include: {
            orders: {
              take: 5,
              orderBy: { createdAt: 'desc' },
              include: {
                orderItems: true,
                payments: true,
                shipment: true,
              },
            },
          },
        },
        cartItems: {
          include: {
            productVariant: {
              include: { product: true },
            },
          },
        },
        comments: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { product: true },
        },
        store: {
          include: { products: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return user;
  }

  /**
   * Get user locations only
   */
  async getUserLocations(userId: number) {
    return this.db.userLocation.findMany({
      where: { userId },
      orderBy: { isDefault: 'desc' },
    });
  }

  /**
   * Get user's default location
   */
  async getDefaultLocation(userId: number) {
    return this.db.userLocation.findFirst({
      where: { userId, isDefault: true },
    });
  }

  /**
   * Set a location as default
   */
  async setDefaultLocation(userId: number, locationId: number) {
    // Verify location belongs to user
    const location = await this.db.userLocation.findUnique({
      where: { id: locationId },
    });

    if (!location || location.userId !== userId) {
      throw new NotFoundException(
        'Location not found or does not belong to user',
      );
    }

    return this.db.$transaction(async (tx) => {
      // Remove default from all other locations
      await tx.userLocation.updateMany({
        where: { userId, id: { not: locationId } },
        data: { isDefault: false },
      });

      // Set this as default
      return tx.userLocation.update({
        where: { id: locationId },
        data: { isDefault: true },
      });
    });
  }

  /**
   * Delete a location
   */
  async deleteLocation(userId: number, locationId: number) {
    const location = await this.db.userLocation.findUnique({
      where: { id: locationId },
    });

    if (!location || location.userId !== userId) {
      throw new NotFoundException(
        'Location not found or does not belong to user',
      );
    }

    return this.db.userLocation.delete({
      where: { id: locationId },
    });
  }
}
