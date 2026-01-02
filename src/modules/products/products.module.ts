import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [ProductsService],
  controllers: [ProductsController],
  exports: [ProductsService]
})
export class ProductsModule {}
