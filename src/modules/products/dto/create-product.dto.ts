import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export enum ProductStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}



export class CreateProductDto {
  @IsString()
  @MinLength(2, { message: 'Product name must be at least 2 characters' })
  @MaxLength(200, { message: 'Product name must be less than 200 characters' })
  name: string;

  @IsString()
  @MinLength(10, { message: 'Description must be at least 10 characters' })
  @MaxLength(5000, { message: 'Description must be less than 5000 characters' })
  description: string;

  @IsString()
  @MinLength(1, { message: 'Category is required' })
  @MaxLength(100)
  category: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsString()
  @MinLength(1, { message: 'Slug is required' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase with hyphens only',
  })
  slug: string;

  @IsString()
  @MinLength(1, { message: 'Store ID is required' })
  storeId: string;

  @IsOptional()
  @IsEnum(ProductStatus, { message: 'Invalid status' })
  status?: ProductStatus = ProductStatus.ACTIVE;
}

// ============================================
// 3. MIGRATION COMMAND
// ============================================

// Run this in your terminal after updating schema.prisma:
// npx prisma migrate dev --name add_price_to_product

// ============================================
// 4. NOW USE THIS IN POSTMAN
// ============================================

/*
POST http://localhost:3000/api/products

{
  "storeId": "e21fd97e-9af1-4352-892c-3f7b47f76e66",
  "name": "Premium Wireless Headphones",
  "description": "High-quality wireless headphones with noise cancellation",
  "brand": "AudioTech",
  "category": "Electronics",
  "slug": "premium-wireless-headphones",
  "price": 299.99,
  "compareAtPrice": 399.99,
  "status": "ACTIVE"
}
*/
