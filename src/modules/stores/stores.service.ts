import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { DatabaseService } from 'src/database/database.service';
import {
  IPaginatedResponse,
  IStore,
  IStoreQuery,
} from 'src/interface/store.interface';
import { Prisma } from '@prisma/client';

@Injectable()
export class StoresService {
  constructor(private readonly db: DatabaseService) {}

  private readonly includeProducts = {
    products: true,
  };

  //==========================================================
  // CREATE STORE
  //==========================================================

  async create(createStoreDto: CreateStoreDto): Promise<IStore> {
    const { userId } = createStoreDto;

    // safety check
    const existingStore = await this.db.store.findUnique({
      where: { userId },
    });

    if (existingStore) {
      throw new BadRequestException('You already created a store');
    }

    try {
      return await this.db.store.create({
        data: createStoreDto,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('You already created a store');
      }

      // log real error
      console.error(error);

      throw error; // let Nest handle others
    }
  }

  //====================================================
  // FIND ALL
  //===================================================

  async findAll(query: IStoreQuery): Promise<IPaginatedResponse<IStore>> {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as any } },
        { description: { contains: search, mode: 'insensitive' as any } },
        { city: { contains: search, mode: 'insensitive' as any } },
        { state: { contains: search, mode: 'insensitive' as any } },
      ];
    }

    const [stores, total] = await Promise.all([
      this.db.store.findMany({
        where,
        skip,
        take: limit,
        include: {
          products: { take: 5 },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.store.count({ where }),
    ]);
    return {
      data: stores as IStore[],
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  //===============================================
  // findOne
  // http://localhost:3000/api/stores/a22bb0f6-ab3a-4a3f-99e2-594600d0b736
  //==============================================

  async findOne(id: string): Promise<IStore> {
    const store = await this.db.store.findUnique({
      where: { id },
      include: {
        products: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }
    return store as IStore;
  }

  async findByUserId(
    userId: number,
    query: IStoreQuery,
  ): Promise<IPaginatedResponse<IStore>> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;
    const user = await this.db.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const [stores, total] = await Promise.all([
      this.db.store.findMany({
        where: { userId },
        skip,
        take: limit,
        include: {
          products: { take: 5 },
        },
      }),

      this.db.store.count({ where: { userId } }),
    ]);
    return {
      data: stores as IStore[],
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }



  //==========================================================
  //
  //==========================================================

  async update(id: string, updateStoreDto: UpdateStoreDto): Promise<IStore> {
    const existingStore = await this.db.store.findUnique({
      where: { id },
    });

    if (!existingStore) {
      throw new NotFoundException(`Store with ID ${id} not found`);
    }

    const update = await this.db.store.update({
      where: { id },
      data: updateStoreDto,
      include: this.includeProducts,
    });
    return update as IStore;
  }
  //========================================================
  // Remove store
  //========================================================

  async remove(id: string): Promise<{ message: string }> {
    const store = await this.db.store.findUnique({
      where: { id },
    });
    if (!store) throw new NotFoundException(`Store with ID ${id} not found`);

    await this.db.store.delete({
      where: {
        id,
      },
    });
    return { message: `Store deleted successfully` };
  }

  async search(
    query: string,
    pagination: IStoreQuery,
  ): Promise<IPaginatedResponse<IStore>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    if (!query || query.trim().length === 0)
      throw new BadRequestException('Search query cannot empty');

    const searchFields: any = {
      OR: [
        { name: { contains: query, mode: 'insensitive' as any } },
        { description: { contains: query, mode: 'insensitive' as any } },
        { address: { contains: query, mode: 'insensitive' as any } },
        { city: { contains: query, mode: 'insensitive' as any } },
        { state: { contains: query, mode: 'insensitive' as any } },
      ],
    };

    const [stores, total] = await Promise.all([
      this.db.store.findMany({
        where: searchFields,
        skip,
        take: limit,
        include: {
          products: { take: 3 },
        },
      }),
      this.db.store.count({ where: searchFields }),
    ]);
    return {
      data: stores as IStore[],
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  //=================================================================
  //
  //=================================================================

  async getState(): Promise<{
    totalStores: number;
    storeWithProducts: number;
    totalProducts: number;
  }> {
    const [total, withProducts, totalProducts] = await Promise.all([
      this.db.store.count(),
      this.db.store.count({
        where: {
          products: {
            some: {},
          },
        },
      }),
      this.db.product.count(),
    ]);

    return {
      totalStores: total,
      storeWithProducts: withProducts,
      totalProducts: totalProducts,
    };
  }

  //======================================================================
  //
  //======================================================================

  async bulkDelete(
    ids: string[],
  ): Promise<{ message: string; deletedCount: number }> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('At least one store ID is required');
    }
    const result = await this.db.store.deleteMany({
      where: { id: { in: ids } },
    });
    if (result.count === 0) {
      throw new NotFoundException('Not store found to deleted');
    }
    return {
      message: `${result.count} store(s) deleted successfully`,
      deletedCount: result.count,
    };
  }
}
