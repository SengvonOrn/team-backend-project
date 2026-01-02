import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductAttributeDto } from './dto/create-product-attribute.dto';
import { UpdateProductAttributeDto } from './dto/update-product-attribute.dto';
import { DatabaseService } from 'src/database/database.service';
import {
  IProductAttribute,
  IPaginatedResponse,
  IProductAttributeQuery,
} from '../../interface/product-attribute.interface';
import { PRODUCT_ATTRIBUTE_MESSAGES } from '../../constants/product-attribute.constants';

@Injectable()
export class ProductAttributesService {
  // ========================================================================
  // CONFIGURATION
  // ========================================================================
  private readonly includeProduct = {
    product: true,
  };

  // ========================================================================
  // CONSTRUCTOR
  // ========================================================================
  constructor(private readonly db: DatabaseService) {}

  // ========================================================================
  // CREATE ATTRIBUTE
  // ========================================================================
  async create(
    createProductAttributeDto: CreateProductAttributeDto,
  ): Promise<IProductAttribute> {
    const { productId } = createProductAttributeDto;

    // Verify product exists
    const product = await this.db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(PRODUCT_ATTRIBUTE_MESSAGES.PRODUCT_NOT_FOUND);
    }

    const attribute = await this.db.productAttribute.create({
      data: createProductAttributeDto,
      include: this.includeProduct,
    });

