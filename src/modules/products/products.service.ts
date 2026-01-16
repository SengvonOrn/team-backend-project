import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { Prisma } from '@prisma/client';
import { CloudinaryService } from 'src/cloudinary/cloudinary.stores.service';
import { CreateProductDto } from './dto/create-product.dto';
import {
  UpdateProductDto,
  UpdateProductVariantDto,
} from './dto/update-product.dto';
import { AddProductImageDto } from './dto/add-products.dto';
import { threadId } from 'worker_threads';

@Injectable()
export class ProductsService {
  private readonly includeRelations: Prisma.ProductInclude = {
    store: {
      select: {
        id: true,
        name: true,
        userId: true,
      },
    },
    variants: {
      include: {
        inventory: true,
      },
    },
    images: {
      orderBy: { position: 'asc' as const },
    },
    attributes: true,
    reviews: {
      select: {
        id: true,
        rating: true,
        title: true,
        comment: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      take: 5,
    },
    comments: true,
    wishlists: true,
  };

  constructor(
    private readonly db: DatabaseService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  //==========================================================
  // TRASH SYSTEM METHODS
  //==========================================================

  /**
   * Move product to trash (soft delete)
   */
  async moveToTrash(
    id: string,
    userId: string,
    storeId?: string,
  ): Promise<{ message: string; product: any }> {
    try {
      // Find the product
      const product = await this.db.product.findUnique({
        where: { id },
        include: { store: true },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // Check if product belongs to user's store (if storeId provided)
      if (storeId && product.storeId !== storeId) {
        throw new ForbiddenException(
          'You can only delete products from your own store',
        );
      }

      // Check if already deleted
      if (product.isDeleted) {
        throw new BadRequestException('Product is already in trash');
      }

      // Soft delete product
      const deletedProduct = await this.db.product.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          status: 'DELETED',
        },
        include: this.includeRelations,
      });

      return {
        message: 'Product moved to trash successfully',
        product: deletedProduct,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Restore product from trash
   */
  async restoreFromTrash(
    id: string,
    userId: string,
    storeId?: string,
  ): Promise<any> {
    try {
      const product = await this.db.product.findUnique({
        where: { id },
        include: { store: true },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // Check if product belongs to user's store (if storeId provided)
      if (storeId && product.storeId !== storeId) {
        throw new ForbiddenException(
          'You can only restore products from your own store',
        );
      }

      // Check if product is in trash
      if (!product.isDeleted) {
        throw new BadRequestException('Product is not in trash');
      }

      // Restore product
      const restoredProduct = await this.db.product.update({
        where: { id },
        data: {
          isDeleted: false,
          deletedAt: null,
          status: 'DRAFT',
        },
        include: this.includeRelations,
      });

      return {
        message: 'Product restored successfully',
        product: restoredProduct,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Permanently delete product from trash
   */
  async permanentDelete(
    id: string,
    userId: string,
    storeId?: string,
  ): Promise<{ message: string }> {
    // Find the product in trash

    try {
      const product = await this.db.product.findUnique({
        where: { id },
        include: {
          store: true,
          images: true,
          variants: true,
        },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // Check if product belongs to user's store (if storeId provided)
      if (storeId && product.storeId !== storeId) {
        throw new ForbiddenException(
          'You can only delete products from your own store',
        );
      }

      // Check if product is in trash
      if (!product.isDeleted) {
        throw new BadRequestException(
          'Product is not in trash. Use soft delete first.',
        );
      }

      // Delete all images from Cloudinary
      const publicIds = product.images
        .map((img) => img.cloudinaryPublicId)
        .filter(Boolean);

      if (publicIds.length > 0) {
        await this.cloudinaryService.deleteMultiple(publicIds as string[]);
      }

      // Delete all variants and related data
      await this.db.$transaction(async (prisma) => {
        const variantIds = product.variants.map((v) => v.id);
        if (variantIds.length > 0) {
          await prisma.inventory.deleteMany({
            where: { productVariantId: { in: variantIds } },
          });
        }

        // Delete variants
        await prisma.productVariant.deleteMany({
          where: { productId: id },
        });

        // Delete images
        await prisma.productImage.deleteMany({
          where: { productId: id },
        });

        // Delete attributes
        await prisma.productAttribute.deleteMany({
          where: { productId: id },
        });

        // Delete reviews
        await prisma.review.deleteMany({
          where: { productId: id },
        });

        // Delete comments
        await prisma.comment.deleteMany({
          where: { productId: id },
        });

        // Delete wishlist entries
        await prisma.wishlist.deleteMany({
          where: { productId: id },
        });

        // Finally, delete the product
        await prisma.product.delete({
          where: { id },
        });
      });

      return { message: 'Product permanently deleted' };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all deleted products (trash)
   */
  async getTrash(
    storeId: string,
    query?: {
      page?: number;
      limit?: number;
      search?: string;
      category?: string;
    },
  ): Promise<any> {
    try {
      const page = query?.page || 1;
      const limit = query?.limit || 10;
      const skip = (page - 1) * limit;

      const where: any = {
        storeId,
        isDeleted: true, // Only deleted products
      };

      // Add filters
      if (query?.search) {
        where.OR = [
          { name: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
          { brand: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      if (query?.category) {
        where.category = query.category;
      }

      const [products, total] = await Promise.all([
        this.db.product.findMany({
          where,
          skip,
          take: limit,
          include: this.includeRelations,
          orderBy: { deletedAt: 'desc' },
        }),
        this.db.product.count({ where }),
      ]);

      return {
        data: products,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get trash statistics
   */
  async getTrashStats(storeId: string): Promise<{
    total: number;
    deletedLast24h: number;
    deletedLast7Days: number;
    byCategory: Record<string, number>;
  }> {
    try {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [total, deletedLast24h, deletedLast7Days, byCategory] =
        await Promise.all([
          // Total deleted products
          this.db.product.count({
            where: { storeId, isDeleted: true },
          }),

          // Deleted in last 24 hours
          this.db.product.count({
            where: {
              storeId,
              isDeleted: true,
              deletedAt: { gte: last24h },
            },
          }),

          // Deleted in last 7 days
          this.db.product.count({
            where: {
              storeId,
              isDeleted: true,
              deletedAt: { gte: last7Days },
            },
          }),

          // Group by category
          this.db.product.groupBy({
            by: ['category'],
            where: { storeId, isDeleted: true },
            _count: true,
          }),
        ]);

      // Convert to object
      const categoryStats = byCategory.reduce((acc, item) => {
        acc[item.category || 'uncategorized'] = item._count;
        return acc;
      }, {});

      return {
        total,
        deletedLast24h,
        deletedLast7Days,
        byCategory: categoryStats,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Restore multiple products from trash
   */
  async bulkRestore(
    productIds: string[],
    userId: string,
    storeId?: string,
  ): Promise<{ message: string; restoredCount: number; failedIds: string[] }> {
    const failedIds: string[] = [];
    const restoredIds: string[] = [];

    for (const productId of productIds) {
      try {
        // Check if product belongs to store
        const product = await this.db.product.findUnique({
          where: { id: productId },
        });

        if (!product) {
          failedIds.push(productId);
          continue;
        }

        if (storeId && product.storeId !== storeId) {
          failedIds.push(productId);
          continue;
        }

        // Restore product
        await this.db.product.update({
          where: { id: productId },
          data: {
            isDeleted: false,
            deletedAt: null,
            status: 'DRAFT',
          },
        });

        restoredIds.push(productId);
      } catch (error) {
        failedIds.push(productId);
      }
    }

    return {
      message: `Restored ${restoredIds.length} products, ${failedIds.length} failed`,
      restoredCount: restoredIds.length,
      failedIds,
    };
  }

  /**
   * Permanently delete multiple products from trash
   */
  async bulkPermanentDelete(
    productIds: string[],
    userId: string,
    storeId?: string,
  ): Promise<{ message: string; deletedCount: number; failedIds: string[] }> {
    const failedIds: string[] = [];
    const deletedIds: string[] = [];

    for (const productId of productIds) {
      try {
        // Check if product belongs to store
        const product = await this.db.product.findUnique({
          where: { id: productId },
          include: { images: true },
        });

        if (!product || !product.isDeleted) {
          failedIds.push(productId);
          continue;
        }

        if (storeId && product.storeId !== storeId) {
          failedIds.push(productId);
          continue;
        }

        // Delete images from Cloudinary
        const publicIds = product.images
          .map((img) => img.cloudinaryPublicId)
          .filter(Boolean);

        if (publicIds.length > 0) {
          await this.cloudinaryService.deleteMultiple(publicIds as string[]);
        }

        // Delete all related data
        await this.db.$transaction(async (prisma) => {
          await prisma.productVariant.deleteMany({ where: { productId } });
          await prisma.productImage.deleteMany({ where: { productId } });
          await prisma.productAttribute.deleteMany({ where: { productId } });
          await prisma.review.deleteMany({ where: { productId } });
          await prisma.comment.deleteMany({ where: { productId } });
          await prisma.wishlist.deleteMany({ where: { productId } });
          await prisma.product.delete({ where: { id: productId } });
        });

        deletedIds.push(productId);
      } catch (error) {
        failedIds.push(productId);
      }
    }

    return {
      message: `Permanently deleted ${deletedIds.length} products, ${failedIds.length} failed`,
      deletedCount: deletedIds.length,
      failedIds,
    };
  }

  /**
   * Empty trash (delete all products older than X days)
   */
  async emptyTrash(
    storeId: string,
    userId: string,
    daysOld?: number,
  ): Promise<{ message: string; deletedCount: number }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - (daysOld || 30));

      // ✅ Find products to delete
      const productsToDelete = await this.db.product.findMany({
        where: {
          storeId,
          isDeleted: true,
          deletedAt: { lt: cutoffDate },
        },
        include: { images: true, variants: true },
      });

      const productIds = productsToDelete.map((p) => p.id);

      if (productIds.length === 0) {
        return { message: 'No old products found in trash', deletedCount: 0 };
      }

      // ✅ Delete images from Cloudinary
      for (const product of productsToDelete) {
        const publicIds = product.images
          .map((img) => img.cloudinaryPublicId)
          .filter(Boolean);

        if (publicIds.length > 0) {
          await this.cloudinaryService.deleteMultiple(publicIds as string[]);
        }
      }

      // ✅ Delete all related data in transaction
      await this.db.$transaction(async (prisma) => {
        for (const product of productsToDelete) {
          const variantIds = product.variants.map((v) => v.id);
          if (variantIds.length > 0) {
            await prisma.inventory.deleteMany({
              where: { productVariantId: { in: variantIds } },
            });
          }

          await prisma.productVariant.deleteMany({
            where: { productId: product.id },
          });
          await prisma.productImage.deleteMany({
            where: { productId: product.id },
          });
          await prisma.productAttribute.deleteMany({
            where: { productId: product.id },
          });
          await prisma.review.deleteMany({
            where: { productId: product.id },
          });
          await prisma.comment.deleteMany({
            where: { productId: product.id },
          });
          await prisma.wishlist.deleteMany({
            where: { productId: product.id },
          });
          await prisma.product.delete({
            where: { id: product.id },
          });
        }
      });

      return {
        message: `Permanently deleted ${productIds.length} products from trash`,
        deletedCount: productIds.length,
      };
    } catch (error) {
      throw error;
    }
  }

  //==========================================================
  // CREATE PRODUCT
  // http://localhost:3000/api/products
  //==========================================================

  async create(createProductDto: CreateProductDto): Promise<any> {
    const { storeId, slug } = createProductDto;

    // Check if store exists
    const store = await this.db.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    // Check if slug is unique
    const existingProduct = await this.db.product.findUnique({
      where: { slug },
    });

    if (existingProduct) {
      throw new BadRequestException('Product slug must be unique');
    }

    // Create product
    const product = await this.db.product.create({
      data: createProductDto,
      include: this.includeRelations,
    });

    return product;
  }

  //==========================================================
  // FIND ALL PRODUCTS (with pagination)
  //==========================================================

  async findAll(
    storeId: string,
    query?: {
      page?: number;
      limit?: number;
      search?: string;
      category?: string;
      status?: string;
      includeDeleted?: boolean;
    },
  ): Promise<any> {
    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      storeId,
      isDeleted: false,
    };

    // Add filters
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { brand: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query?.category) {
      where.category = query.category;
    }

    if (query?.status) {
      where.status = query.status;
    }

    const [products, total] = await Promise.all([
      this.db.product.findMany({
        where,
        skip,
        take: limit,
        include: this.includeRelations,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.product.count({ where }),
    ]);

    return {
      data: products,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  //==========================================================
  // FIND ONE PRODUCT BY ID
  // http://localhost:3000/api/products/bc3d9b00-8377-4bb1-bbdf-cde58a35765b
  //==========================================================

  async findOne(id: string, includeDeleted?: boolean): Promise<any> {
    const product = await this.db.product.findUnique({
      where: { id },
      include: this.includeRelations,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.isDeleted) {
      throw new NotFoundException('Product has been deleted');
    }

    return product;
  }

  //==========================================================
  // FIND PRODUCT BY SLUG
  //==========================================================

  async findBySlug(slug: string): Promise<any> {
    const product = await this.db.product.findUnique({
      where: { slug },
      include: this.includeRelations,
    });

    if (!product || product.isDeleted) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  //==========================================================
  // UPDATE PRODUCT
  //==========================================================

  async update(id: string, updateProductDto: UpdateProductDto): Promise<any> {
    const existingProduct = await this.db.product.findUnique({
      where: { id },
      include: { variants: true },
    });

    if (!existingProduct) {
      throw new NotFoundException('Product not found');
    }

    if (existingProduct.isDeleted) {
      throw new BadRequestException('Cannot update deleted product');
    }

    // Check if slug is unique (if being updated)
    if (
      updateProductDto.slug &&
      updateProductDto.slug !== existingProduct.slug
    ) {
      const slugExists = await this.db.product.findUnique({
        where: { slug: updateProductDto.slug },
      });

      if (slugExists) {
        throw new BadRequestException('Product slug must be unique');
      }
    }

    // Handle variant updates if provided
    if (updateProductDto.variants && updateProductDto.variants.length > 0) {
      await this.updateProductVariants(id, updateProductDto.variants);
    }

    // Update main product fields
    const updatedProduct = await this.db.product.update({
      where: { id },
      data: {
        name: updateProductDto.name,
        description: updateProductDto.description,
        brand: updateProductDto.brand,
        category: updateProductDto.category,
        status: updateProductDto.status,
      },
      include: this.includeRelations,
    });

    return updatedProduct;
  }

  private async updateProductVariants(
    productId: string,
    variants: UpdateProductVariantDto[],
  ) {
    for (const variantDto of variants) {
      if (variantDto.id) {
        // Update existing variant
        await this.db.productVariant.update({
          where: { id: variantDto.id },
          data: {
            name: variantDto.name,
            sku: variantDto.sku,
            price: variantDto.price,
            compareAtPrice: variantDto.compareAtPrice,
            stock: variantDto.stock,
          },
        });
      } else {
        // Create new variant
        await this.db.productVariant.create({
          data: {
            productId,
            name: variantDto.name || '',
            sku: variantDto.sku,
            price: variantDto.price || 0,
            compareAtPrice: variantDto.compareAtPrice,
            stock: variantDto.stock || 0,
          },
        });
      }
    }
  }
  //==========================================================
  // UPLOAD PRODUCT IMAGES (Upload files to Cloudinary)
  // http://localhost:3000/api/products/bc3d9bs0-8377-4bb1-bbdf-cde58a35765b/images/upload
  //==========================================================

  async uploadImages(
    productId: string,
    files: Express.Multer.File[],
  ): Promise<any> {
    const product = await this.db.product.findUnique({
      where: { id: productId },
      include: { images: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.isDeleted) {
      throw new BadRequestException('Cannot add images to deleted product');
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    // Upload images to Cloudinary
    const uploadResults = await this.cloudinaryService.uploadMultiple(
      files,
      `products/${productId}`,
    );

    // Create image records in database
    const createdImages = await Promise.all(
      uploadResults.map((result, index) =>
        this.db.productImage.create({
          data: {
            productId,
            imageUrl: result.secure_url,
            cloudinaryPublicId: result.public_id,
            imageType: index === 0 ? 'MAIN' : 'GALLERY',
            position: product.images.length + index,
          },
        }),
      ),
    );

    return this.db.product.findUnique({
      where: { id: productId },
      include: this.includeRelations,
    });
  }

  //==========================================================
  // ADD PRODUCT IMAGES (from Cloudinary URLs - existing method)
  // http://localhost:3000/api/products/bc3d9b00-8377-4bb1-bbdf-cde58a35765b/images
  //==========================================================

  //   {
  //   "images":
  //   [
  //     {
  //       "imageUrl": "https://res.cloudinary.com/dltajsfwd/image/upload/v1767977811/products/bc3d9b00-8377-4bb1-bbdf-cde58a35765b/yegol7mekjg3ouycsmyg.jpg",
  //       "imageType": "MAIN",
  //       "width": 1080,
  //       "height": 1080,
  //       "fileSize": 245000,
  //       "mimetype": "image/jpeg",
  //       "altText": "Main product image"
  //     }
  //   ]
  // }

  async addImages(
    productId: string,
    images: AddProductImageDto[],
  ): Promise<any> {
    const product = await this.db.product.findUnique({
      where: { id: productId },
      include: { images: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.isDeleted) {
      throw new BadRequestException('Cannot add images to deleted product');
    }

    // If adding MAIN image, remove old MAIN image
    const mainInNew = images.find((img) => img.imageType === 'MAIN');
    if (mainInNew) {
      const oldMain = product.images.find((img) => img.imageType === 'MAIN');
      if (oldMain && oldMain.cloudinaryPublicId) {
        await this.cloudinaryService.deleteImage(oldMain.cloudinaryPublicId);
        await this.db.productImage.delete({
          where: { id: oldMain.id },
        });
      }
    }
    // Create new images
    const createdImages = await Promise.all(
      images.map((img, index) =>
        this.db.productImage.create({
          data: {
            productId,
            imageUrl: img.imageUrl,
            imageType: img.imageType || 'GALLERY',
            cloudinaryPublicId: this.extractPublicId(img.imageUrl),
            width: img.width,
            height: img.height,
            fileSize: img.fileSize,
            mimetype: img.mimetype,
            altText: img.altText,
            position: img.position !== undefined ? img.position : index,
          },
        }),
      ),
    );

    return this.db.product.findUnique({
      where: { id: productId },
      include: this.includeRelations,
    });
  }

  //==========================================================
  // UPDATE PRODUCT IMAGE
  //==========================================================

  async updateImage(imageId: string, file: Express.Multer.File): Promise<any> {
    const image = await this.db.productImage.findUnique({
      where: { id: imageId },
      include: { product: true },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    // Upload new image and delete old one
    const uploadResult = await this.cloudinaryService.updateImage(
      image.cloudinaryPublicId as string,
      file,
      `products/${image.productId}`,
    );

    // Update image record
    const updatedImage = await this.db.productImage.update({
      where: { id: imageId },
      data: {
        imageUrl: uploadResult.secure_url,
        cloudinaryPublicId: uploadResult.public_id,
      },
    });

    return this.db.product.findUnique({
      where: { id: image.productId },
      include: this.includeRelations,
    });
  }

  //==========================================================
  // DELETE PRODUCT IMAGE
  //==========================================================

  async deleteImage(imageId: string): Promise<void> {
    const image = await this.db.productImage.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    // Delete from Cloudinary
    if (image.cloudinaryPublicId) {
      await this.cloudinaryService.deleteImage(image.cloudinaryPublicId);
    }

    // Delete from database
    await this.db.productImage.delete({
      where: { id: imageId },
    });
  }

  //==========================================================
  // DELETE MULTIPLE IMAGES
  //==========================================================

  async deleteMultipleImages(imageIds: string[]): Promise<{
    deleted: number;
    failed: number;
  }> {
    const images = await this.db.productImage.findMany({
      where: { id: { in: imageIds } },
    });

    if (images.length === 0) {
      throw new NotFoundException('No images found');
    }

    // Extract public IDs
    const publicIds = images
      .map((img) => img.cloudinaryPublicId)
      .filter(Boolean);

    // Delete from Cloudinary
    const cloudinaryResult = await this.cloudinaryService.deleteMultiple(
      publicIds as string[],
    );

    // Delete from database
    const dbResult = await this.db.productImage.deleteMany({
      where: { id: { in: imageIds } },
    });

    return {
      deleted: dbResult.count,
      failed: cloudinaryResult.failed.length,
    };
  }

  //==========================================================
  // UPDATE IMAGE ORDER
  //==========================================================

  async updateImageOrder(
    productId: string,
    imageOrder: { id: string; position: number }[],
  ): Promise<any> {
    // Verify product exists
    const product = await this.db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Update positions
    await Promise.all(
      imageOrder.map((item) =>
        this.db.productImage.update({
          where: { id: item.id },
          data: { position: item.position },
        }),
      ),
    );

    return this.db.product.findUnique({
      where: { id: productId },
      include: this.includeRelations,
    });
  }

  //==========================================================
  // SET MAIN IMAGE
  //==========================================================

  async setMainImage(productId: string, imageId: string): Promise<any> {
    const [product, newMainImage] = await Promise.all([
      this.db.product.findUnique({
        where: { id: productId },
        include: { images: true },
      }),
      this.db.productImage.findUnique({
        where: { id: imageId },
      }),
    ]);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!newMainImage || newMainImage.productId !== productId) {
      throw new NotFoundException('Image not found for this product');
    }

    // Reset all images to GALLERY
    await this.db.productImage.updateMany({
      where: { productId },
      data: { imageType: 'GALLERY' },
    });

    // Set new main image
    await this.db.productImage.update({
      where: { id: imageId },
      data: { imageType: 'GALLERY' },
    });

    return this.db.product.findUnique({
      where: { id: productId },
      include: this.includeRelations,
    });
  }

  //==========================================================
  // ADD PRODUCT VARIANT
  //==========================================================

  async addVariant(
    productId: string,
    variantData: {
      name: string;
      price: number;
      compareAtPrice?: number;
      stock: number;
      sku?: string;
    },
  ): Promise<any> {
    // Check if product exists
    const product = await this.db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if SKU is unique
    if (variantData.sku) {
      const skuExists = await this.db.productVariant.findUnique({
        where: { sku: variantData.sku },
      });

      if (skuExists) {
        throw new BadRequestException('SKU must be unique');
      }
    }

    return this.db.$transaction(async (Prisma) => {
      const variant = await Prisma.productVariant.create({
        data: {
          productId,
          ...variantData,
        },
      });

      await Prisma.inventory.create({
        data: {
          productVariantId: variant.id,
          quantityInStock: variantData.stock,
        },
      });

      return Prisma.productVariant.findUnique({
        where: { id: variant.id },
        include: { inventory: true },
      });
    });
  }

  //==========================================================
  // UPDATE PRODUCT VARIANT
  //==========================================================

  async updateVariant(variantId: string, variantData: any): Promise<any> {
    const variant = await this.db.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    // Check if SKU is unique (if being updated)
    if (variantData.sku && variantData.sku !== variant.sku) {
      const skuExists = await this.db.productVariant.findUnique({
        where: { sku: variantData.sku },
      });

      if (skuExists) {
        throw new BadRequestException('SKU must be unique');
      }
    }

    return this.db.productVariant.update({
      where: { id: variantId },
      data: variantData,
      include: { inventory: true },
    });
  }

  //==========================================================
  // DELETE PRODUCT (Soft delete)
  //==========================================================

  async remove(id: string): Promise<{ message: string }> {
    const product = await this.db.product.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Delete all images from Cloudinary
    const publicIds = product.images
      .map((img) => img.cloudinaryPublicId)
      .filter(Boolean);

    if (publicIds.length > 0) {
      await this.cloudinaryService.deleteMultiple(publicIds as string[]);
    }

    // Soft delete product
    await this.db.product.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return { message: 'Product deleted successfully' };
  }

  //==========================================================
  // HARD DELETE PRODUCT (Admin only)
  //==========================================================

  async hardDelete(id: string): Promise<{ message: string }> {
    const product = await this.db.product.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Delete all images from Cloudinary
    const publicIds = product.images
      .map((img) => img.cloudinaryPublicId)
      .filter(Boolean);

    if (publicIds.length > 0) {
      await this.cloudinaryService.deleteMultiple(publicIds as string[]);
    }

    // Hard delete product and all related data (cascades)
    await this.db.product.delete({
      where: { id },
    });

    return { message: 'Product permanently deleted' };
  }

  //==========================================================
  // SEARCH PRODUCTS
  //==========================================================

  async search(
    query: string,
    filters?: {
      storeId?: string;
      category?: string;
      minPrice?: number;
      maxPrice?: number;
      page?: number;
      limit?: number;
      includeDeleted?: boolean;
    },
  ): Promise<any> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      isDeleted: false,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { brand: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (filters?.storeId) {
      where.storeId = filters.storeId;
    }

    if (filters?.category) {
      where.category = filters.category;
    }

    const [products, total] = await Promise.all([
      this.db.product.findMany({
        where,
        skip,
        take: limit,
        include: this.includeRelations,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.product.count({ where }),
    ]);

    return {
      data: products,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  //==========================================================
  // GET PRODUCTS BY CATEGORY
  //==========================================================

  async getByCategory(
    storeId: string,
    category: string,
    limit: number = 10,
  ): Promise<any[]> {
    return this.db.product.findMany({
      where: {
        storeId,
        category,
        isDeleted: false,
      },
      include: this.includeRelations,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  //==========================================================
  // GET POPULAR PRODUCTS
  //==========================================================

  async getPopular(storeId: string, limit: number = 10): Promise<any[]> {
    return this.db.product.findMany({
      where: {
        storeId,
        isDeleted: false,
        reviews: {
          some: {},
        },
      },
      include: {
        ...this.includeRelations,
        reviews: {
          take: 5,
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  //==========================================================
  // HELPER: Extract public ID from Cloudinary URL
  //==========================================================

  private extractPublicId(imageUrl: string): string {
    try {
      if (!imageUrl) {
        console.warn('Empty image URL provided');
        return '';
      }
      const urlParts = imageUrl.split('/');
      const filename = urlParts[urlParts.length - 1];
      const publicId = filename.split('.')[0];
      const folder = urlParts[urlParts.length - 2];

      return `${folder}/${publicId}`;
    } catch (error) {
      console.error('Error extracting public ID:', error);
      return '';
    }
  }
}
