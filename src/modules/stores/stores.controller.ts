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
import { IStore, IStoreQuery } from 'src/interface/store.interface';
import { IPaginatedResponse } from 'src/interface/product.interface';

@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  //==============================================================
  // Post
  //http://localhost:3000/api/stores
  //==============================================================

  @Post('register')
  @UseGuards(AuthGuard('jwt'))
  create(@Req() req: any, @Body() dto: CreateStoreDto): Promise<IStore> {
    const userId = req.user.id;

    dto.userId = userId;

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

  //============================================================
  @Get('my-stores')
  @UseGuards(AuthGuard('jwt'))
  async getMyStores(
    @Req() req: any,
    @Query() query: IStoreQuery,
  ): Promise<IPaginatedResponse<IStore>> {
    const userId = req.user.id;
    // Validate pagination params
    const page = Math.max(1, parseInt(query.page?.toString() || '1'));
    const limit = Math.max(
      1,
      Math.min(100, parseInt(query.limit?.toString() || '10')),
    );
    return this.storesService.findByUserId(userId, {
      page,
      limit,
      search: query.search,
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
  @Get('stores/:userId')
  @UseGuards(AuthGuard('jwt'))
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

  @Get(':id')
  // @UseGuards(AuthGuard('jwt'))
  findOne(@Param(':id') id: string) {
    return this.storesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  update(@Param('id') id: string, @Body() updateStoreDto: UpdateStoreDto) {
    console.log('PATCH BODY:', updateStoreDto);
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
