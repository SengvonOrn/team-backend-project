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
import { ProductAttributesService } from './product-attribute.service';
import { CreateProductAttributeDto } from './dto/create-product-attribute.dto';
import { UpdateProductAttributeDto } from './dto/update-product-attribute.dto';

@Controller('product-attributes')
export class ProductAttributesController {
  constructor(
    private readonly productAttributesService: ProductAttributesService,
  ) {}

  // ========================================================================
  // CREATE ATTRIBUTE
  // ========================================================================
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createProductAttributeDto: CreateProductAttributeDto) {
    if (!createProductAttributeDto.productId) {
      throw new BadRequestException('productId is required');
    }
    if (!createProductAttributeDto.attributeName) {
      throw new BadRequestException('attributeName is required');
    }
    if (!createProductAttributeDto.attributeValue) {
      throw new BadRequestException('attributeValue is required');
    }
    return this.productAttributesService.create(createProductAttributeDto);
  }

  // ========================================================================
  // GET ALL ATTRIBUTES
  // ========================================================================
  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('productId') productId?: string,
    @Query('attributeName') attributeName?: string,
  ) {
    return this.productAttributesService.findAll({
      page: Number(page),
      limit: Number(limit),
      productId,
      attributeName,
    });
  }

  // ========================================================================
  // SEARCH ATTRIBUTES
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

    return this.productAttributesService.search(query, {
      page: Number(page),
      limit: Number(limit),
    });
  }

  // ========================================================================
  // GET STATISTICS
  // ========================================================================
  @Get('stats')
  async getStats() {
    return this.productAttributesService.getStats();
  }

  // ========================================================================
  // GET BY PRODUCT (WITH PAGINATION)h
  // ttp://localhost:3000/api/product-attributes?page=1&limit=10
  //
  // ========================================================================
  @Get('product/:productId')
  async findByProductId(
    @Param('productId') productId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    if (!productId) {
      throw new BadRequestException('productId is required');
    }

    return this.productAttributesService.findByProductId(productId, {
      page: Number(page),
      limit: Number(limit),
    });
  }

  // ========================================================================
  // GET ALL BY PRODUCT (NO PAGINATION)
  // ========================================================================
  @Get('product/:productId/list')
  async getAttributesByProductId(@Param('productId') productId: string) {
    if (!productId) {
      throw new BadRequestException('productId is required');
    }

    return this.productAttributesService.getAttributesByProductId(productId);
  }

  // ========================================================================
  // GET SINGLE ATTRIBUTE
  // ========================================================================
  @Get(':id')
  async findOne(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('id is required');
    }

    return this.productAttributesService.findOne(id);
  }

  // ========================================================================
  // UPDATE ATTRIBUTE
  // ========================================================================
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProductAttributeDto: UpdateProductAttributeDto,
  ) {
    if (!id) {
      throw new BadRequestException('id is required');
    }

    return this.productAttributesService.update(id, updateProductAttributeDto);
  }

  // ========================================================================
  // DELETE ATTRIBUTE
  // ========================================================================
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('id is required');
    }

    return this.productAttributesService.remove(id);
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

    return this.productAttributesService.deleteByProductId(productId);
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

    return this.productAttributesService.bulkDelete(ids);
  }
}
