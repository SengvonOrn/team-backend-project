import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateProductDto } from './dto/create-product.dto';
import { IProduct, IProductQuery } from 'src/interface/product.interface';
import { IPaginatedResponse } from 'src/interface/store.interface';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly db: DatabaseService) {}

  private readonly includeRelations = {
    store: true,
    images: { orderBy: { position: 'asc' as any } },
    variants: true,
    attributes: true,
    comments: { take: 5 },
  };

  async create(createProductDto: CreateProductDto): Promise<IProduct> {
    const { storeId, slug } = createProductDto;
    const store = await this.db.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new NotFoundException('Store with ID not found');
    }

    const existingProducts = await this.db.product.findUnique({
      where: { slug },
    });

    if (existingProducts) {
      throw new BadRequestException('Product slug must be unique');
    }

    const product = await this.db.product.create({
      data: createProductDto,
      include: this.includeRelations,
    });

    return product as IProduct;
  }
  //=========================================================================
  //
  //=========================================================================

  async findAll(query: IProductQuery): Promise<IPaginatedResponse<IProduct>> {
    const { page, limit, search, status, storeId, category, brand } = query;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as any } },
        { description: { contains: search, mode: 'insensitive' as any } },
        { brand: { contains: search, mode: 'insensitive' as any } },
        { category: { contains: search, mode: 'insensitive' as any } },
      ];
    }

    if (status) {
      where.status = status;
    }
    if (storeId) {
      where.storeId = storeId;
    }

    if (category) {
      where.category = category;
    }
    if (brand) {
      where.brand = brand;
    }

    const [products, total] = await Promise.all([
      this.db.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          store: true,
          images: { take: 3, orderBy: { position: 'asc' as any } },
          variants: { take: 3 },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.product.count({ where }),
    ]);

    return {
      data: products as IProduct[],
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  //=====================================================================
  //
  //=====================================================================

  async findOne(id: string): Promise<IProduct> {
    const product = await this.db.product.findUnique({
      where: { id },
      include: this.includeRelations,
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product as IProduct;
  }

  //==================================================================
  //
  //==================================================================

  async findBySlug(slug: string): Promise<IProduct> {
    const product = await this.db.product.findUnique({
      where: { slug },
      include: this.includeRelations,
    });

    if (!product)
      throw new NotFoundException(`Products with slug ${slug} not found`);

    return product as IProduct;
  }

  //=====================================================================
  //
  //=====================================================================

  async findByStore(
    storeId: string,
    query: IProductQuery,
  ): Promise<IPaginatedResponse<IProduct>> {
    const { page, limit, search, status, category, brand } = query;
    const skip = (page - 1) * limit;

    const store = await this.db.store.findUnique({
      where: { id: storeId },
    });

    if (!store)
      throw new NotFoundException(`Store with ID ${storeId} not found`);
    const where: any = { storeId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as any } },
        { description: { contains: search, mode: 'insensitive' as any } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = category;
    }

    if (brand) {
      where.brand = brand;
    }

    const [product, total] = await Promise.all([
      this.db.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          store: true,
          images: { take: 3 },
          variants: { take: 3 },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.product.count({
        where,
      }),
    ]);

    return {
      data: product as IProduct[],
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  //=====================================================================
  //
  //=====================================================================

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<IProduct> {
    const existingProduct = await this.db.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      throw new NotFoundException(`Products with ID ${id}  not found`);
    }

    // Check slug uniqueness if slug is being updated
    if (
      updateProductDto.slug &&
      updateProductDto.slug !== existingProduct.slug
    ) {
      const slugExists = await this.db.product.findUnique({
        where: { slug: updateProductDto.slug },
      });
      if (slugExists)
        throw new BadRequestException(`Producst slug must be unique`);
    }
    // Verify store exists if storeId is being updated

    if (
      updateProductDto.storeId &&
      updateProductDto.storeId !== existingProduct.storeId
    ) {
      const store = await this.db.store.findUnique({
        where: { id: updateProductDto.storeId },
      });
      if (!store) {
        throw new NotFoundException(
          `Store with ID ${updateProductDto.storeId} not found`,
        );
      }
    }

    const update = await this.db.product.update({
      where: { id },
      data: updateProductDto,
      include: this.includeRelations,
    });

    return update as IProduct;
  }

  //=====================================================================
  //
  //=====================================================================

  async remove(id: string): Promise<{ message: string }> {
    const product = await this.db.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Delete related images first (if cascade is not set)
    await this.db.productImage.deleteMany({
      where: { productId: id },
    });

    await this.db.product.delete({ where: { id } });

    return { message: 'Product deleted successfully' };
  }

  //=====================================================================
  //
  //=====================================================================

  async search(
    query: string,
    pagination: IProductQuery,
  ): Promise<IPaginatedResponse<IProduct>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Search query cannot be empty');
    }

    const searchFields: any = {
      OR: [
        { name: { contains: query, mode: 'insensitive' as any } },
        { description: { contains: query, mode: 'insensitive' as any } },
        { brand: { contains: query, mode: 'insensitive' as any } },
        { category: { contains: query, mode: 'insensitive' as any } },
        { slug: { contains: query, mode: 'insensitive' as any } },
      ],
    };

    const [products, total] = await Promise.all([
      this.db.product.findMany({
        where: searchFields,
        skip,
        take: limit,
        include: {
          store: true,
          images: { take: 2 },
        },
      }),
      this.db.product.count({ where: searchFields }),
    ]);

    return {
      data: products as IProduct[],
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  //=====================================================================
  //
  //=====================================================================
  async findByStatus(
    status: string,
    pagination: IProductQuery,
  ): Promise<IPaginatedResponse<IProduct>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.db.product.findMany({
        where: { status },
        skip,
        take: limit,
        include: {
          store: true,
          images: { take: 3 },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.product.count({ where: { status } }),
    ]);

    return {
      data: products as IProduct[],
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }
  //===========================================================================
  //
  //===========================================================================
  async findByCategory(
    category: string,
    pagination: IProductQuery,
  ): Promise<IPaginatedResponse<IProduct>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.db.product.findMany({
        where: { category },
        skip,
        take: limit,
        include: {
          store: true,
          images: { take: 3 },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.product.count({ where: { category } }),
    ]);

    return {
      data: products as IProduct[],
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  //========================================================================
  //
  //========================================================================
  async findByBrand(
    brand: string,
    pagination: IProductQuery,
  ): Promise<IPaginatedResponse<IProduct>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.db.product.findMany({
        where: { brand },
        skip,
        take: limit,
        include: {
          store: true,
          images: { take: 3 },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.product.count({ where: { brand } }),
    ]);

    return {
      data: products as IProduct[],
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  //===========================================================================
  //
  //===========================================================================
  async getStats(): Promise<{
    totalProducts: number;
    productsWithImages: number;
    draftProducts: number;
    publishedProducts: number;
  }> {
    const [total, withImages, draft, published] = await Promise.all([
      this.db.product.count(),
      this.db.product.count({
        where: {
          images: { some: {} },
        },
      }),
      this.db.product.count({ where: { status: 'draft' } }),
      this.db.product.count({ where: { status: 'published' } }),
    ]);

    return {
      totalProducts: total,
      productsWithImages: withImages,
      draftProducts: draft,
      publishedProducts: published,
    };
  }

  //===========================================================================
  //
  //==========================================================================
  async bulkDelete(ids: string[]): Promise<{ message: string; deletedCount: number }> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('At least one product ID is required');
    }

    // Delete images for these products
    await this.db.productImage.deleteMany({
      where: { productId: { in: ids } },
    });

    const result = await this.db.product.deleteMany({
      where: { id: { in: ids } },
    });

    if (result.count === 0) {
      throw new NotFoundException('No products found to delete');
    }

    return {
      message: `${result.count} product(s) deleted successfully`,
      deletedCount: result.count,
    };
  }
  //===================================================================
  //
  //===================================================================
  async bulkUpdateStatus(
    ids: string[],
    status: string,
  ): Promise<{ message: string; updatedCount: number }> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('At least one product ID is required');
    }

    const result = await this.db.product.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });

    return {
      message: `${result.count} product(s) status updated to ${status}`,
      updatedCount: result.count,
    };
  }



}
