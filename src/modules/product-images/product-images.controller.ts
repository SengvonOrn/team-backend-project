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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductImagesService } from './product-images.service';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { UploadProductImageDto } from './dto/upload-product-image.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { uploadConfig } from '../../config/upload.config';
@Controller('product-images')
export class ProductImagesController {
  constructor(private readonly productImagesService: ProductImagesService) {}

  // ========================================================================
  // 1. UPLOAD IMAGE FROM FILE
  // ========================================================================
  /**
   * Upload product image from file
   * POST /api/product-images/upload
   *
   * Form Data:
   * - file: image file
   * - productId: product ID
   * - altText: (optional) alt text
   * - position: (optional) image position
   */

  //=====================================================================

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', uploadConfig))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadProductImageDto,
  ) {
    // Validate file was uploaded
    if (!file) {
      throw new BadRequestException(
        'No file uploaded. Make sure file key is "file"',
      );
    }

    // Validate required fields
    if (!dto.productId || dto.productId.trim() === '') {
      throw new BadRequestException(
        'productId is required and cannot be empty',
      );
    }

    // Log for debugging
    console.log('📁 File received:', {
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
      productId: dto.productId,
    });

    try {
      const result = await this.productImagesService.uploadImage(file, dto);
      return result;
    } catch (error) {
      console.error('❌ Upload error:', error);
      throw error;
    }
  }

  // ========================================================================
  // 2. CREATE IMAGE FROM URL (NO FILE UPLOAD)
  // ========================================================================
  /**
   * Create product image from URL
   * POST /api/product-images
   *
   * Body:
   * {
   *   "productId": "prod-001",
   *   "imageUrl": "https://example.com/image.jpg",
   *   "altText": "Product image",
   *   "position": 0
   * }
   */

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createProductImageDto: CreateProductImageDto) {
    if (!createProductImageDto.productId) {
      throw new BadRequestException('productId is required');
    }

    if (!createProductImageDto.imageUrl) {
      throw new BadRequestException('imageUrl is required');
    }

    return this.productImagesService.create(createProductImageDto);
  }

  // ========================================================================
  // 3. GET ALL IMAGES (WITH PAGINATION & FILTER)
  // ========================================================================
  /**
   * Get all product images
   * GET /api/product-images
   * GET /api/product-images?page=1&limit=10
   * GET /api/product-images?productId=prod-001
   * GET /api/product-images?page=1&limit=10&productId=prod-001
   */
  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('productId') productId?: string,
  ) {
    return this.productImagesService.findAll({
      page: Number(page),
      limit: Number(limit),
      productId,
    });
  }

  // ========================================================================
  // 4. GET STATISTICS
  // ========================================================================
  /**
   * Get product image statistics
   * GET /api/product-images/stats
   *
   * Response:
   * {
   *   "totalImages": 45,
   *   "productsWithImages": 23
   * }
   */
  @Get('stats')
  async getStats() {
    return this.productImagesService.getStats();
  }

  // ========================================================================
  // 5. GET IMAGES BY PRODUCT (WITH PAGINATION)
  // ========================================================================
  /**
   * Get images for specific product (paginated)
   * GET /api/product-images/product/prod-001
   * GET /api/product-images/product/prod-001?page=1&limit=10
   */
  @Get('product/:productId')
  async findByProductId(
    @Param('productId') productId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    if (!productId) {
      throw new BadRequestException('productId is required');
    }

    return this.productImagesService.findByProductId(productId, {
      page: Number(page),
      limit: Number(limit),
    });
  }

  // ========================================================================
  // 6. GET ALL IMAGES FOR PRODUCT (NO PAGINATION)
  // ========================================================================
  /**
   * Get all images for product (no pagination)
   * GET /api/product-images/product/prod-001/list
   *
   * Use this for:
   * - Image carousels/galleries
   * - Frontend image lists
   * - Getting all images at once
   */
  @Get('product/:productId/list')
  async getImagesByProductId(@Param('productId') productId: string) {
    if (!productId) {
      throw new BadRequestException('productId is required');
    }

    return this.productImagesService.getImagesByProductId(productId);
  }

  // ========================================================================
  // 7. REORDER IMAGES
  // ========================================================================
  /**
   * Reorder images for a product
   * POST /api/product-images/product/prod-001/reorder
   *
   * Body:
   * {
   *   "imageIds": ["img-1", "img-3", "img-2"]
   * }
   *
   * This will set positions: img-1=0, img-3=1, img-2=2
   */
  @Post('product/:productId/reorder')
  @HttpCode(HttpStatus.OK)
  async reorderImages(
    @Param('productId') productId: string,
    @Body('imageIds') imageIds: string[],
  ) {
    if (!productId) {
      throw new BadRequestException('productId is required');
    }

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      throw new BadRequestException('imageIds array is required');
    }

    return this.productImagesService.reorderImages(productId, imageIds);
  }

  // ========================================================================
  // 8. GET SINGLE IMAGE BY ID
  // ========================================================================
  /**
   * Get single image by ID
   * GET /api/product-images/img-001
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('id is required');
    }

    return this.productImagesService.findOne(id);
  }

  // ========================================================================
  // 9. UPDATE IMAGE
  // ========================================================================
  /**
   * Update product image
   * PATCH /api/product-images/img-001
   *
   * Body (all fields optional):
   * {
   *   "imageUrl": "https://new-url.com/image.jpg",
   *   "altText": "Updated alt text",
   *   "productId": "prod-002"
   * }
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProductImageDto: UpdateProductImageDto,
  ) {
    if (!id) {
      throw new BadRequestException('id is required');
    }

    return this.productImagesService.update(id, updateProductImageDto);
  }

  // ========================================================================
  // 10. DELETE SINGLE IMAGE
  // ========================================================================
  /**
   * Delete single product image
   * DELETE /api/product-images/img-001
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('id is required');
    }

    return this.productImagesService.remove(id);
  }

  // ========================================================================
  // 11. DELETE ALL IMAGES FOR PRODUCT
  // ========================================================================
  /**
   * Delete all images for a product
   * DELETE /api/product-images/product/prod-001
   */
  @Delete('product/:productId')
  @HttpCode(HttpStatus.OK)
  async deleteByProductId(@Param('productId') productId: string) {
    if (!productId) {
      throw new BadRequestException('productId is required');
    }

    return this.productImagesService.deleteByProductId(productId);
  }

  // ========================================================================
  // 12. BULK DELETE IMAGES
  // ========================================================================
  /**
   * Delete multiple images at once
   * POST /api/product-images/bulk-delete
   *
   * Body:
   * {
   *   "ids": ["img-1", "img-2", "img-3"]
   * }
   */
  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  async bulkDelete(@Body('ids') ids: string[]) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('ids array is required');
    }

    return this.productImagesService.bulkDelete(ids);
  }
}
