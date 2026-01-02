import { Module } from '@nestjs/common';
import { ProductAttributesService } from './product-attribute.service';
import { ProductAttributesController } from './product-attribute.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ProductAttributesController],
  providers: [ProductAttributesService],
  exports: [ProductAttributesService],
})
export class ProductAttributesModule {}
