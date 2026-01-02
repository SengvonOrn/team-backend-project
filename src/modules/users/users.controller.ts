import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { UserService } from './users.service';
import { Jwtguard } from 'src/common/guards/jwt.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UserService) {}
  @UseGuards(Jwtguard)
  @Get('id')
  async getUserProfile(@Param('id') id: number) {
    return await this.usersService.getProfile(id);
  }
}
