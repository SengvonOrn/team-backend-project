import { IsNotEmpty, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class StoreImageDto {
  @IsNotEmpty()
  @IsString()
  imageUrl: string;

  @IsNotEmpty()
  @IsString()
  imageType: 'LOGO' | 'BANNER' | 'GALLERY';

  @IsOptional()
  @IsString()
  cloudinaryPublicId?: string;
}

export class CreateStoreDto {
  @IsOptional()
  userId?: number;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  // NEW: Support multiple images
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoreImageDto)
  images?: StoreImageDto[];
}
