import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { DatabaseService } from 'src/database/database.service';
import { IComment, IPaginatedResponse, ICommentQuery } from '../../interface/comment.interface';
import { COMMENT_MESSAGES } from '../../constants/comment.constants';

@Injectable()
export class CommentsService {
  // ========================================================================
  // CONFIGURATION
  // ========================================================================
  private readonly includeRelations = {
    user: true,
    product: true,
  };

  // ========================================================================
  // CONSTRUCTOR
  // ========================================================================
  constructor(private readonly db: DatabaseService) {}

  // ========================================================================
  // CREATE COMMENT
  // ========================================================================
  async create(createCommentDto: CreateCommentDto): Promise<IComment> {
    const { userId, productId } = createCommentDto;

    // Verify user exists
    const user = await this.db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(COMMENT_MESSAGES.USER_NOT_FOUND);
    }

    // Verify product exists
    const product = await this.db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(COMMENT_MESSAGES.PRODUCT_NOT_FOUND);
    }

    const comment = await this.db.comment.create({
      data: {
        ...createCommentDto,
        rating: createCommentDto.rating || 0,
      },
      include: this.includeRelations,
    });

    return comment as IComment;
  }

  // ========================================================================
  // GET ALL COMMENTS (WITH PAGINATION & FILTERS)
  // ========================================================================
  async findAll(query: ICommentQuery): Promise<IPaginatedResponse<IComment>> {
    const { page, limit, productId, userId, minRating, maxRating } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (productId) {
      where.productId = productId;
    }

    if (userId) {
      where.userId = userId;
    }

    if (minRating !== undefined || maxRating !== undefined) {
      where.rating = {};
      if (minRating !== undefined) {
        where.rating.gte = minRating;
      }
      if (maxRating !== undefined) {
        where.rating.lte = maxRating;
      }
    }

    const [comments, total] = await Promise.all([
      this.db.comment.findMany({
        where,
        skip,
        take: limit,
        include: this.includeRelations,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.comment.count({ where }),
    ]);

    return {
      data: comments as IComment[],
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ========================================================================
  // GET SINGLE COMMENT
  // ========================================================================
  async findOne(id: string): Promise<IComment> {
    const comment = await this.db.comment.findUnique({
      where: { id },
      include: this.includeRelations,
    });

    if (!comment) {
      throw new NotFoundException(COMMENT_MESSAGES.NOT_FOUND);
    }

    return comment as IComment;
  }

  // ========================================================================
  // GET COMMENTS BY PRODUCT
  // ========================================================================
  async findByProductId(
    productId: string,
    query: ICommentQuery,
  ): Promise<IPaginatedResponse<IComment>> {
    const { page, limit, minRating, maxRating } = query;
    const skip = (page - 1) * limit;

    // Verify product exists
    const product = await this.db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(COMMENT_MESSAGES.PRODUCT_NOT_FOUND);
    }

    const where: any = { productId };

    if (minRating !== undefined || maxRating !== undefined) {
      where.rating = {};
      if (minRating !== undefined) {
        where.rating.gte = minRating;
      }
      if (maxRating !== undefined) {
        where.rating.lte = maxRating;
      }
    }

    const [comments, total] = await Promise.all([
      this.db.comment.findMany({
        where,
        skip,
        take: limit,
        include: this.includeRelations,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.comment.count({ where }),
    ]);

    return {
      data: comments as IComment[],
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ========================================================================
  // GET COMMENTS BY USER
  // ========================================================================
  async findByUserId(
    userId: number,
    query: ICommentQuery,
  ): Promise<IPaginatedResponse<IComment>> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    // Verify user exists
    const user = await this.db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(COMMENT_MESSAGES.USER_NOT_FOUND);
    }

    const [comments, total] = await Promise.all([
      this.db.comment.findMany({
        where: { userId },
        skip,
        take: limit,
        include: this.includeRelations,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.comment.count({ where: { userId } }),
    ]);

    return {
      data: comments as IComment[],
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ========================================================================
  // GET COMMENTS BY RATING
  // ========================================================================
  async findByRating(
    minRating: number,
    maxRating: number,
    query: ICommentQuery,
  ): Promise<IPaginatedResponse<IComment>> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    if (minRating < 0 || maxRating > 5 || minRating > maxRating) {
      throw new BadRequestException('Invalid rating range. Must be 0-5 and minRating <= maxRating');
    }

    const where = {
      rating: {
        gte: minRating,
        lte: maxRating,
      },
    };

    const [comments, total] = await Promise.all([
      this.db.comment.findMany({
        where,
        skip,
        take: limit,
        include: this.includeRelations,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.comment.count({ where }),
    ]);

    return {
      data: comments as IComment[],
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ========================================================================
  // UPDATE COMMENT
  // ========================================================================
  async update(
    id: string,
    updateCommentDto: UpdateCommentDto,
  ): Promise<IComment> {
    const comment = await this.db.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException(COMMENT_MESSAGES.NOT_FOUND);
    }

    // If userId or productId is being updated, verify they exist
    if (updateCommentDto.userId && updateCommentDto.userId !== comment.userId) {
      const user = await this.db.user.findUnique({
        where: { id: updateCommentDto.userId },
      });

      if (!user) {
        throw new NotFoundException(COMMENT_MESSAGES.USER_NOT_FOUND);
      }
    }

    if (updateCommentDto.productId && updateCommentDto.productId !== comment.productId) {
      const product = await this.db.product.findUnique({
        where: { id: updateCommentDto.productId },
      });

      if (!product) {
        throw new NotFoundException(COMMENT_MESSAGES.PRODUCT_NOT_FOUND);
      }
    }

    const updated = await this.db.comment.update({
      where: { id },
      data: updateCommentDto,
      include: this.includeRelations,
    });

    return updated as IComment;
  }

  // ========================================================================
  // DELETE SINGLE COMMENT
  // ========================================================================
  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const comment = await this.db.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException(COMMENT_MESSAGES.NOT_FOUND);
    }

    await this.db.comment.delete({ where: { id } });

    return {
      success: true,
      message: COMMENT_MESSAGES.DELETED,
    };
  }

  // ========================================================================
  // DELETE ALL COMMENTS FOR PRODUCT
  // ========================================================================
  async deleteByProductId(
    productId: string,
  ): Promise<{ success: boolean; message: string; deletedCount: number }> {
    const product = await this.db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(COMMENT_MESSAGES.PRODUCT_NOT_FOUND);
    }

    const result = await this.db.comment.deleteMany({
      where: { productId },
    });

    return {
      success: true,
      message: COMMENT_MESSAGES.DELETED_MULTIPLE,
      deletedCount: result.count,
    };
  }

  // ========================================================================
  // DELETE ALL COMMENTS BY USER
  // ========================================================================
  async deleteByUserId(
    userId: number,
  ): Promise<{ success: boolean; message: string; deletedCount: number }> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(COMMENT_MESSAGES.USER_NOT_FOUND);
    }

    const result = await this.db.comment.deleteMany({
      where: { userId },
    });

    return {
      success: true,
      message: COMMENT_MESSAGES.DELETED_MULTIPLE,
      deletedCount: result.count,
    };
  }

  // ========================================================================
  // BULK DELETE COMMENTS
  // ========================================================================
  async bulkDelete(
    ids: string[],
  ): Promise<{ success: boolean; message: string; deletedCount: number }> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException(COMMENT_MESSAGES.NO_COMMENTS);
    }

    const result = await this.db.comment.deleteMany({
      where: { id: { in: ids } },
    });

    if (result.count === 0) {
      throw new NotFoundException(COMMENT_MESSAGES.NOT_FOUND);
    }

    return {
      success: true,
      message: COMMENT_MESSAGES.DELETED_MULTIPLE,
      deletedCount: result.count,
    };
  }

  // ========================================================================
  // SEARCH COMMENTS
  // ========================================================================
  async search(
    query: string,
    pagination: ICommentQuery,
  ): Promise<IPaginatedResponse<IComment>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Search query cannot be empty');
    }

    const [comments, total] = await Promise.all([
      this.db.comment.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' as any } },
            { comment: { contains: query, mode: 'insensitive' as any } },
          ],
        },
        skip,
        take: limit,
        include: this.includeRelations,
      }),
      this.db.comment.count({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' as any } },
            { comment: { contains: query, mode: 'insensitive' as any } },
          ],
        },
      }),
    ]);

    return {
      data: comments as IComment[],
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
    totalComments: number;
    averageRating: number;
    productsWithComments: number;
    usersWithComments: number;
    commentsByRating: { rating: number; count: number }[];
  }> {
    const totalComments = await this.db.comment.count();

    const productsWithComments = await this.db.product.count({
      where: {
        comments: { some: {} },
      },
    });

    const usersWithComments = await this.db.user.count({
      where: {
        comments: { some: {} },
      },
    });

    // Calculate average rating
    const result = await this.db.comment.aggregate({
      _avg: { rating: true },
    });

    const averageRating = result._avg.rating || 0;

    // Get comments by rating
    const commentsByRating = await Promise.all(
      [0, 1, 2, 3, 4, 5].map(async (rating) => ({
        rating,
        count: await this.db.comment.count({
          where: { rating },
        }),
      })),
    );

    return {
      totalComments,
      averageRating: Math.round(averageRating * 10) / 10,
      productsWithComments,
      usersWithComments,
      commentsByRating,
    };
  }
}
