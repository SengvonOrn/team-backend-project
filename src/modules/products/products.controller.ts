import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  AddImagesRequestDto,
  AddProductImageDto,
} from './dto/add-products.dto';
import { AuthGuard } from '@nestjs/passport';

import { User } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/get-user.decorator';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  //==========================================================
  // TRASH SYSTEM ENDPOINTS
  //==========================================================

  /**
   * GET /api/products/trash/:storeId - Get all deleted products (trash)
   */
  @Get('trash/:storeId')
  @UseGuards(AuthGuard('jwt'))
  async getTrash(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    return this.productsService.getTrash(storeId, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      search,
      category,
    });
  }

  /**
   * GET /api/products/trash/:storeId/stats - Get trash statistics
   */
  @Get('trash/:storeId/stats')
  @UseGuards(AuthGuard('jwt'))
  getTrashStats(@Param('storeId', ParseUUIDPipe) storeId: string) {
    return this.productsService.getTrashStats(storeId);
  }

  /**
   * PATCH /api/products/:id/restore - Restore product from trash
   */
  @Patch(':id/restore')
  @UseGuards(AuthGuard('jwt'))
  restoreProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Query('storeId') storeId?: string,
  ) {
    return this.productsService.restoreFromTrash(id, String(user.id), storeId);
  }

  /**
   * DELETE /api/products/:id/permanent - Permanently delete product from trash
   */
  @Delete(':id/permanent')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  permanentDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Query('storeId') storeId?: string,
  ) {
    return this.productsService.permanentDelete(id, String(user.id), storeId);
  }

  /**
   * DELETE /api/products/trash/:storeId/empty - Empty trash (delete old items)
   */
  @Delete('trash/:storeId/empty')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  emptyTrash(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @CurrentUser() user: User,
    @Query('days') days?: string,
  ) {
    const daysOld = days ? parseInt(days) : 30;
    return this.productsService.emptyTrash(storeId, String(user.id), daysOld);
  }

  /**
   * POST /api/products/trash/bulk-restore - Bulk restore products
   */
  @Post('trash/bulk-restore')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  bulkRestore(
    @Body() body: { productIds: string[]; storeId?: string },
    @CurrentUser() user: User,
  ) {
    return this.productsService.bulkRestore(
      body.productIds,
      String(user.id),
      body.storeId,
    );
  }

  /**
   * POST /api/products/trash/bulk-delete - Bulk permanent delete
   */
  @Post('trash/bulk-delete')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  bulkPermanentDelete(
    @Body() body: { productIds: string[]; storeId?: string },
    @CurrentUser() user: User,
  ) {
    return this.productsService.bulkPermanentDelete(
      body.productIds,
      String(user.id),
      body.storeId,
    );
  }

  /**
   * GET /api/products/:id (Updated to include deleted products option)
   */
  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  findOne(
    @Param('id') id: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    return this.productsService.findOne(id, includeDeleted === 'true');
  }

  /**
   * DELETE /api/products/:id (Updated to use soft delete - move to trash)
   */
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Query('storeId') storeId?: string,
  ) {
    return this.productsService.moveToTrash(id, String(user.id), storeId);
  }

  //==========================================================
  // EXISTING ENDPOINTS (keep all your original code below)
  //==========================================================

  //==========================================================
  // CREATE PRODUCT
  //==========================================================

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  //==========================================================
  // SEARCH PRODUCTS (Must come before :id route)
  // http://localhost:3000/api/products/search?q=Premium Wireless Headphones
  // http://localhost:3000/api/products/search?q=Premium Wireless Headphones&storeId=e21fd97e-9af1-4352-892c-3f7b47f76e66
  // http://localhost:3000/api/products/search?q=coffee&category=drink
  // http://localhost:3000/api/products/search?q=coffee&page=1&limit=10

  //==========================================================
  @Get('search')
  @UseGuards(AuthGuard('jwt'))
  search(
    @Query('q') searchQuery: string,
    @Query('storeId') storeId?: string,
    @Query('category') category?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    return this.productsService.search(searchQuery, {
      storeId,
      category,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      page: Number(page),
      limit: Number(limit),
      includeDeleted: includeDeleted === 'true',
    });
  }

  //==========================================================
  // GET BY SLUG (Must come before :id route)
  //==========================================================
  @Get('slug/:slug')
  @UseGuards(AuthGuard('jwt'))
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  //==========================================================
  // GET BY CATEGORY
  // http://localhost:3000/api/products/category/Electronics?=bc3d9b00-8377-4bb1-bbdf-cde58a35765b
  // http://localhost:3000/api/products/category/Electronics?storeId=bc3d9b00-8377-4bb1-bbdf-cde58a35765b&limit=0
  //==========================================================
  @Get('category/:category')
  @UseGuards(AuthGuard('jwt'))
  getByCategory(
    @Param('category') category: string,
    @Query('storeId') storeId: string,
    @Query('limit') limit: string = '10',
  ) {
    return this.productsService.getByCategory(storeId, category, Number(limit));
  }

  //==========================================================
  // GET POPULAR PRODUCTS
  // http://localhost:3000/api/products/bc3d9b00-8377-4bb1-bbdf-cde58a35765b
  //==========================================================
  @Get('popular/:storeId')
  @UseGuards(AuthGuard('jwt'))
  getPopular(
    @Param('storeId') storeId: string,
    @Query('limit') limit: string = '10',
  ) {
    return this.productsService.getPopular(storeId, Number(limit));
  }

  //==========================================================
  // GET ALL PRODUCTS (with filters) - Updated to include deleted option
  //==========================================================
  @Get('store/:storeId')
  @UseGuards(AuthGuard('jwt'))
  findAll(
    @Param('storeId') storeId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    return this.productsService.findAll(storeId, {
      page: Number(page),
      limit: Number(limit),
      search,
      status,
      category,
      includeDeleted: includeDeleted === 'true',
    });
  }

  //==========================================================
  // UPDATE PRODUCT
  //==========================================================

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  update(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }))
    updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, updateProductDto);
  }

  //==========================================================
  // HARD DELETE PRODUCT (Keep as backup, but recommend using permanent delete instead)
  //==========================================================
  @Delete(':id/hard')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  hardDelete(@Param('id') id: string) {
    return this.productsService.hardDelete(id);
  }

  //==========================================================
  // UPLOAD PRODUCT IMAGES (File upload)
  // http://localhost:3000/api/products/bc3d9bs0-8377-4bb1-bbdf-cde58a35765b/images/upload
  //==========================================================

  @Post(':id/images/upload')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FilesInterceptor('files', 10))
  @HttpCode(HttpStatus.OK)
  uploadImages(
    @Param('id') productId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.productsService.uploadImages(productId, files);
  }

  //==========================================================
  // ADD PRODUCT IMAGES (From URLs)
  //==========================================================

  @Post(':id/images')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  addImages(@Param('id') productId: string, @Body() body: AddImagesRequestDto) {
    return this.productsService.addImages(productId, body.images);
  }

  //==========================================================
  // UPDATE IMAGE
  //==========================================================
  @Patch('images/:imageId')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file'))
  updateImage(
    @Param('imageId') imageId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.productsService.updateImage(imageId, file);
  }

  //==========================================================
  // DELETE SINGLE IMAGE
  //==========================================================
  @Delete('images/:imageId')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteImage(@Param('imageId') imageId: string) {
    return this.productsService.deleteImage(imageId);
  }

  //==========================================================
  // DELETE MULTIPLE IMAGES
  //==========================================================
  @Post('images/delete-multiple')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  deleteMultipleImages(@Body('imageIds') imageIds: string[]) {
    return this.productsService.deleteMultipleImages(imageIds);
  }

  //==========================================================
  // UPDATE IMAGE ORDER
  // http://localhost:3000/api/products/bc3d9b00-8377-4bb1-bbdf-cde58a35765b/images/reorder
  //   {
  //   "imageOrder": [
  //     {
  //       "id": "0a88afc5-3967-45f9-a1fc-01720137bc17",
  //       "position": 0
  //     }
  //   ]
  // }

  //==========================================================

  @Patch(':id/images/reorder')
  @UseGuards(AuthGuard('jwt'))
  updateImageOrder(
    @Param('id') productId: string,
    @Body('imageOrder') imageOrder: { id: string; position: number }[],
  ) {
    return this.productsService.updateImageOrder(productId, imageOrder);
  }

  //==========================================================
  // SET MAIN IMAGE
  // http://localhost:3000/api/products/bc3d9b00-8377-4bb1-bbdf-cde58a35765b/images/0a88afc5-3967-45f9-a1fc-01720137bc17/set-main
  //==========================================================

  @Patch(':id/images/:imageId/set-main')
  @UseGuards(AuthGuard('jwt'))
  setMainImage(
    @Param('id') productId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.productsService.setMainImage(productId, imageId);
  }

  //==========================================================
  // ADD PRODUCT VARIANT
  // http://localhost:3000/api/products/bc3d9b00-8377-4bb1-bbdf-cde58a35765b/variants
  //==========================================================
  @Post(':id/variants')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  addVariant(
    @Param('id') productId: string,
    @Body()
    variantData: {
      name: string;
      price: number;
      compareAtPrice?: number;
      stock: number;
      sku?: string;
    },
  ) {
    return this.productsService.addVariant(productId, variantData);
  }

  //==========================================================
  // UPDATE PRODUCT VARIANT
  //==========================================================
  @Patch('variants/:variantId')
  @UseGuards(AuthGuard('jwt'))
  updateVariant(
    @Param('variantId') variantId: string,
    @Body() variantData: any,
  ) {
    return this.productsService.updateVariant(variantId, variantData);
  }
}

