import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { CommentsService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  // ========================================================================
  // CREATE COMMENT
  // ========================================================================
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createCommentDto: CreateCommentDto) {
    if (!createCommentDto.userId) {
      throw new BadRequestException('userId is required');
    }
    if (!createCommentDto.productId) {
      throw new BadRequestException('productId is required');
    }

    if (!createCommentDto.comment) {
      throw new BadRequestException('comment is required');
    }

    return this.commentsService.create(createCommentDto);
  }

  // ========================================================================
  // GET ALL COMMENTS
  // http://localhost:3000/api/comments?page=1&limit=10
  // ========================================================================
  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('productId') productId?: string,
    @Query('userId') userId?: string,
    @Query('minRating') minRating?: string,
    @Query('maxRating') maxRating?: string,
  ) {
    return this.commentsService.findAll({
      page: Number(page),
      limit: Number(limit),
      productId,
      userId: userId ? Number(userId) : undefined,
      minRating: minRating ? Number(minRating) : undefined,
      maxRating: maxRating ? Number(maxRating) : undefined,
    });
  }

  // ========================================================================
  // SEARCH COMMENTS
  // http://localhost:3000/api/comments?productId=36afb10a-2bcc-4e44-890b-e84686f7396b
  // ========================================================================
  @Get('search')
  async search(
    @Query('q') query: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Search query is required');
    }

    return this.commentsService.search(query, {
      page: Number(page),
      limit: Number(limit),
    });
  }

  // ========================================================================
  // GET STATISTICS
  // http://localhost:3000/api/comments/stats
  // ========================================================================
  @Get('stats')
  async getStats() {
    return this.commentsService.getStats();
  }

  // ========================================================================
  // GET COMMENTS BY RATING
  // http://localhost:3000/api/comments/rating/4/5?page=1&limit=10
  // ========================================================================
  @Get('rating/:minRating/:maxRating')
  async findByRating(
    @Param('minRating') minRating: string,
    @Param('maxRating') maxRating: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.commentsService.findByRating(
      Number(minRating),
      Number(maxRating),
      {
        page: Number(page),
        limit: Number(limit),
      },
    );
  }

  // ========================================================================
  // GET COMMENTS BY PRODUCT
  // ========================================================================
  @Get('product/:productId')
  async findByProductId(
    @Param('productId') productId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('minRating') minRating?: string,
    @Query('maxRating') maxRating?: string,
  ) {
    if (!productId) {
      throw new BadRequestException('productId is required');
    }

    return this.commentsService.findByProductId(productId, {
      page: Number(page),
      limit: Number(limit),
      minRating: minRating ? Number(minRating) : undefined,
      maxRating: maxRating ? Number(maxRating) : undefined,
    });
  }

  // ========================================================================
  // GET COMMENTS BY USER
  // ========================================================================
  @Get('user/:userId')
  async findByUserId(
    @Param('userId') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    return this.commentsService.findByUserId(Number(userId), {
      page: Number(page),
      limit: Number(limit),
    });
  }

  // ========================================================================
  // GET SINGLE COMMENT
  // ========================================================================
  @Get(':id')
  async findOne(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('id is required');
    }

    return this.commentsService.findOne(id);
  }

  // ========================================================================
  // UPDATE COMMENT
  // ========================================================================
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    if (!id) {
      throw new BadRequestException('id is required');
    }

    return this.commentsService.update(id, updateCommentDto);
  }

  // ========================================================================
  // DELETE COMMENT
  // ========================================================================
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('id is required');
    }

    return this.commentsService.remove(id);
  }

  // ========================================================================
  // DELETE ALL BY PRODUCT
  // ========================================================================
  @Delete('product/:productId')
  @HttpCode(HttpStatus.OK)
  async deleteByProductId(@Param('productId') productId: string) {
    if (!productId) {
      throw new BadRequestException('productId is required');
    }

    return this.commentsService.deleteByProductId(productId);
  }

  // ========================================================================
  // DELETE ALL BY USER
  // ========================================================================
  @Delete('user/:userId')
  @HttpCode(HttpStatus.OK)
  async deleteByUserId(@Param('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    return this.commentsService.deleteByUserId(Number(userId));
  }

  // ========================================================================
  // BULK DELETE
  // ========================================================================
  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  async bulkDelete(@Body('ids') ids: string[]) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('ids array is required');
    }

    return this.commentsService.bulkDelete(ids);
  }
}
