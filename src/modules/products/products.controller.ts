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
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsServic: ProductsService) {}
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProductsdto: CreateProductDto) {
    return this.productsServic.create(createProductsdto);
  }

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('storeId') storeId?: string,
    @Query('category') category?: string,
    @Query('brand') brand?: string,
  ) {
    return this.productsServic.findAll({
      page: Number(page),
      limit: Number(limit),
      search,
      status,
      storeId,
      category,
      brand,
    });
  }
  @Get('search')
  search(
    @Query('q') searchQuery: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.productsServic.search(searchQuery, {
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Get('stats')
  getStats() {
    return this.productsServic.getStats();
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.productsServic.findBySlug(slug);
  }

  @Get('store/:storeId')
  findByStore(
    @Param('storeId') storeId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('brand') brand?: string,
  ) {
    return this.productsServic.findByStore(storeId, {
      page: Number(page),
      limit: Number(limit),
      search,
      status,
      category,
      brand,
    });
  }

  @Get('status/:status')
  findByStatus(
    @Param('status') status: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.productsServic.findByStatus(status, {
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Get('category/:category')
  findByCategory(
    @Param('category') category: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.productsServic.findByCategory(category, {
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Get('brand/:brand')
  findByBrand(
    @Param('brand') brand: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.productsServic.findByBrand(brand, {
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsServic.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsServic.update(id, updateProductDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.productsServic.remove(id);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  bulkDelete(@Body('ids') ids: string[]) {
    return this.productsServic.bulkDelete(ids);
  }

  @Post('bulk-update-status')
  @HttpCode(HttpStatus.OK)
  bulkUpdateStatus(@Body('ids') ids: string[], @Body('status') status: string) {
    return this.productsServic.bulkUpdateStatus(ids, status);
  }
}


// POST   /api/products                           # Create
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
// DELETE /api/products/:id                       # Delete
// POST   /api/products/bulk-delete               # Bulk delete
// POST   /api/products/bulk-update-status        # Bulk update status