// GET    /api/products                           # List all (with filters)
// GET    /api/products?search=nike               # Search
// GET    /api/products?status=published          # Filter by status
// GET    /api/products?storeId=xxx               # Filter by store
// GET    /api/products?category=shoes            # Filter by category
// GET    /api/products?brand=Nike                # Filter by brand
// GET    /api/products/search?q=nike             # Search endpoint
// GET    /api/products/stats                     # Statistics
// GET    /api/products/slug/:slug                # Get by slug
// GET    /api/products/store/:storeId            # Products in store
// GET    /api/products/status/:status            # By status
// GET    /api/products/category/:category        # By category
// GET    /api/products/brand/:brand              # By brand
// GET    /api/products/:id                       # Get by ID
// PATCH  /api/products/:id                       # Update
// DELETE /api/products/:id                       # Delete (soft delete - move to trash)
// POST   /api/products/bulk-delete               # Bulk delete

// NEW TRASH ENDPOINTS:
// GET    /api/products/trash/:storeId            # Get trash products
// GET    /api/products/trash/:storeId/stats      # Get trash statistics
// PATCH  /api/products/:id/restore               # Restore from trash
// DELETE /api/products/:id/permanent             # Permanent delete from trash
// DELETE /api/products/trash/:storeId/empty      # Empty trash (delete old items)
// POST   /api/products/trash/bulk-restore        # Bulk restore from trash
// POST   /api/products/trash/bulk-delete         # Bulk permanent delete
