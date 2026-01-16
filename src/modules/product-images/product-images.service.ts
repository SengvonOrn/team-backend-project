import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { UploadProductImageDto } from './dto/upload-product-image.dto';
import { DatabaseService } from 'src/database/database.service';
import {
  IProductImage,
  IPaginatedResponse,
  IProductImageQuery,
  IUploadResponse,
} from '../../interface/product-image.interface';
import { PRODUCT_IMAGE_MESSAGES } from 'src/constants/product-image.constants';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as fss from 'fs';

@Injectable()
export class ProductImagesService {
  // ========================================================================
  // CONFIGURATION
  // ========================================================================
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'products');
  private readonly includeProduct = {
    product: true,
  };

  // ========================================================================
  // CONSTRUCTOR
  // ========================================================================
  constructor(private readonly db: DatabaseService) {
    this.ensureUploadDir();
  }

  // ========================================================================
  // INITIALIZE UPLOAD DIRECTORY
  // ========================================================================
  private async ensureUploadDir() {
    try {
      if (!fss.existsSync(this.uploadDir)) {
        await fs.mkdir(this.uploadDir, { recursive: true });
        console.log('✅ Upload directory created:', this.uploadDir);
      }
    } catch (error) {
      console.error('❌ Failed to create upload directory:', error);
    }
  }

  // ========================================================================
  // UPLOAD IMAGE FROM FILE
  // ========================================================================
  async uploadImage(
    file: Express.Multer.File,
    dto: UploadProductImageDto,
  ): Promise<IUploadResponse> {
    // Validate file exists
    if (!file) {
      throw new BadRequestException(PRODUCT_IMAGE_MESSAGES.NO_FILE);
    }

    // Validate product exists
    const product = await this.db.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) {
      // Clean up uploaded file
      await this.deleteFile(file.path);
      throw new NotFoundException(PRODUCT_IMAGE_MESSAGES.PRODUCT_NOT_FOUND);
    }

    try {
      // Get next position
      const position = await this.getNextPosition(dto.productId, dto.position);

      // Create image URL from filename
      const imageUrl = `/uploads/products/${file.filename}`;

      // Create database record
      const image = await this.db.productImage.create({
        data: {
          productId: dto.productId,
          imageUrl,
          altText: dto.altText || null,
          position,
        },
        include: this.includeProduct,
      });

      return {
        success: true,
        message: PRODUCT_IMAGE_MESSAGES.IMAGE_CREATED,
        data: image as IProductImage,
      };
    } catch (error) {
      // Clean up file on error
      await this.deleteFile(file.path);
      console.error('❌ Error uploading file:', error);
      throw new BadRequestException('Failed to upload image');
    }
  }



  
  // ========================================================================
  // CREATE FROM URL (NO FILE UPLOAD)
  // ========================================================================
  async create(
    createProductImageDto: CreateProductImageDto,
  ): Promise<IProductImage> {
    const { productId } = createProductImageDto;

    // Check if product exists
    const product = await this.db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(PRODUCT_IMAGE_MESSAGES.PRODUCT_NOT_FOUND);
    }

    // Get next position
    const position = await this.getNextPosition(
      productId,
      createProductImageDto.position,
    );

    const image = await this.db.productImage.create({
      data: {
        ...createProductImageDto,
        position,
      },
      include: this.includeProduct,
    });

    return image as IProductImage;
  }

  // ========================================================================
  // GET ALL IMAGES WITH PAGINATION
  // ========================================================================
  async findAll(
    query: IProductImageQuery,
  ): Promise<IPaginatedResponse<IProductImage>> {
    const { page, limit, productId } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (productId) {
      where.productId = productId;
    }

    const [images, total] = await Promise.all([
      this.db.productImage.findMany({
        where,
        skip,
        take: limit,
        include: this.includeProduct,
        orderBy: [{ productId: 'asc' }, { position: 'asc' }],
      }),
      this.db.productImage.count({ where }),
    ]);

    return {
      data: images as IProductImage[],
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ========================================================================
  // GET SINGLE IMAGE BY ID
  // ========================================================================
  async findOne(id: string): Promise<IProductImage> {
    const image = await this.db.productImage.findUnique({
      where: { id },
      include: this.includeProduct,
    });

    if (!image) {
      throw new NotFoundException(PRODUCT_IMAGE_MESSAGES.IMAGE_NOT_FOUND);
    }

    return image as IProductImage;
  }

  // ========================================================================
  // GET IMAGES BY PRODUCT ID (WITH PAGINATION)
  // ========================================================================
  async findByProductId(
    productId: string,
    query: IProductImageQuery,
  ): Promise<IPaginatedResponse<IProductImage>> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    // Check if product exists
    const product = await this.db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(PRODUCT_IMAGE_MESSAGES.PRODUCT_NOT_FOUND);
    }

    const [images, total] = await Promise.all([
      this.db.productImage.findMany({
        where: { productId },
        skip,
        take: limit,
        include: this.includeProduct,
        orderBy: { position: 'asc' },
      }),
      this.db.productImage.count({ where: { productId } }),
    ]);

    return {
      data: images as IProductImage[],
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ========================================================================
  // GET ALL IMAGES FOR PRODUCT (NO PAGINATION)
  // ========================================================================
  async getImagesByProductId(productId: string): Promise<IProductImage[]> {
    const product = await this.db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(PRODUCT_IMAGE_MESSAGES.PRODUCT_NOT_FOUND);
    }

    const images = await this.db.productImage.findMany({
      where: { productId },
      orderBy: { position: 'asc' },
      include: this.includeProduct,
    });

    return images as IProductImage[];
  }

  // ========================================================================
  // UPDATE IMAGE
  // ========================================================================
  async update(
    id: string,
    updateProductImageDto: UpdateProductImageDto,
  ): Promise<IProductImage> {
    const existingImage = await this.db.productImage.findUnique({
      where: { id },
    });

    // if (!existingImage) {
    //   throw new NotFoundException(PRODUCT_IMAGE_MESSAGES.IMAGE_NOT_FOUND);
    // }

    // If productId is being updated, verify new product exists
    // if (
    //   updateProductImageDto.productId &&
    //   updateProductImageDto.productId !== existingImage.productId
    // ) {
    //   const product = await this.db.product.findUnique({
    //     where: { id: updateProductImageDto.productId },
    //   });

    //   if (!product) {
    //     throw new NotFoundException(PRODUCT_IMAGE_MESSAGES.PRODUCT_NOT_FOUND);
    //   }
    // }

    const updated = await this.db.productImage.update({
      where: { id },
      data: updateProductImageDto,
      include: this.includeProduct,
    });

    return updated as IProductImage;
  }

  // ========================================================================
  // DELETE SINGLE IMAGE
  // ========================================================================
  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const image = await this.db.productImage.findUnique({
      where: { id },
    });

    if (!image) {
      throw new NotFoundException(PRODUCT_IMAGE_MESSAGES.IMAGE_NOT_FOUND);
    }

    // Delete file from disk if it's local
    if (image.imageUrl.startsWith('/uploads')) {
      const filePath = path.join(process.cwd(), image.imageUrl);
      await this.deleteFile(filePath);
    }

    await this.db.productImage.delete({ where: { id } });

    return {
      success: true,
      message: PRODUCT_IMAGE_MESSAGES.IMAGE_DELETED,
    };
  }

  // ========================================================================
  // DELETE ALL IMAGES FOR PRODUCT
  // ========================================================================
  async deleteByProductId(
    productId: string,
  ): Promise<{ success: boolean; message: string; deletedCount: number }> {
    // Verify product exists
    const product = await this.db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(PRODUCT_IMAGE_MESSAGES.PRODUCT_NOT_FOUND);
    }

    const images = await this.db.productImage.findMany({
      where: { productId },
    });

    // Delete all files from disk
    for (const image of images) {
      if (image.imageUrl.startsWith('/uploads')) {
        const filePath = path.join(process.cwd(), image.imageUrl);
        await this.deleteFile(filePath);
      }
    }

    const result = await this.db.productImage.deleteMany({
      where: { productId },
    });

    return {
      success: true,
      message: PRODUCT_IMAGE_MESSAGES.IMAGES_DELETED,
      deletedCount: result.count,
    };
  }

  // ========================================================================
  // BULK DELETE IMAGES
  // ========================================================================
  async bulkDelete(
    ids: string[],
  ): Promise<{ success: boolean; message: string; deletedCount: number }> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('At least one image ID is required');
    }

    const images = await this.db.productImage.findMany({
      where: { id: { in: ids } },
    });

    if (images.length === 0) {
      throw new NotFoundException('No images found to delete');
    }

    // Delete all files from disk
    for (const image of images) {
      if (image.imageUrl.startsWith('/uploads')) {
        const filePath = path.join(process.cwd(), image.imageUrl);
        await this.deleteFile(filePath);
      }
    }

    const result = await this.db.productImage.deleteMany({
      where: { id: { in: ids } },
    });

    return {
      success: true,
      message: `${result.count} image(s) deleted successfully`,
      deletedCount: result.count,
    };
  }

  // ========================================================================
  // REORDER IMAGES
  // ========================================================================
  async reorderImages(
    productId: string,
    imageIds: string[],
  ): Promise<IProductImage[]> {
    // Check if product exists
    const product = await this.db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(PRODUCT_IMAGE_MESSAGES.PRODUCT_NOT_FOUND);
    }

    // Verify all images belong to this product
    const images = await this.db.productImage.findMany({
      where: { id: { in: imageIds }, productId },
    });

    if (images.length !== imageIds.length) {
      throw new BadRequestException(
        'Some image IDs do not belong to this product',
      );
    }

    // Update positions
    const updatedImages = await Promise.all(
      imageIds.map((id, index) =>
        this.db.productImage.update({
          where: { id },
          data: { position: index },
          include: this.includeProduct,
        }),
      ),
    );

    return updatedImages as IProductImage[];
  }

  // ========================================================================
  // GET STATISTICS
  // ========================================================================
  async getStats(): Promise<{
    totalImages: number;
    productsWithImages: number;
  }> {
    const totalImages = await this.db.productImage.count();

    const productsWithImages = await this.db.product.count({
      where: {
        images: { some: {} },
      },
    });

    return {
      totalImages,
      productsWithImages,
    };
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  /**
   * Get next position for image
   */
  private async getNextPosition(
    productId: string,
    position?: number,
  ): Promise<number> {
    if (position !== undefined && position !== null) {
      return position;
    }

    const lastImage = await this.db.productImage.findFirst({
      where: { productId },
      orderBy: { position: 'desc' },
    });

    return lastImage ? lastImage.position + 1 : 0;
  }

  /**
   * Delete file from disk
   */
  private async deleteFile(filePath: string): Promise<void> {
    try {
      if (fss.existsSync(filePath)) {
        await fs.unlink(filePath);
        console.log('✅ File deleted:', filePath);
      }
    } catch (error) {
      console.error('⚠️ Error deleting file:', filePath);
      // Don't throw, just log
    }
  }
}
