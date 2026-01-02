import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  //=============================================================
  // POST http://localhost:3000/api/customers
  //=============================================================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  // =========================================================
  // http://localhost:3000/api/customers
  // GET /customers?page=1&limit=10&search=john&status=ACTIVE
  // http://localhost:3000/api/customers?page=1&limit=10&search=john&status=ACTIVE
  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.customersService.findAll({
      page: Number(page),
      limit: Number(limit),
      search,
      status,
    });
  }

  //==================================================
  // GET /customers/search?q=john&page=1&limit=10
  //==================================================
  @Get('search')
  search(
    @Query('q') searchQuery: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.customersService.search(searchQuery, {
      page: Number(page),
      limit: Number(limit),
    });
  }

  //==============================================
  // http://localhost:3000/api/customers/stats
  //=============================================

  // GET /customers/stats
  @Get('stats')
  getStats() {
    return this.customersService.getStats();
  }

  //=============================================
  // http://localhost:3000/api/customers/status/ACTIVE?page=1&limit=10
  //=============================================
  // GET /customers/status/ACTIVE?page=1&limit=10
  @Get('status/:status')
  findByStatus(
    @Param('status') status: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.customersService.findByStatus(status, {
      page: Number(page),
      limit: Number(limit),
    });
  }
  //======================================================
  // http://localhost:3000/api/customers/user/1
  //=====================================================

  @Get('user/:userId')
  findByUserId(@Param('userId') userId: string) {
    return this.customersService.findByUserId(Number(userId));
  }

  //====================================================
  //
  //===================================================
  @Get('email/:email')
  findByEmail(@Param('email') email: string) {
    return this.customersService.findByEmail(email);
  }

  //==========================================
  //
  //==========================================

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  //=====================================
  //
  //=====================================

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, updateCustomerDto);
  }

  //================================
  //
  //================================

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }

  //==================================
  // customers/bulk-delete
  //==================================

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  bulkDelete(@Body('ids') ids: string[]) {
    return this.customersService.bulkDelete(ids);
  }
}
