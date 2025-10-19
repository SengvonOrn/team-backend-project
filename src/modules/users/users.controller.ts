import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {} // 👈 dependency injection

  @Get()
  findAll() {
    return this.usersService.findAll();
  }
}
