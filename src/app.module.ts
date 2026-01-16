import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { StoresModule } from './modules/stores/stores.module';
import { OrdersModule } from './modules/orders/orders.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { LocationsController } from './modules/locations/locations.controller';
import { LocationsService } from './modules/locations/locations.service';
import { LocationsModule } from './modules/locations/locations.module';
import { UrlimageModule } from './modules/urlimage/urlimage.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ProductImagesModule } from './modules/product-images/product-images.module';
import { ProductAttributesModule } from './modules/product-attribute/product-attribute.module';
import { ProductAttributesController } from './modules/product-attribute/product-attribute.controller';
import { ProductAttributesService } from './modules/product-attribute/product-attribute.service';
import { CommentsModule } from './modules/comment/comment.module';
import { CommentsService } from './modules/comment/comment.service';
import { CommentsController } from './modules/comment/comment.controller';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
// import { CloudinaryModule } from './cloudinary/cloudinary.module';

@Module({
  imports: [
    //=================================
    // ServeStaticModule.forRoot({
    //   rootPath: join(__dirname, '..', 'uploads'),
    //   serveRoot: '/uploads',
    // }),

    //================================

    // ServeStaticModule.forRoot({
    //   rootPath: '/usr/src/app/uploads',
    //   serveRoot: '/uploads',
    // }),

    //========================
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    StoresModule,
    OrdersModule,
    CategoriesModule,
    PaymentsModule,
    LocationsModule,
    CustomersModule,
    UrlimageModule,
    ProductImagesModule,
    ProductAttributesModule,
    CommentsModule,
    CloudinaryModule,
  ],
  controllers: [
    AppController,
    LocationsController,
    ProductAttributesController,
    CommentsController,
  ],
  providers: [
    AppService,
    LocationsService,
    ProductAttributesService,
    CommentsService,
  ],
})
export class AppModule {}
