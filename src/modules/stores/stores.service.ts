import {
  BadRequestException,
  Inject,
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
import { CloudinaryService } from 'src/cloudinary/cloudinary.stores.service';

@Injectable()
export class StoresService {
  private readonly includeProducts = {
    products: {
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
      },
    },
  };
  constructor(
    private readonly db: DatabaseService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  //=========================================================
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
        data: {
          name: createStoreDto.name,
          description: createStoreDto.description,
          address: createStoreDto.address,
          city: createStoreDto.city,
          state: createStoreDto.state,
        } as Prisma.StoreUncheckedCreateInput,
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
          images: { take: 2 },
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

  // async updateStore(
  //   id: string,
  //   updateStoreDto: UpdateStoreDto,
  //   files?: { logo?: Express.Multer.File[]; banner?: Express.Multer.File[] },
  // ) {
  //   const existingStore = await this.db.store.findUnique({ where: { id } });
  //   if (!existingStore) throw new NotFoundException(`Store ${id} not found`);

  //   // Update basic fields
  //   const dataUpdate: any = { ...updateStoreDto };
  //   const imageUpdates: {
  //     type: 'LOGO' | 'BANNER';
  //     url: string;
  //     publicId: string;
  //   }[] = [];

  //   // Upload logo to Cloudinary
  //   if (files?.logo?.[0]) {
  //     try {
  //       const result = await cloudinary.uploader.upload(files.logo[0].path, {
  //         folder: 'storeprofile',
  //       });
  //       imageUpdates.push({
  //         type: 'LOGO',
  //         url: result.secure_url,
  //         publicId: result.public_id,
  //       });
  //     } catch (err) {
  //       throw new BadRequestException('Failed to upload logo');
  //     }
  //   }

  //   // Upload banner to Cloudinary
  //   if (files?.banner?.[0]) {
  //     try {
  //       const result = await cloudinary.uploader.upload(files.banner[0].path, {
  //         folder: 'storeprofile',
  //       });
  //       imageUpdates.push({
  //         type: 'BANNER',
  //         url: result.secure_url,
  //         publicId: result.public_id,
  //       });
  //     } catch (err) {
  //       throw new BadRequestException('Failed to upload banner');
  //     }
  //   }
  //   // Update store
  //   const updatedStore = await this.db.store.update({
  //     where: { id },
  //     data: dataUpdate,
  //     include: { products: true, images: true },
  //   });

  //   // Upsert images
  //   for (const img of imageUpdates) {
  //     await this.db.storeImage.upsert({
  //       where: { storeId_imageType: { storeId: id, imageType: img.type } },
  //       update: { imageUrl: img.url, cloudinaryPublicId: img.publicId },
  //       create: {
  //         storeId: id,
  //         imageType: img.type,
  //         imageUrl: img.url,
  //         cloudinaryPublicId: img.publicId,
  //       },
  //     });
  //   }

  //   // Reload store with images
  //   return this.db.store.findUnique({
  //     where: { id },
  //     include: { products: true, images: true },
  //   });
  // }
  // async updateStore(
  //   id: string,
  //   updateStoreDto: any,
  //   files?: { logo?: Express.Multer.File[]; banner?: Express.Multer.File[] },
  // ) {
  //   const existingStore = await this.db.store.findUnique({ where: { id } });
  //   if (!existingStore) throw new NotFoundException(`Store ${id} not found`);
  //   console.log('Files received:', files);
  //   if (files?.logo?.[0]) console.log('Uploading logo...');
  //   if (files?.banner?.[0]) console.log('Uploading banner...');

  //   const dataUpdate = { ...updateStoreDto };
  //   const imageUpdates: {
  //     type: 'LOGO' | 'BANNER';
  //     url: string;
  //     publicId: string;
  //   }[] = [];

  //   // LOGO
  //   if (files?.logo?.[0]) {
  //     try {
  //       const res = await this.uploadBuffer(files.logo[0], 'storeprofile');
  //       imageUpdates.push({
  //         type: 'LOGO',
  //         url: res.secure_url,
  //         publicId: res.public_id,
  //       });
  //     } catch {
  //       throw new BadRequestException('Failed to upload logo');
  //     }
  //   }

  //   // BANNER
  //   if (files?.banner?.[0]) {
  //     try {
  //       const res = await this.uploadBuffer(files.banner[0], 'storeprofile');
  //       imageUpdates.push({
  //         type: 'BANNER',
  //         url: res.secure_url,
  //         publicId: res.public_id,
  //       });
  //     } catch {
  //       throw new BadRequestException('Failed to upload banner');
  //     }
  //   }

  //   await this.db.store.update({
  //     where: { id },
  //     data: dataUpdate,
  //   });

  //   for (const img of imageUpdates) {
  //     await this.db.storeImage.upsert({
  //       where: {
  //         storeId_imageType: { storeId: id, imageType: img.type },
  //       },
  //       update: {
  //         imageUrl: img.url,
  //         cloudinaryPublicId: img.publicId,
  //       },
  //       create: {
  //         storeId: id,
  //         imageType: img.type,
  //         imageUrl: img.url,
  //         cloudinaryPublicId: img.publicId,
  //       },
  //     });
  //   }

  //   return this.db.store.findUnique({
  //     where: { id },
  //     include: { products: true, images: true },
  //   });
  // }

  async updateStore(
    id: string,
    updateStoreDto: UpdateStoreDto,
    files?: { logo?: Express.Multer.File[]; banner?: Express.Multer.File[] },
  ) {
    // 1. Check if store exists
    const store = await this.db.store.findUnique({ where: { id } });
    if (!store) throw new NotFoundException('Store not found');

    const dataUpdate: Prisma.StoreUncheckedUpdateInput = {
      name: updateStoreDto.name,
      description: updateStoreDto.description,
      address: updateStoreDto.address,
      city: updateStoreDto.city,
      state: updateStoreDto.state,
      ...(updateStoreDto.userId && { userId: updateStoreDto.userId }),
    };

    await this.db.store.update({
      where: { id },
      data: dataUpdate,
    });

    // 3. Handle images (logo & banner)
    const imageTypes: {
      file?: Express.Multer.File[];
      type: 'LOGO' | 'BANNER';
    }[] = [
      { file: files?.logo, type: 'LOGO' },
      { file: files?.banner, type: 'BANNER' },
    ];

    for (const imgData of imageTypes) {
      if (imgData.file?.[0]) {
        console.log(`Uploading ${imgData.type.toLowerCase()}...`);

        const result = await this.cloudinary.uploadBuffer(
          imgData.file[0],
          'storeprofile',
        );
        console.log(`${imgData.type} upload result:`, result);

        // Upsert image in StoreImage table
        await this.db.storeImage.upsert({
          where: {
            storeId_imageType: { storeId: id, imageType: imgData.type },
          },
          update: {
            imageUrl: result.secure_url,
            cloudinaryPublicId: result.public_id,
          },
          create: {
            storeId: id,
            imageType: imgData.type,
            imageUrl: result.secure_url,
            cloudinaryPublicId: result.public_id,
          },
        });
      }
    }
    // 4. Return updated store with products & images
    const updatedStore = await this.db.store.findUnique({
      where: { id },
      include: {
        products: true,
        images: true, // Includes both logo and banner
      },
    });
    return updatedStore;
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
