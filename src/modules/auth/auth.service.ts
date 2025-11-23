import { Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from 'src/database/database.service';
import { RegisterDto } from './dto/register.dto';
import { TokenPayload } from './types/oken-payload.type';
import { Prisma, Role } from '@prisma/client';
import { ExceptionsHandler } from '@nestjs/core/exceptions/exceptions-handler';
@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly databaseService: DatabaseService,
  ) {}
  // register a user
  async register(dto: Prisma.UserCreateInput) {
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.databaseService.user.create({
      data: {
        email: dto.email,
        password: hashed,
        name: dto.name ?? 'Anonymous',
      },
    });
    // remove password before returning
    const { password, ...rest } = user;
    return rest;
  }



  // validate for local strategy
  async validateUser(email: string, password: string) {
    const user = await this.databaseService.user.findUnique({
      where: { email },
    });
    if (!user) return null;

    const match = await bcrypt.compare(password, user.password);
    if (!match) return null;

    // return safe user object (no password)
    const { password: _p, ...safe } = user;
    return safe;
  }

  
  async login(user: { id: number; email: string }) {
    const payload: TokenPayload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }




  // used by jwt.strategy.validate
  async getUserFromPayload(payload: TokenPayload) {
    const user = await this.databaseService.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return user;
  }

  // get profile by user id (payload)

  async getProfile(userId: number) {
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
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
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findAll(role?: Role) {
    if (role)
      return this.databaseService.user.findMany({
        where: {
          role,
        },
      });
    return this.databaseService.user.findMany();
  }

  async findOne(id: number) {
    return this.databaseService.user.findUnique({
      where: {
        id,
      },
    });
  }

  async update(id: number, updateUserDto: Prisma.UserUpdateInput) {
    return this.databaseService.user.update({
      where: {
        id,
      },
      data: updateUserDto,
    });
  }

  async remove(id: number) {
    try {
      const deletedUser = await this.databaseService.user.delete({
        where: { id },
      });
      return deletedUser;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        // P2025 = "Record to delete does not exist."
        throw new NotFoundException(`User with id ${id} not found`);
      }
      throw error; // rethrow other errors
    }
  }
}
