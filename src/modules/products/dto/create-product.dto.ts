import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateProductDto {
  @IsNotEmpty()
  @IsUUID()
  storeId: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  status?: string;
}