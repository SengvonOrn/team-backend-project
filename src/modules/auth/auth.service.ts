import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from 'src/database/database.service';
import { Prisma, Role } from '@prisma/client';
import { LoginDto } from './dto/login.dto';
import { UserService } from '../users/users.service';
import { StorageService } from 'src/storage/storage.service';
import { UpdateProfileDto } from './dto/update.dto';
import * as bcrypt from 'bcrypt';
@Injectable()
export class AuthService {
  [x: string]: any;
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly jwtService: JwtService,
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private storageService: StorageService,
  ) {}

  // ===================================
  // REGISTRATION
  // ===================================

  async register(dto: Prisma.UserCreateInput) {
    return this.userService.register(dto);
  }

  // ===================================
  // LOGIN - FOR EMAIL/PASSWORD AUTH
  // ===================================

  async login(dto: LoginDto) {
    return this.userService.login(dto);
  }

  // ===================================
  // GOOGLE OAUTH - VALIDATE USER
  // ===================================

  async validateGoogleUser(details: {
    email: string;
    name: string;
    password: string;
  }) {
    return this.userService.validateGoogleUser(details);
  }

  // ===================================
  // GOOGLE CALLBACK
  // ===================================

  async googleCallback(googleData: any) {
    return this.userService.googleCallback(googleData);
  }

  // ===================================
  // JWT PAYLOAD VALIDATION
  // ===================================

  async getUserFromPayload(payload: {
    sub: number;
    email: string;
    name: string;
  }) {
    return this.userService.validateUserFromPayload(payload);
  }
  // ===================================
  // UPDATED PROFILE MANAGEMENT
  // ===================================

  async updateProfile(
    userId: number,
    dto: UpdateProfileDto,
    profile?: Express.Multer.File,
    thumbnail?: Express.Multer.File,
  ) {
    const existingUser = await this.databaseService.user.findUnique({
      where: { id: userId },
      include: { profileImage: true },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // ================= UPLOAD / REPLACE IMAGES =================

    let profileUrl: string | null = null;
    let thumbnailUrl: string | null = null;

    // const oldProfile = existingUser.profileImage?.profile ?? undefined;
    // const oldThumbnail = existingUser.profileImage?.thumbnail ?? undefined;

    // ========================================================
    // Only upload profile image if provided
    //=========================================================
    // For update Remove old profile image
    const getFilenameFromUrl = (url?: string): string | undefined => {
      return url?.split('/').pop();
    };
    const oldProfile = getFilenameFromUrl(
      existingUser.profileImage?.profile ?? undefined,
    );
    const oldThumbnail = getFilenameFromUrl(
      existingUser.profileImage?.thumbnail ?? undefined,
    );
    //=================================================
    if (profile) {
      const uploaded = await this.storageService.updateProfileImage(
        profile,
        oldProfile,
      );
      profileUrl = uploaded.fullUrl;
    }
    if (thumbnail) {
      const uploaded = await this.storageService.updateThumbnailImage(
        thumbnail,
        oldThumbnail,
      );
      thumbnailUrl = uploaded.thumbnailUrl;
    }
    //======================================================
    // Update only the images that were provided
    //======================================================
    return this.databaseService.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.username && { username: dto.username }),
          ...(dto.email && { email: dto.email }),
          ...(dto.status && { status: dto.status }),
        },
      });
      if (profileUrl || thumbnailUrl) {
        const updateData: { profile?: string; thumbnail?: string } = {};
        if (profileUrl) {
          updateData.profile = profileUrl;
        }
        if (thumbnailUrl) {
          updateData.thumbnail = thumbnailUrl;
        }
        if (existingUser.profileImage) {
          await tx.profileImage.update({
            where: { userId },
            data: updateData,
          });
        } else {
          await tx.profileImage.create({
            data: {
              userId,
              profile: profileUrl || null,
              thumbnail: thumbnailUrl || null,
            },
          });
        }
      }

      if (dto.locations?.length) {
        for (const loc of dto.locations) {
          const { id, ...data } = loc;

          if (id) {
            await tx.userLocation.update({
              where: { id },
              data,
            });
          } else {
            await tx.userLocation.create({
              data: { ...data, userId },
            });
          }
        }

        const defaultLoc = dto.locations.find((l) => l.isDefault);
        if (defaultLoc?.id) {
          await tx.userLocation.updateMany({
            where: { userId, id: { not: defaultLoc.id } },
            data: { isDefault: false },
          });
        }
      }
      return tx.user.findUnique({
        where: { id: userId },
        include: {
          profileImage: true,
          locations: { orderBy: { isDefault: 'desc' } },
          customers: true,
          cartItems: true,
          comments: true,
        },
      });
    });
  }

  // ===================================
  // USER LISTING & RETRIEVAL
  // ===================================

  async findAll(role?: Role) {
    this.logger.log(`Finding all users${role ? ` with role: ${role}` : ''}`);

    try {
      if (role) {
        return await this.databaseService.user.findMany({
          where: { role },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      }

      return await this.databaseService.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      this.logger.error(`Find all users error: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: number) {
    this.logger.log(`Finding user by ID: ${id}`);
    try {
      if (!id || isNaN(id)) {
        throw new NotFoundException('Invalid user ID');
      }

      const user = await this.databaseService.user.findUnique({
        where: { id: Number(id) },
        select: {
          id: true,
          email: true,
          name: true,
          password: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        this.logger.warn(`User not found with ID: ${id}`);
        throw new NotFoundException(`User with id ${id} not found`);
      }

      return user;
    } catch (error) {
      this.logger.error(`Find one user error: ${error.message}`);
      throw error;
    }
  }

  // ===================================
  // USER UPDATE
  // ===================================

  async update(id: number, updateUserDto: Prisma.UserUpdateInput) {
    this.logger.log(`Updating user ID: ${id}`);

    try {
      const user = await this.databaseService.user.update({
        where: { id },
        data: updateUserDto,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      this.logger.log(`User updated successfully: ${user.email}`);
      return user;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        this.logger.warn(`User not found for update: ${id}`);
        throw new NotFoundException(`User with id ${id} not found`);
      }

      this.logger.error(`Update user error: ${error.message}`);
      throw error;
    }
  }

  // ===================================
  // USER DELETION
  // ===================================

  async remove(id: number) {
    this.logger.log(`Deleting user ID: ${id}`);

    try {
      const deletedUser = await this.databaseService.user.delete({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      this.logger.log(`User deleted successfully: ${deletedUser.email}`);
      return deletedUser;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        this.logger.warn(`User not found for deletion: ${id}`);
        throw new NotFoundException(`User with id ${id} not found`);
      }

      this.logger.error(`Delete user error: ${error.message}`);
      throw error;
    }
  }
}