    return attribute as IProductAttribute;
  }

  // ========================================================================
  // GET ALL ATTRIBUTES (WITH PAGINATION & FILTERS)
  // ========================================================================
  async findAll(
    query: IProductAttributeQuery,
  ): Promise<IPaginatedResponse<IProductAttribute>> {
    const { page, limit, productId, attributeName } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (productId) {
      where.productId = productId;
    }

    if (attributeName) {
      where.attributeName = {
        contains: attributeName,
        mode: 'insensitive' as any,
      };
    }

    const [attributes, total] = await Promise.all([
      this.db.productAttribute.findMany({
        where,
        skip,
        take: limit,
        include: this.includeProduct,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.productAttribute.count({ where }),
    ]);

    return {
      data: attributes as IProductAttribute[],
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ========================================================================
  // GET SINGLE ATTRIBUTE
  // ========================================================================
  async findOne(id: string): Promise<IProductAttribute> {
    const attribute = await this.db.productAttribute.findUnique({
      where: { id },
      include: this.includeProduct,
    });

    if (!attribute) {
      throw new NotFoundException(PRODUCT_ATTRIBUTE_MESSAGES.NOT_FOUND);
    }

    return attribute as IProductAttribute;
  }

  // ========================================================================
  // GET ATTRIBUTES BY PRODUCT
  // ========================================================================
  async findByProductId(
    productId: string,
    query: IProductAttributeQuery,
  ): Promise<IPaginatedResponse<IProductAttribute>> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    // Verify product exists
    const product = await this.db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(PRODUCT_ATTRIBUTE_MESSAGES.PRODUCT_NOT_FOUND);
    }

    const [attributes, total] = await Promise.all([
      this.db.productAttribute.findMany({
        where: { productId },
        skip,
        take: limit,
        include: this.includeProduct,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.productAttribute.count({ where: { productId } }),
    ]);

    return {
      data: attributes as IProductAttribute[],
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ========================================================================
  // GET ALL ATTRIBUTES FOR PRODUCT (NO PAGINATION)
  // ========================================================================
  async getAttributesByProductId(
    productId: string,
  ): Promise<IProductAttribute[]> {
    const product = await this.db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(PRODUCT_ATTRIBUTE_MESSAGES.PRODUCT_NOT_FOUND);
    }

    return this.db.productAttribute.findMany({
      where: { productId },
      include: this.includeProduct,
      orderBy: { createdAt: 'asc' },
    }) as Promise<IProductAttribute[]>;
  }

  // ========================================================================
  // UPDATE ATTRIBUTE
  // ========================================================================
  async update(
    id: string,
    updateProductAttributeDto: UpdateProductAttributeDto,
  ): Promise<IProductAttribute> {
    const attribute = await this.db.productAttribute.findUnique({
      where: { id },
    });

    if (!attribute) {
      throw new NotFoundException(PRODUCT_ATTRIBUTE_MESSAGES.NOT_FOUND);
    }

    // Verify product exists if productId is being updated
    if (
      updateProductAttributeDto.productId &&
      updateProductAttributeDto.productId !== attribute.productId
    ) {
      const product = await this.db.product.findUnique({
        where: { id: updateProductAttributeDto.productId },
      });

      if (!product) {
        throw new NotFoundException(
          PRODUCT_ATTRIBUTE_MESSAGES.PRODUCT_NOT_FOUND,
        );
      }
    }

    const updated = await this.db.productAttribute.update({
      where: { id },
      data: updateProductAttributeDto,
      include: this.includeProduct,
    });
    return updated as IProductAttribute;
  }

  // ========================================================================
  // DELETE SINGLE ATTRIBUTE
  // ========================================================================
  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const attribute = await this.db.productAttribute.findUnique({
      where: { id },
    });

    if (!attribute) {
      throw new NotFoundException(PRODUCT_ATTRIBUTE_MESSAGES.NOT_FOUND);
    }

    await this.db.productAttribute.delete({ where: { id } });

    return {
      success: true,
      message: PRODUCT_ATTRIBUTE_MESSAGES.DELETED,
    };
  }

  // ========================================================================
  // DELETE ALL ATTRIBUTES FOR PRODUCT
  // ========================================================================
  async deleteByProductId(
    productId: string,
  ): Promise<{ success: boolean; message: string; deletedCount: number }> {
    const product = await this.db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(PRODUCT_ATTRIBUTE_MESSAGES.PRODUCT_NOT_FOUND);
    }

    const result = await this.db.productAttribute.deleteMany({
      where: { productId },
    });

    return {
      success: true,
      message: PRODUCT_ATTRIBUTE_MESSAGES.DELETED_MULTIPLE,
      deletedCount: result.count,
    };
  }

  // ========================================================================
  // BULK DELETE ATTRIBUTES
  // ========================================================================
  async bulkDelete(
    ids: string[],
  ): Promise<{ success: boolean; message: string; deletedCount: number }> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException(PRODUCT_ATTRIBUTE_MESSAGES.NO_ATTRIBUTES);
    }

    const result = await this.db.productAttribute.deleteMany({
      where: { id: { in: ids } },
    });

    if (result.count === 0) {
      throw new NotFoundException(PRODUCT_ATTRIBUTE_MESSAGES.NOT_FOUND);
    }

    return {
      success: true,
      message: PRODUCT_ATTRIBUTE_MESSAGES.DELETED_MULTIPLE,
      deletedCount: result.count,
    };
  }

  // ========================================================================
  // SEARCH ATTRIBUTES
  // ========================================================================
  async search(
    query: string,
    pagination: IProductAttributeQuery,
  ): Promise<IPaginatedResponse<IProductAttribute>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Search query cannot be empty');
    }

    const [attributes, total] = await Promise.all([
      this.db.productAttribute.findMany({
        where: {
          OR: [
            { attributeName: { contains: query, mode: 'insensitive' as any } },
            { attributeValue: { contains: query, mode: 'insensitive' as any } },
          ],
        },
        skip,
        take: limit,
        include: this.includeProduct,
      }),
      this.db.productAttribute.count({
        where: {
          OR: [
            { attributeName: { contains: query, mode: 'insensitive' as any } },
            { attributeValue: { contains: query, mode: 'insensitive' as any } },
          ],
        },
      }),
    ]);

    return {
      data: attributes as IProductAttribute[],
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ========================================================================
  // GET STATISTICS
  // ========================================================================
  async getStats(): Promise<{
    totalAttributes: number;
    productsWithAttributes: number;
    uniqueAttributeNames: number;
  }> {
    const totalAttributes = await this.db.productAttribute.count();

    const productsWithAttributes = await this.db.product.count({
      where: {
        attributes: { some: {} },
      },
    });

    // Count unique attribute names
    const attributes = await this.db.productAttribute.findMany({
      select: { attributeName: true },
      distinct: ['attributeName'],
    });

    return {
      totalAttributes,
      productsWithAttributes,
      uniqueAttributeNames: attributes.length,
    };
  }
}
