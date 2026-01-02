import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';

@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  //==============================================================
  // Post
  //http://localhost:3000/api/stores
  //==============================================================

  @Post('register')
  @UseGuards(AuthGuard('jwt'))
  create(@Req() req, @Body() dto: CreateStoreDto) {
    dto.userId = req.user.id;
    return this.storesService.create(dto);
  }

  //===================================================================
  // /api/stores
  //===================================================================

  @Get('stores')
  @UseGuards(AuthGuard('jwt'))
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.storesService.findAll({
      page: Number(page),
      limit: Number(limit),
      search,
    });
  }

  //===================================================================
  // http://localhost:3000/api/stores/search/stores?search=Jonh
  //===================================================================
  @Get('search')
  search(
    @Query('q') searchQuery: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.storesService.search(searchQuery, {
      page: Number(page),
      limit: Number(limit),
    });
  }
  //=================================================================
  //http://localhost:3000/api/stores/state
  //=================================================================
  @Get('state')
  getState() {
    return this.storesService.getState();
  }

  //===============================================================
  // http://localhost:3000/api/stores/user/6
  //===============================================================
  @Get('user/:userId')
  findByUserId(
    @Param('userId') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.storesService.findByUserId(Number(userId), {
      page: Number(page),
      limit: Number(limit),
    });
  }

  //==============================================================
  // http://localhost:3000/api/stores/1
  //==============================================================

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(@Param(':id') id: string) {
    return this.storesService.findOne(id);
  }

  

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStoreDto: UpdateStoreDto) {
    return this.storesService.update(id, updateStoreDto);
  }

  //==============================================================
  // http://localhost:3000/api/stores/3d461b60-4a7c-4350-8c4c-072ade71704c
  //==============================================================

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.storesService.remove(id);
  }
}
