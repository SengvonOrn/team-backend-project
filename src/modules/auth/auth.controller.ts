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
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from '../../common/guards/local.auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RequestWithUser } from 'src/types/RequestWithUser';
import { Prisma, Role } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // register  http://localhost:3000/auth/register
  @Post('register')
  async register(@Body() dto: Prisma.UserCreateInput) {
    return this.authService.register(dto);
  }

  // login using local strategy  http://localhost:3000/auth/login

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req: RequestWithUser, @Body() body: LoginDto) {
    // req.user is set by LocalStrategy.validate()
    return this.authService.login(req.user);
  }

  // protected route e
  // get user by id jwt auth token from sub_Id
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req: RequestWithUser) {
    // req.user should be set by JwtAuthGuard
    // const userId = req.user['sub']; // JWT payload contains `sub` as id
    const userId = req.user.id; // JWT payload contains `sub` as id
    return this.authService.getProfile(userId);
  }

  //---------------------------------just testing------------------------------------------>

  @Get()
  findAll(@Ip() ip: String, @Query('role') role?: Role) {
    const allUser = this.authService.findAll(role);
    return allUser;
  }

  // get user by id db serrify
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.authService.findOne(+id);
  }
  // Update user by id
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: Prisma.UserUpdateInput,
  ) {
    return this.authService.update(+id, updateUserDto);
  }
  // Remov user by Id
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.authService.remove(+id);
  }
}
