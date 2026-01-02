import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { DatabaseService } from 'src/database/database.service';
import {
  ICustomer,
  IPaginatedResponse,
  ICustomerQuery,
} from '../../interface/customer.interface';

@Injectable()
export class CustomersService {
  constructor(private readonly db: DatabaseService) {}

  private readonly includeUser = {
    user: {
      include: { profileImage: true },
    },
    orders: true,
  };

  //=========================================================
  //
  //=========================================================

  async create(createCustomerDto: CreateCustomerDto): Promise<ICustomer> {
    const { userId, email } = createCustomerDto;

    const existingCustomer = await this.db.customer.findFirst({
      where: { userId },
    });

    if (existingCustomer) {
      throw new BadRequestException('Customer already exists for this user');
    }

    const user = await this.db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const customer = await this.db.customer.create({
      data: createCustomerDto,
      include: this.includeUser,
    });

    return customer as ICustomer;
  }

  //=============================================================
  //
  //=============================================================

  async findAll(query: ICustomerQuery): Promise<IPaginatedResponse<ICustomer>> {
    const { page, limit, search, status } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' as any } },
        { username: { contains: search, mode: 'insensitive' as any } },
        { user: { name: { contains: search, mode: 'insensitive' as any } } },
      ];
    }

    if (status) {
      where.user = { status: status as any };
    }

    const [customers, total] = await Promise.all([
      this.db.customer.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: { include: { profileImage: true } },
          orders: { take: 5 },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.customer.count({ where }),
    ]);

    return {
      data: customers as ICustomer[],
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  //============================================================
  //
  //============================================================
  async findOne(id: string): Promise<ICustomer> {
    const customer = await this.db.customer.findUnique({
      where: { id },
      include: {
        user: { include: { profileImage: true } },
        orders: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer as ICustomer;
  }

  //=========================================================
 // http://localhost:3000/api/customers/7493c6db-c4ec-4061-95b7-8a89857d651e
  //=========================================================

  async findByUserId(userId: number): Promise<ICustomer> {
    const customer = await this.db.customer.findFirst({
      where: { userId },
      include: {
        user: { include: { profileImage: true } },
        orders: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer for user ${userId} not found`);
    }

    return customer as ICustomer;
  }

  //======================================================

  //=====================================================

  async findByEmail(email: string): Promise<ICustomer> {
    const customer = await this.db.customer.findFirst({
      where: { email },
      include: {
        user: { include: { profileImage: true } },
        orders: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with email ${email} not found`);
    }

    return customer as ICustomer;
  }

  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
  ): Promise<ICustomer> {
    const existingCustomer = await this.db.customer.findUnique({
      where: { id },
    });

    if (!existingCustomer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    const updated = await this.db.customer.update({
      where: { id },
      data: updateCustomerDto,
      include: this.includeUser,
    });

    return updated as ICustomer;
  }

  async remove(id: string): Promise<{ message: string }> {
    const customer = await this.db.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    await this.db.customer.delete({ where: { id } });

    return { message: 'Customer deleted successfully' };
  }

  async search(
    query: string,
    pagination: ICustomerQuery,
  ): Promise<IPaginatedResponse<ICustomer>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Search query cannot be empty');
    }

    const searchFields: any = {
      OR: [
        { email: { contains: query, mode: 'insensitive' as any } },
        { username: { contains: query, mode: 'insensitive' as any } },
        { phone: { contains: query, mode: 'insensitive' as any } },
        { user: { name: { contains: query, mode: 'insensitive' as any } } },
      ],
    };

    const [customers, total] = await Promise.all([
      this.db.customer.findMany({
        where: searchFields,
        skip,
        take: limit,
        include: {
          user: { include: { profileImage: true } },
          orders: { take: 3 },
        },
      }),
      this.db.customer.count({ where: searchFields }),
    ]);

    return {
      data: customers as ICustomer[],
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findByStatus(
    status: string,
    pagination: ICustomerQuery,
  ): Promise<IPaginatedResponse<ICustomer>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      this.db.customer.findMany({
        where: { user: { status: status as any } },
        skip,
        take: limit,
        include: {
          user: { include: { profileImage: true } },
          orders: { take: 3 },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.customer.count({ where: { user: { status: status as any } } }),
    ]);

    return {
      data: customers as ICustomer[],
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async getStats(): Promise<{
    totalCustomers: number;
    customersWithOrders: number;
    activeCustomers: number;
    bannedCustomers: number;
  }> {
    const [total, withOrders, active, banned] = await Promise.all([
      this.db.customer.count(),
      this.db.customer.count({ where: { orders: { some: {} } } }),
      this.db.customer.count({ where: { user: { status: 'ACTIVE' } } }),
      this.db.customer.count({ where: { user: { status: 'BANNED' } } }),
    ]);

    return {
      totalCustomers: total,
      customersWithOrders: withOrders,
      activeCustomers: active,
      bannedCustomers: banned,
    };
  }

  //=====================================================
  //
  //=====================================================
  async bulkDelete(
    ids: string[],
  ): Promise<{ message: string; deletedCount: number }> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('At least one customer ID is required');
    }

    const result = await this.db.customer.deleteMany({
      where: { id: { in: ids } },
    });

    if (result.count === 0) {
      throw new NotFoundException('No customers found to delete');
    }

    return {
      message: `${result.count} customer(s) deleted successfully`,
      deletedCount: result.count,
    };
  }
}
